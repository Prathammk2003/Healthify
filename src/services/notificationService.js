import twilio from 'twilio';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import MedicationReminder from '../models/MedicationReminder.js';
import nodemailer from 'nodemailer';
import { connectDB } from "../lib/db.js";
import Notification from "../models/Notification.js";
import Appointment from '../models/Appointment.js';

// Initialize Twilio client
let twilioClient;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.warn('⚠️ Twilio credentials not found in environment variables');
  }
} catch (error) {
  console.error('❌ Error initializing Twilio client:', error);
}

// Initialize Nodemailer transporter for email notifications
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Formats a date string for display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date string (e.g., Monday, January 1, 2023)
 */
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Formats a time string for display
 * @param {string} timeStr - Time string in HH:MM format
 * @returns {string} - Formatted time string (e.g., 2:30 PM)
 */
const formatTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const isPM = hour >= 12;
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
};

/**
 * Calculate time until appointment
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM format
 * @returns {string} - Human-readable time until appointment
 */
const getTimeUntilAppointment = (dateStr, timeStr) => {
  const now = new Date();
  const appointmentDate = new Date(`${dateStr}T${timeStr}`);
  const diffMs = appointmentDate - now;
  
  // If the appointment is in the past
  if (diffMs < 0) return 'now';
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }
  
  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};

/**
 * Check if a notification has been recently sent
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {string} params.type - Notification type
 * @param {string} params.referenceId - Reference ID
 * @param {number} params.hours - Hours to look back
 * @returns {Promise<boolean>} - True if a notification was recently sent
 */
const hasRecentNotification = async ({ userId, type, referenceId, hours = 24 }) => {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  
  const existingNotification = await Notification.findOne({
    userId,
    type,
    'metadata.referenceId': referenceId,
    createdAt: { $gte: cutoffTime },
    status: 'sent',
  });
  
  return !!existingNotification;
};

/**
 * Log a notification
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} - Created notification log
 */
const logNotification = async (params) => {
  try {
    await connectDB();
    
    const notification = new Notification({
      userId: params.userId,
      type: params.type,
      messageContent: params.messageContent,
      channel: params.channel || 'sms',
      status: params.status || 'sent',
      referenceId: params.referenceId || null,
      isImportant: params.isImportant || false,
      metadata: params.metadata || {}
    });
    
    await notification.save();
    console.log(`✅ Notification logged: ${params.type} for user ${params.userId}`);
    return notification;
  } catch (error) {
    console.error('❌ Error logging notification:', error);
    throw error;
  }
};

/**
 * Send an SMS using Twilio
 * 
 * @param {Object} options - SMS options
 * @param {string} options.phoneNumber - Recipient's phone number
 * @param {string} options.message - SMS message content
 * @returns {Promise<Object>} - Result of the SMS sending operation
 */
async function sendSMS({ phoneNumber, message }) {
  if (!phoneNumber) {
    console.error('❌ Phone number is required to send SMS');
    return { success: false, error: 'Phone number is required' };
  }

  if (!message) {
    console.error('❌ Message content is required to send SMS');
    return { success: false, error: 'Message content is required' };
  }

  try {
    // Check if SMS is enabled and Twilio is configured
    if (!twilioClient) {
      console.error('❌ Twilio client not initialized');
      return { success: false, error: 'SMS service not available' };
    }

    // Format phone number to E.164 format if not already formatted
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhone = `+${phoneNumber.replace(/\D/g, '')}`;
    }

    // Send the SMS
    console.log(`📱 Sending SMS to ${formattedPhone}`);
    const smsResult = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });

    console.log(`✅ SMS sent successfully (SID: ${smsResult.sid})`);
    return { 
      success: true, 
      sid: smsResult.sid, 
      status: smsResult.status 
    };
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Make a voice call notification
 * @param {Object} params - Call parameters
 * @returns {Promise<Object>} - Result of call
 */
const makeVoiceCall = async ({ phoneNumber, message }) => {
  try {
    // Check if Twilio credentials are configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.error('❌ Missing Twilio configuration - SID, Auth Token, or Phone Number');
      throw new Error('Missing Twilio configuration. Please check your environment variables.');
    }
    
    // Format the phone number if it doesn't start with +
    let formattedPhoneNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      // Add the + prefix if it's missing
      formattedPhoneNumber = `+${phoneNumber.replace(/\D/g, '')}`;
    }
    
    console.log(`📞 Attempting to make a voice call to ${formattedPhoneNumber} using Twilio...`);
    console.log(`📱 Using Twilio phone: ${process.env.TWILIO_PHONE_NUMBER}`);
    
    // Initialize Twilio client here to ensure we have the latest credentials
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Default TwiML URL for a generic medication reminder
    let twimlURL = 'https://handler.twilio.com/twiml/EH8ccdbd7f0b05764809dd5e3d96c7e76f';
    
    // If a custom message is provided, we could use a different TwiML URL or create TwiML on the fly
    // For now, we'll just log the message
    if (message) {
      console.log(`📝 Voice message content: ${message}`);
    }
    
    const call = await client.calls.create({
      url: twimlURL,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhoneNumber,
    });
    
    console.log(`✅ Voice call initiated successfully to ${formattedPhoneNumber} (SID: ${call.sid})`);
    return { success: true, sid: call.sid, status: call.status };
  } catch (error) {
    console.error('❌ Failed to make voice call:', error.message);
    if (error.code) {
      console.error(`❌ Twilio Error Code: ${error.code}`);
    }
    return { 
      success: false, 
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR' 
    };
  }
};

/**
 * Send an email notification
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} - Result of sending
 */
const sendEmail = async ({ email, subject, html, text }) => {
  try {
    if (!process.env.EMAIL_USER) {
      console.error('❌ Missing email configuration');
      throw new Error('Missing email configuration');
    }
    
    const result = await emailTransporter.sendMail({
      from: `"Health App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`📧 Email sent to ${email}:`, subject);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send an appointment reminder
 * @param {Object} appointment - Appointment data
 * @param {Object} userProfile - User profile data
 * @param {string} reminderType - The type of reminder (24-hour, 12-hour, 1-hour)
 * @returns {Promise<Object>} - Result of sending
 */
const sendAppointmentReminder = async (appointment, userProfile, reminderType = "") => {
  try {
    // Check if we've already sent a notification for this appointment recently
    const recentNotification = await hasRecentNotification({
      userId: appointment.userId,
      type: 'appointment',
      referenceId: appointment._id,
      hours: 3, // Don't send reminders more than once every 3 hours
    });
    
    if (recentNotification) {
      console.log(`⏭️ Skipping duplicate appointment reminder for user ${appointment.userId}`);
      return { success: true, skipped: true };
    }
    
    // Get doctor information for a more personalized message
    let doctorName = 'your doctor';
    if (appointment.doctor) {
      try {
        const doctorDoc = await Doctor.findById(appointment.doctor).populate('userId', 'name');
        if (doctorDoc && doctorDoc.userId) {
          // Handle both string name and object user with name property
          const name = typeof doctorDoc.userId === 'object' 
            ? (doctorDoc.userId.name || 'your doctor') 
            : doctorDoc.userId;
          doctorName = `Dr. ${name}`;
        }
      } catch (err) {
        console.error('Error fetching doctor details:', err);
      }
    }
    
    const timeUntil = getTimeUntilAppointment(appointment.date, appointment.time);
    const formattedDate = formatDate(appointment.date);
    const formattedTime = formatTime(appointment.time);
    
    // Create reminder message based on type
    let reminderMessage = "";
    
    if (reminderType === "24-hour") {
      reminderMessage = `REMINDER: You have an appointment with ${doctorName} tomorrow at ${formattedTime}. Date: ${formattedDate}. Please arrive 15 minutes early.`;
    } else if (reminderType === "12-hour") {
      reminderMessage = `REMINDER: You have an appointment with ${doctorName} today at ${formattedTime} (in about 12 hours). Date: ${formattedDate}. Please arrive 15 minutes early.`;
    } else if (reminderType === "1-hour") {
      reminderMessage = `URGENT REMINDER: Your appointment with ${doctorName} is in 1 hour at ${formattedTime} today. Date: ${formattedDate}. Please arrive now if you haven't left yet.`;
    } else {
      // Default message if no specific type provided
      reminderMessage = `Reminder: You have an appointment with ${doctorName} ${timeUntil} on ${formattedDate} at ${formattedTime}. Please arrive 15 minutes early.`;
    }
    
    // Send SMS if phone number is available
    let smsResult = { success: false, skipped: true };
    if (userProfile.contactNumber) {
      smsResult = await sendSMS({
        phoneNumber: userProfile.contactNumber,
        message: reminderMessage,
      });
    }
    
    // Format Email
    let emailSubject = `Appointment Reminder: ${formattedDate}`;
    if (reminderType === "1-hour") {
      emailSubject = `URGENT: Appointment in 1 Hour - ${formattedDate}`;
    }
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #3b82f6;">Appointment Reminder</h2>
        <p>Hello ${userProfile.firstName || 'there'},</p>
        ${reminderType === "24-hour" ? 
          `<p>This is a reminder that you have an appointment with <strong>${doctorName}</strong> tomorrow:</p>` : 
          reminderType === "12-hour" ? 
          `<p>This is a reminder that you have an appointment with <strong>${doctorName}</strong> in about 12 hours:</p>` :
          reminderType === "1-hour" ? 
          `<p><strong>URGENT REMINDER:</strong> Your appointment with <strong>${doctorName}</strong> is in 1 hour:</p>` :
          `<p>This is a friendly reminder that you have an appointment with <strong>${doctorName}</strong> on:</p>`
        }
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
        </div>
        ${reminderType === "1-hour" ?
          `<p style="color: #dc2626; font-weight: bold;">Please make sure you're on your way to the appointment!</p>` :
          `<p>Please arrive at least 15 minutes before your appointment time.</p>`
        }
        <p style="margin-top: 20px;">Thank you for choosing our healthcare service!</p>
      </div>
    `;
    
    // Get user email from User model
    let emailResult = { success: false, skipped: true };
    try {
      const user = await User.findById(appointment.userId);
      if (user && user.email) {
        emailResult = await sendEmail({
          email: user.email,
          subject: emailSubject,
          html: emailHtml,
          text: reminderMessage,
        });
      }
    } catch (err) {
      console.error('Error sending appointment email reminder:', err);
    }
    
    // Update the appointment's lastReminderSent timestamp
    await Appointment.findByIdAndUpdate(appointment._id, {
      lastReminderSent: new Date()
    });
    
    // Log the notification
    await logNotification({
      userId: appointment.userId,
      type: 'appointment',
      referenceId: appointment._id,
      channel: smsResult.success ? 'sms' : (emailResult.success ? 'email' : 'failed'),
      status: (smsResult.success || emailResult.success) ? 'sent' : 'failed',
      messageContent: reminderMessage,
      metadata: {
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        doctorName,
        reminderType,
        smsResult,
        emailResult,
      },
    });
    
    return {
      success: smsResult.success || emailResult.success,
      sms: smsResult,
      email: emailResult,
    };
  } catch (error) {
    console.error('❌ Error sending appointment reminder:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a medication reminder notification
 * 
 * @param {Object} reminder - Medication reminder object
 * @param {Object} userProfile - User profile object containing contactNumber
 * @returns {Promise<Object>} - Result of the notification attempt
 */
async function sendMedicationReminder(reminder, userProfile) {
  try {
    if (!reminder || !userProfile) {
      console.error('Missing reminder or user profile for medication reminder');
      return { success: false, error: 'Missing data' };
    }

    const phoneNumber = userProfile.contactNumber;
    if (!phoneNumber) {
      console.error(`No contact number found for user ${reminder.userId}`);
      return { success: false, error: 'No contact number' };
    }

    // Create message
    const message = `Reminder: It's time to take your ${reminder.medicationName} (${reminder.dosage}). Stay healthy!`;
    
    // Send SMS
    const smsResult = await sendSMS({
      phoneNumber: phoneNumber,
      message: message
    });
    
    // Check if voice call is enabled and should be made
    let callResult = { success: false, skipped: true };
    if (reminder.enableVoiceCall || userProfile.voiceCallEnabled) {
      console.log(`Voice call enabled for user ${reminder.userId}, making call...`);
      
      try {
        // Initialize Twilio client if needed
        if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
          twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        }
        
        if (twilioClient) {
          // TwiML for voice call
          const twimlURL = 'https://handler.twilio.com/twiml/EH8ccdbd7f0b05764809dd5e3d96c7e76f';
          
          const call = await twilioClient.calls.create({
            url: twimlURL,
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
          });
          
          callResult = { 
            success: true, 
            sid: call.sid, 
            status: call.status 
          };
          
          console.log(`Voice call initiated for medication reminder to ${phoneNumber}`);
        } else {
          console.error('Twilio client not available for voice call');
          callResult = { success: false, error: 'Twilio client not available' };
        }
      } catch (callError) {
        console.error('Error making voice call:', callError);
        callResult = { success: false, error: callError.message };
      }
    }
    
    // Log this notification
    await logNotification({
      userId: reminder.userId,
      type: 'medication',
      messageContent: message,
      channel: 'sms',
      metadata: {
        medicationId: reminder._id,
        medicationName: reminder.medicationName,
        dosage: reminder.dosage,
        time: reminder.time,
        voiceCall: callResult.success
      }
    });
    
    return { 
      success: smsResult.success || callResult.success,
      sms: smsResult,
      call: callResult
    };
  } catch (error) {
    console.error('Error sending medication reminder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a health tip notification
 * @param {Object} user - User data
 * @param {Object} userProfile - User profile data
 * @returns {Promise<Object>} - Result of sending
 */
const sendHealthTip = async (user, userProfile) => {
  try {
    // Get a random health tip
    const healthTips = [
      "Drink at least 8 glasses of water daily to stay hydrated.",
      "Regular exercise helps improve your mood and energy levels.",
      "Get 7-8 hours of sleep to maintain good health.",
      "Eating fruits and vegetables daily boosts your immune system.",
      "Taking short breaks from screen time helps reduce eye strain.",
      "Practicing mindfulness for just 10 minutes a day can reduce stress.",
      "Regular check-ups can help detect health issues early.",
      "A balanced diet includes proteins, carbohydrates, and healthy fats.",
      "Walking 30 minutes a day has significant health benefits.",
      "Limiting processed foods helps maintain a healthy weight.",
    ];
    
    const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
    
    // Check if we've already sent a health tip to this user recently
    const recentNotification = await hasRecentNotification({
      userId: user._id,
      type: 'healthTip',
      referenceId: user._id,
      hours: 24, // Don't send more than once a day
    });
    
    if (recentNotification) {
      console.log(`⏭️ Skipping health tip for user ${user._id} - already sent today`);
      return { success: true, skipped: true };
    }
    
    // Format SMS message
    const smsMessage = `Health Tip: ${randomTip}`;
    
    // Send SMS if phone number is available
    let smsResult = { success: false, skipped: true };
    if (userProfile.contactNumber) {
      smsResult = await sendSMS({
        phoneNumber: userProfile.contactNumber,
        message: smsMessage,
      });
    }
    
    // Format Email
    const emailSubject = `Your Daily Health Tip`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #3b82f6;">Daily Health Tip</h2>
        <p>Hello ${userProfile.firstName || 'there'},</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Tip of the Day:</strong> ${randomTip}</p>
        </div>
        <p>Small changes can lead to big improvements in your health.</p>
        <p style="margin-top: 20px;">Stay healthy!</p>
      </div>
    `;
    
    // Send email if available
    let emailResult = { success: false, skipped: true };
    if (user.email) {
      emailResult = await sendEmail({
        email: user.email,
        subject: emailSubject,
        html: emailHtml,
        text: smsMessage,
      });
    }
    
    // Log the notification
    await logNotification({
      userId: user._id,
      type: 'healthTip',
      referenceId: user._id,
      channel: smsResult.success ? 'sms' : (emailResult.success ? 'email' : 'failed'),
      status: (smsResult.success || emailResult.success) ? 'sent' : 'failed',
      messageContent: randomTip,
      metadata: {
        smsResult,
        emailResult,
      },
    });
    
    return {
      success: smsResult.success || emailResult.success,
      sms: smsResult,
      email: emailResult,
    };
  } catch (error) {
    console.error('❌ Error sending health tip:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Creates a notification in the database
 * 
 * @param {string} userId - The ID of the user to notify
 * @param {string} type - The notification type (appointment, medication, followup, healthTip, system)
 * @param {string} messageContent - The notification message
 * @param {string} channel - The notification channel (sms, email, push, app)
 * @param {Object} metadata - Additional data related to the notification
 * @returns {Promise<Object>} - The created notification object
 */
export async function createNotification(userId, type, messageContent, channel = "app", metadata = {}) {
  try {
    await connectDB();
    
    const notification = new Notification({
      userId,
      type,
      messageContent,
      channel,
      metadata,
      status: channel === "app" ? "unread" : "sent",
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Creates a medication reminder notification
 * 
 * @param {string} userId - The ID of the user to notify
 * @param {Object} medication - The medication object
 * @param {string} medicationName - The name of the medication
 * @param {Date} scheduledTime - When the medication should be taken
 * @returns {Promise<Object>} - The created notification object
 */
async function createMedicationReminder(userId, medication, medicationName, scheduledTime) {
  const message = `Time to take your ${medicationName} medication.`;
  const metadata = {
    medicationId: medication._id.toString(),
    scheduledTime: scheduledTime ? scheduledTime.toISOString() : new Date().toISOString(),
    dosage: medication.dosage,
    frequency: medication.frequency
  };
  
  return await createNotification(userId, "medication", message, "app", metadata);
}

/**
 * Creates a medication taken confirmation notification
 * 
 * @param {string} userId - The ID of the user
 * @param {string} medicationName - The name of the medication
 * @returns {Promise<Object>} - The created notification object
 */
async function createMedicationTakenNotification(userId, medicationName) {
  const message = `You've successfully taken your ${medicationName} medication.`;
  
  return await createNotification(userId, "medication", message, "app");
}

/**
 * Create a health tip notification
 * 
 * @param {string} userId - The ID of the user to notify
 * @param {string} tip - The health tip message
 * @returns {Promise<Object>} - The created notification object
 */
async function createHealthTipNotification(userId, tip) {
  return await createNotification(userId, "healthTip", tip, "app");
}

/**
 * Mark a notification as read
 * 
 * @param {string} notificationId - The ID of the notification to mark as read
 * @returns {Promise<Object>} - The updated notification
 */
async function markNotificationAsRead(notificationId) {
  try {
    await connectDB();
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { 
        status: "read",
        readAt: new Date()
      },
      { new: true }
    );
    
    return notification;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
}

/**
 * Get count of unread notifications for a user
 * 
 * @param {string} userId - The ID of the user
 * @returns {Promise<number>} - The number of unread notifications
 */
async function getUnreadCount(userId) {
  try {
    await connectDB();
    
    const count = await Notification.countDocuments({
      userId,
      status: "unread"
    });
    
    return count;
  } catch (error) {
    console.error("Error getting unread notification count:", error);
    throw error;
  }
}

// Export all functions
export {
  sendAppointmentReminder,
  sendMedicationReminder,
  sendHealthTip,
  hasRecentNotification,
  logNotification,
  sendSMS,
  sendEmail,
  formatDate,
  formatTime,
  getTimeUntilAppointment,
  createMedicationReminder,
  createMedicationTakenNotification,
  createHealthTipNotification,
  markNotificationAsRead,
  getUnreadCount,
}; 