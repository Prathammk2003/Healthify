import { Vonage } from '@vonage/server-sdk'
import twilio from 'twilio';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import MedicationReminder from '../models/MedicationReminder.js';
import nodemailer from 'nodemailer';
import { connectDB } from "../lib/db.js";
import Notification from "../models/Notification.js";
import Appointment from '../models/Appointment.js';

// Initialize both clients - Vonage as primary, Twilio as fallback
let vonageClient;
let twilioClient;

try {
  // Initialize Vonage client if credentials are available
  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
    vonageClient = new Vonage({
      apiKey: process.env.VONAGE_API_KEY,
      apiSecret: process.env.VONAGE_API_SECRET,
    });
    console.log('✅ Vonage client initialized successfully');
  } else {
    console.warn('⚠️ Vonage credentials not found in environment variables');
  }
} catch (error) {
  console.error('❌ Error initializing Vonage client:', error);
}

try {
  // Initialize Twilio client if credentials are available
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
    pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD,  // Prefer EMAIL_PASS if available
  },
});

// Verify email transporter configuration
console.log('📧 Email transporter configuration:');
console.log('- EMAIL_USER:', process.env.EMAIL_USER ? 'Present' : 'Missing');
console.log('- EMAIL_PASS:', process.env.EMAIL_PASS ? 'Present' : 'Missing');
console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'Present' : 'Missing');

// Test email transporter verification
if (emailTransporter) {
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error);
    } else {
      console.log('✅ Email transporter verified successfully');
    }
  });
} else {
  console.error('❌ Email transporter not initialized');
}

/**
 * Format date string to a human-readable format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date
 */
const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format time string to a human-readable format
 * @param {string} timeStr - Time string in HH:MM format
 * @returns {string} - Formatted time
 */
const formatTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
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
 * Check if a notification was recently sent to avoid duplicates
 * @param {Object} options - Options for checking recent notifications
 * @returns {Promise<boolean>} - Whether a notification was recently sent
 */
const hasRecentNotification = async ({ userId, type, referenceId, hours = 24 }) => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    const recentNotification = await Notification.findOne({
      userId,
      type,
      referenceId,
      createdAt: { $gte: cutoffTime }
    });
    
    return !!recentNotification;
  } catch (error) {
    console.error('Error checking recent notifications:', error);
    return false;
  }
};

/**
 * Log a notification in the database
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} - Created notification
 */
const logNotification = async ({ userId, type, referenceId, channel, status, messageContent, metadata = {} }) => {
  try {
    const notification = new Notification({
      userId,
      type,
      referenceId,
      channel,
      status,
      messageContent,
      metadata,
      read: false
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error logging notification:', error);
    return null;
  }
};

/**
 * Send an SMS message with fallback from Vonage to Twilio
 * @param {Object} options - SMS options
 * @returns {Promise<Object>} - Result of sending
 */
const sendSMS = async ({ phoneNumber, message }) => {
  try {
    // Format phone number with +91 country code (India) if needed
    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedNumber = `+91${phoneNumber.replace(/\D/g, '')}`;
    } else if (phoneNumber.startsWith('+1')) {
      // Replace +1 with +91 if found (handle case where might be auto-formatting)
      formattedNumber = `+91${phoneNumber.slice(2)}`;
    }
    
    console.log(`📱 Formatted phone number for SMS: ${formattedNumber}`);
    console.log(`🔔 Attempting to send SMS to ${formattedNumber}: ${message}`);
    
    // Try Vonage first (primary provider)
    if (vonageClient) {
      try {
        const from = process.env.VONAGE_PHONE_NUMBER || "Vonage APIs";
        const resp = await vonageClient.sms.send({ to: formattedNumber, from, text: message });
        
        console.log(`✅ SMS sent successfully via Vonage to ${formattedNumber}`, resp);
        return { success: true, provider: 'vonage', response: resp };
      } catch (vonageError) {
        console.warn(`⚠️ Failed to send SMS via Vonage: ${vonageError.message}`);
        console.log('🔄 Falling back to Twilio...');
      }
    } else {
      console.log('⚠️ Vonage client not available - falling back to Twilio');
    }
    
    // Fallback to Twilio
    if (twilioClient) {
      try {
        const result = await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedNumber
        });
        
        console.log(`✅ SMS sent successfully via Twilio to ${formattedNumber} (SID: ${result.sid})`);
        return { success: true, provider: 'twilio', sid: result.sid, status: result.status };
      } catch (twilioError) {
        console.error(`❌ Error sending SMS via Twilio: ${twilioError.message}`);
        return { success: false, error: twilioError.message };
      }
    } else {
      console.warn('⚠️ Twilio client not available - using mock implementation');
      return { success: true, provider: 'mock', messageId: `mock-${Date.now()}`, mock: true };
    }
  } catch (error) {
    console.error(`❌ Error sending SMS: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Result of sending
 */
const sendEmail = async ({ email, subject, html, text }) => {
  try {
    console.log(`📧 Preparing to send email to: ${email}`);
    console.log(`📧 Email subject: ${subject}`);
    
    if (!emailTransporter) {
      throw new Error('Email transporter not initialized');
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER ? `"Healthcare App" <${process.env.EMAIL_USER}>` : undefined,
      to: email,
      subject,
      html,
      text
    };
    
    console.log(`📧 Sending email with options:`, JSON.stringify(mailOptions, null, 2));
    
    const result = await emailTransporter.sendMail(mailOptions);
    
    console.log(`📧 Email sent successfully to ${email} (Message ID: ${result.messageId})`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Provide specific error messages for common issues
    if (error.code === 'EAUTH') {
      console.error('❌ Email authentication failed. For Gmail, you need to use an App Password instead of your regular password.');
      console.error('See: https://support.google.com/accounts/answer/185833');
    } else if (error.code === 'EENVELOPE') {
      console.error('❌ Invalid email address format');
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
const markNotificationAsRead = async (notificationId) => {
  try {
    const result = await Notification.findByIdAndUpdate(
      notificationId, 
      { read: true },
      { new: true }
    );
    return !!result;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Get count of unread notifications for a user
 * @param {string} userId - User ID to check
 * @returns {Promise<number>} - Count of unread notifications
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      userId,
      read: false
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
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
      userId: appointment.userId._id || appointment.userId,
      type: 'appointment',
      referenceId: appointment._id,
      hours: 3, // Don't send reminders more than once every 3 hours
    });
    
    if (recentNotification) {
      console.log(`⏭️ Skipping duplicate appointment reminder for user ${appointment.userId._id || appointment.userId}`);
      return { success: true, skipped: true };
    }
    
    // Get doctor information for a more personalized message
    let doctorName = 'your doctor';
    if (appointment.doctor) {
      try {
        const doctorDoc = appointment.doctor;
        if (doctorDoc && doctorDoc.userId) {
          // Handle both string name and object user with name property
          const name = typeof doctorDoc.userId === 'object' 
            ? (doctorDoc.userId.name || 'your doctor') 
            : doctorDoc.userId;
          doctorName = `Dr. ${name}`;
        }
      } catch (err) {
        console.error('Error getting doctor details:', err);
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
    
    // Get user email from User model using the userId
    let emailResult = { success: false, skipped: true };
    try {
      let userEmail = null;
      
      console.log('🔍 Debug: appointment.userId type:', typeof appointment.userId);
      console.log('🔍 Debug: appointment.userId value:', appointment.userId);
      
      // Check if appointment.userId is an object with email property
      if (appointment.userId && typeof appointment.userId === 'object' && appointment.userId.email) {
        userEmail = appointment.userId.email;
        console.log('📧 Email found in appointment.userId object:', userEmail);
      } 
      // If it's just an ID, fetch the user from database
      else if (appointment.userId && typeof appointment.userId === 'string') {
        console.log('🔍 Fetching user from database with ID:', appointment.userId);
        try {
          const userDoc = await User.findById(appointment.userId);
          userEmail = userDoc ? userDoc.email : null;
          console.log('📧 Email found in database:', userEmail);
        } catch (userFetchError) {
          console.error('Error fetching user for email reminder:', userFetchError);
        }
      } else {
        console.log('🔍 Unexpected userId format, skipping email notification');
      }
      
      if (userEmail) {
        emailResult = await sendEmail({
          email: userEmail,
          subject: emailSubject,
          html: emailHtml,
          text: reminderMessage,
        });
      } else {
        console.log('No email found for user, skipping email reminder');
      }
    } catch (err) {
      console.error('Error sending appointment email reminder:', err);
    }
    
    // Log the notification
    await logNotification({
      userId: (appointment.userId && typeof appointment.userId === 'object' && appointment.userId._id) ? appointment.userId._id : appointment.userId,
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
    console.log(`Attempting to send medication reminder for ${reminder?.medicationName || 'unknown'}`);
    
    if (!reminder || !userProfile) {
      console.error('Missing reminder or user profile for medication reminder');
      return { success: false, error: 'Missing data' };
    }

    // Create message
    const message = `Reminder: It's time to take your ${reminder.medicationName} (${reminder.dosage}). Stay healthy!`;
    console.log(`Prepared SMS message: "${message}"`);
    
    // Send SMS with fallback mechanism
    let smsResult;
    try {
      smsResult = await sendSMS({
        phoneNumber: userProfile.contactNumber,
        message: message
      });
      console.log(`SMS result: ${JSON.stringify(smsResult)}`);
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      smsResult = { success: false, error: smsError.message };
    }
    
    // Check if voice call is enabled and should be made (Twilio only)
    let callResult = { success: false, skipped: true };
    if ((reminder.enableVoiceCall || userProfile.voiceCallEnabled) && twilioClient) {
      console.log(`Voice call enabled for user ${reminder.userId}, making call...`);
      
      try {
        // Format phone number with +91 country code (India) if needed
        let formattedNumber = userProfile.contactNumber;
        if (!userProfile.contactNumber.startsWith('+')) {
          formattedNumber = `+91${userProfile.contactNumber.replace(/\D/g, '')}`;
        } else if (userProfile.contactNumber.startsWith('+1')) {
          // Replace +1 with +91 if found (handle case where might be auto-formatting)
          formattedNumber = `+91${userProfile.contactNumber.slice(2)}`;
        }
        
        console.log(`Formatted phone number for voice call: ${formattedNumber}`);
        
        // TwiML for voice call
        const twimlURL = 'https://handler.twilio.com/twiml/EH8ccdbd7f0b05764809dd5e3d96c7e76f';
        
        // Set country code to IN (India) to override any default behavior
        const call = await twilioClient.calls.create({
          url: twimlURL,
          to: formattedNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          countryCode: 'IN' // Specify India as the country
        });
        
        callResult = { 
          success: true, 
          sid: call.sid, 
          status: call.status 
        };
        
        console.log(`Voice call initiated for medication reminder to ${formattedNumber}`);
      } catch (callError) {
        console.error('Error making voice call:', callError);
        callResult = { success: false, error: callError.message };
      }
    } else if ((reminder.enableVoiceCall || userProfile.voiceCallEnabled) && !twilioClient) {
      console.log('Voice calls are only supported with Twilio and Twilio client is not available');
    }
    
    // Send email notification
    let emailResult = { success: false, skipped: true };
    try {
      // Get user email from User model using the userId
      let userEmail = null;
      
      console.log('🔍 Debug: reminder.userId type:', typeof reminder.userId);
      console.log('🔍 Debug: reminder.userId value:', reminder.userId);
      
      // Handle different types of userId
      if (reminder.userId) {
        try {
          // If userId is an object with toString method (ObjectId), convert to string
          const userIdString = typeof reminder.userId === 'object' && reminder.userId.toString ? 
            reminder.userId.toString() : 
            reminder.userId;
          
          console.log('🔍 Fetching user from database with ID:', userIdString);
          const userDoc = await User.findById(userIdString);
          userEmail = userDoc ? userDoc.email : null;
          console.log('📧 Email found in database:', userEmail);
        } catch (userFetchError) {
          console.error('Error fetching user for email reminder:', userFetchError);
        }
      } else {
        console.log('🔍 No userId found, skipping email notification');
      }
      
      if (userEmail) {
        const emailSubject = `Medication Reminder: ${reminder.medicationName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #3b82f6;">Medication Reminder</h2>
            <p>Hello ${userProfile.firstName || 'there'},</p>
            <p>This is a reminder to take your medication:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Medication:</strong> ${reminder.medicationName}</p>
              <p style="margin: 5px 0;"><strong>Dosage:</strong> ${reminder.dosage}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${reminder.time || 'As scheduled'}</p>
            </div>
            <p>Please take your medication as prescribed by your doctor.</p>
            <p style="margin-top: 20px;">Stay healthy!</p>
          </div>
        `;
        
        emailResult = await sendEmail({
          email: userEmail,
          subject: emailSubject,
          html: emailHtml,
          text: message,
        });
      } else {
        console.log('No email found for user, skipping email reminder');
      }
    } catch (err) {
      console.error('Error sending medication email reminder:', err);
    }
    
    // Log this notification
    try {
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
          voiceCall: callResult.success,
          email: emailResult.success
        }
      });
      console.log('Notification logged successfully');
    } catch (logError) {
      console.error('Error logging notification:', logError);
    }
    
    console.log(`Medication reminder processing complete for: ${reminder.medicationName}`);
    return { 
      success: smsResult.success || callResult.success || emailResult.success,
      sms: smsResult,
      call: callResult,
      email: emailResult
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
    
    // Get user email - check if it's directly available or fetch from database
    let userEmail = null;
    if (user.email) {
      // Email is directly available in the user object
      userEmail = user.email;
    } else if (user._id) {
      // Fetch user from database to get email
      try {
        const userDoc = await User.findById(user._id);
        userEmail = userDoc ? userDoc.email : null;
      } catch (userFetchError) {
        console.error('Error fetching user for health tip email:', userFetchError);
      }
    }
    
    if (userEmail) {
      emailResult = await sendEmail({
        email: userEmail,
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