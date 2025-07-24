import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import cron from "node-cron";
import MedicationReminder from "../models/MedicationReminder.js";
import UserProfile from "../models/UserProfile.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import { sendAppointmentReminder, sendMedicationReminder, sendHealthTip } from "../services/notificationService.js";
import { connectDB } from '../lib/db.js';
import { formatPhoneNumber } from "../utils/formatters.js";

// Import our new medication tools
import fs from 'fs';

// Add import for mock utilities
import { findInMockCollection, isMockMode } from '../lib/mockDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to medication-tools.js
const medicationToolsPath = path.join(__dirname, '..', 'medication-tools.js');

// Import the medication tools functions if the file exists
let sendSMS, makeVoiceCall;
if (fs.existsSync(medicationToolsPath)) {
  const module = await import('../medication-tools.js');
  sendSMS = module.sendSMS;
  makeVoiceCall = module.makeVoiceCall;
} else {
  console.warn(`Warning: medication-tools.js not found at ${medicationToolsPath}`);
  // Fallback implementations if the module isn't available
  sendSMS = async (phoneNumber, message) => {
    console.log(`[MOCK] Sending SMS to ${phoneNumber}: ${message}`);
    return { success: true, mock: true };
  };
  makeVoiceCall = async (phoneNumber) => {
    console.log(`[MOCK] Making voice call to ${phoneNumber}`);
    return { success: true, mock: true };
  };
}

// Load Environment Variables
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

// Get MongoDB connection URI from environment variables
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ Missing MongoDB environment variables. Check your .env.local file.");
  process.exit(1);
}

// Connect to MongoDB - only if not already connected
if (mongoose.connection.readyState !== 1) {
  console.log("🔄 Connecting to MongoDB...");
  mongoose.connect(mongoUri)
    .then(() => console.log("✅ Connected to MongoDB from reminder.js"))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      // Don't exit process here, allow retries
    });
}

// ✅ Reset Daily Medication Reminders at Midnight
cron.schedule("0 0 * * *", async () => {
  console.log("🔄 Resetting daily medication reminders...");
  try {
    await MedicationReminder.updateMany({ frequency: "Daily" }, { status: "Pending" });
    console.log("✅ All daily medications reset to Pending.");
  } catch (error) {
    console.error("❌ Error resetting medication reminders:", error);
  }
});

let isSchedulerRunning = false;

// Track which reminders we've already processed this minute to avoid duplicates
const processedReminders = new Set();

/**
 * Check and trigger medication reminders for a specific time
 * @param {string} currentTime - Time in HH:MM format (24-hour)
 */
export const checkMedicationReminders = async (currentTime) => {
  const now = new Date();
  const formattedCurrentTime = currentTime || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  console.log(`[${now.toISOString()}] 🔍 Checking medication reminders for all users at time: ${formattedCurrentTime}`);
  
  try {
    // Connect to DB if not already connected
    if (mongoose.connection.readyState !== 1 && !isMockMode()) {
      console.log('MongoDB not connected, connecting now...');
      await connectDB();
    }
    
    // Get ALL active reminders, not just for current time
    let allReminders;
    if (isMockMode()) {
      console.log('📋 Using mock data for medication reminders');
      
      // Get ALL active reminders from mock collection
      allReminders = findInMockCollection('medicationReminders', {
        active: true
      });
      
      // If no reminders in mock data, create mock reminders
      if (allReminders.length === 0) {
        console.log(`Creating mock reminders for demonstration`);
        
        // Create mock reminders with different times
        allReminders = [
          {
            _id: `mock-reminder-${Date.now()}-1`,
            userId: 'mock-user-1',
            medicationName: 'Test Medication 1',
            dosage: '10mg',
            frequency: 'Daily',
            time: formattedCurrentTime, // Current time
            status: 'Pending',
            active: true,
            enableVoiceCall: false
          },
          {
            _id: `mock-reminder-${Date.now()}-2`,
            userId: 'mock-user-2',
            medicationName: 'Test Medication 2',
            dosage: '20mg',
            frequency: 'Daily',
            time: '10:00', // Different time
            status: 'Pending',
            active: true,
            enableVoiceCall: false
          }
        ];
      }
    } else {
      // Real MongoDB query - get ALL active reminders
      allReminders = await MedicationReminder.find({
        active: true
      });
    }
    
    console.log(`Found ${allReminders.length} total active medication reminders across all users`);
    
    if (allReminders.length === 0) {
      return;
    }
    
    // Update the filter logic in checkMedicationReminders function to handle complex scheduling
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const currentDate = now.getDate(); // 1-31
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[currentDay];

    const remindersForCurrentTime = allReminders.filter(reminder => {
      // Skip if not pending
      if (reminder.status !== 'Pending') {
        return false;
      }
      
      // Handle "Twice Daily" reminders
      if (reminder.frequency === 'Twice Daily' && reminder.times && reminder.times.length > 0) {
        // Check if any of the times match the current time
        return reminder.times.includes(formattedCurrentTime);
      }
      
      // Handle "Weekly" reminders
      if (reminder.frequency === 'Weekly' && reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
        // Check if today is one of the selected days AND the time matches
        return reminder.daysOfWeek.includes(todayName) && reminder.time === formattedCurrentTime;
      }
      
      // Handle "Monthly" reminders
      if (reminder.frequency === 'Monthly' && reminder.daysOfMonth && reminder.daysOfMonth.length > 0) {
        // Check if today is one of the selected dates AND the time matches
        return reminder.daysOfMonth.includes(currentDate) && reminder.time === formattedCurrentTime;
      }
      
      // Default for "Daily" and "As Needed" - just check the time
      return reminder.time === formattedCurrentTime;
    });
    
    console.log(`${remindersForCurrentTime.length} reminders are scheduled for current time ${formattedCurrentTime}`);
    
    // Get all users with reminders
    const allUserIds = [...new Set(allReminders.map(r => r.userId.toString()))];
    console.log(`System has ${allUserIds.length} users with active medication reminders`);
    
    // Check reminders for each user
    for (const userId of allUserIds) {
      try {
        // All reminders for this user (not just current time)
        const userReminders = allReminders.filter(r => r.userId.toString() === userId);
        
        // Only reminders for current time
        const userCurrentReminders = remindersForCurrentTime.filter(r => r.userId.toString() === userId);
        
        console.log(`User ${userId} has ${userReminders.length} total reminders, ${userCurrentReminders.length} due now`);
        
        // Skip if no reminders due for this user at current time
        if (userCurrentReminders.length === 0) {
          continue;
        }
        
        // Get user profile for contact information
        let userProfile;
        if (isMockMode()) {
          // Get mock user profile
          userProfile = findInMockCollection('userProfiles', { userId: userId })[0];
          
          if (!userProfile) {
            console.log('Creating mock user profile for demonstration');
            userProfile = {
              _id: `mock-profile-${Date.now()}`,
              userId: userId,
              firstName: 'Test',
              lastName: 'User',
              contactNumber: '+1234567890'
            };
          }
        } else {
          userProfile = await UserProfile.findOne({ userId: userId });
        }
        
        if (!userProfile) {
          console.error(`❌ User profile not found for userId: ${userId}`);
          continue;
        }
        
        if (!userProfile.contactNumber) {
          console.error(`❌ No contact number found for user: ${userId}`);
          continue;
        }
        
        // Process each reminder due for this user at current time
        for (const reminder of userCurrentReminders) {
          try {
            // Skip if we've already processed this reminder in the current minute
            const reminderKey = `${reminder._id.toString()}-${formattedCurrentTime}`;
            if (processedReminders.has(reminderKey)) {
              console.log(`Skipping already processed reminder: ${reminderKey}`);
              continue;
            }
            
            // Add to processed set with a 5-minute expiration
            processedReminders.add(reminderKey);
            setTimeout(() => processedReminders.delete(reminderKey), 5 * 60 * 1000);
            
            console.log(`Processing reminder: ${reminder.medicationName} (User: ${userId})`);
            
            // Send the reminder notification
            console.log(`📱 Sending reminder to ${userProfile.contactNumber} for medication: ${reminder.medicationName}`);
            
            let result;
            if (isMockMode()) {
              // Mock notification sending
              console.log('🔔 MOCK: Sending medication reminder notification');
              result = { success: true, mock: true };
              console.log('✅ MOCK: Medication reminder sent successfully');
            } else {
              // Real notification sending
              result = await sendMedicationReminder(reminder, userProfile);
            }
            
            if (result.success) {
              // Update reminder status
              if (!isMockMode()) {
                await MedicationReminder.findByIdAndUpdate(reminder._id, { 
                  status: 'Sent',
                  lastSent: new Date()
                });
              }
              console.log(`✅ Updated reminder status to 'Sent' for reminder ${reminder._id}`);
              
              // Reset logic varies by frequency type
              if (reminder.frequency === 'Daily') {
                // For daily reminders, reset after 23 hours
                setTimeout(async () => {
                  try {
                    if (!isMockMode()) {
                      await MedicationReminder.findByIdAndUpdate(reminder._id, { 
                        status: 'Pending'
                      });
                    }
                    console.log(`✅ Reset daily reminder ${reminder._id} back to 'Pending' for next occurrence`);
                  } catch (error) {
                    console.error(`❌ Error resetting reminder status: ${error.message}`);
                  }
                }, 23 * 60 * 60 * 1000); // 23 hours
              } else if (reminder.frequency === 'Twice Daily') {
                // For twice daily, reset after 11 hours (to catch the next dose)
                setTimeout(async () => {
                  try {
                    if (!isMockMode()) {
                      await MedicationReminder.findByIdAndUpdate(reminder._id, { 
                        status: 'Pending'
                      });
                    }
                    console.log(`✅ Reset twice-daily reminder ${reminder._id} back to 'Pending' for next dose`);
                  } catch (error) {
                    console.error(`❌ Error resetting reminder status: ${error.message}`);
                  }
                }, 11 * 60 * 60 * 1000); // 11 hours
              } else if (reminder.frequency === 'Weekly') {
                // For weekly, reset after 6 days and 23 hours
                setTimeout(async () => {
                  try {
                    if (!isMockMode()) {
                      await MedicationReminder.findByIdAndUpdate(reminder._id, { 
                        status: 'Pending'
                      });
                    }
                    console.log(`✅ Reset weekly reminder ${reminder._id} back to 'Pending' for next week`);
                  } catch (error) {
                    console.error(`❌ Error resetting reminder status: ${error.message}`);
                  }
                }, 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000); // 6 days and 23 hours
              } else if (reminder.frequency === 'Monthly') {
                // For monthly, reset after 27 days (to handle different month lengths)
                setTimeout(async () => {
                  try {
                    if (!isMockMode()) {
                      await MedicationReminder.findByIdAndUpdate(reminder._id, { 
                        status: 'Pending'
                      });
                    }
                    console.log(`✅ Reset monthly reminder ${reminder._id} back to 'Pending' for next month`);
                  } catch (error) {
                    console.error(`❌ Error resetting reminder status: ${error.message}`);
                  }
                }, 27 * 24 * 60 * 60 * 1000); // 27 days
              }
            } else {
              console.error(`❌ Failed to send reminder: ${result.error || 'Unknown error'}`);
            }
          } catch (error) {
            console.error(`❌ Error processing reminder ${reminder._id}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing reminders for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error in checkMedicationReminders:', error);
  }
};

/**
 * Start the medication reminder scheduler
 */
export const startReminderScheduler = () => {
  console.log('🔄 Starting medication reminder scheduler...');
  
  if (isSchedulerRunning) {
    console.log('⚠️ Medication reminder scheduler is already running');
    return;
  }
  
  try {
    // Schedule cron job to run every minute
    const job = cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;
        
        await checkMedicationReminders(currentTime);
      } catch (cronError) {
        console.error('❌ Error in cron job execution:', cronError);
      }
    });
    
    isSchedulerRunning = true;
    console.log('✅ Medication reminder scheduler started successfully');
    
    return job;
  } catch (error) {
    console.error('❌ Failed to start reminder scheduler:', error);
    isSchedulerRunning = false;
    throw error;
  }
};

/**
 * Stop the medication reminder scheduler
 * @param {Object} job - The cron job to stop
 */
export const stopReminderScheduler = (job) => {
  if (job) {
    job.stop();
    isSchedulerRunning = false;
    console.log('Medication reminder scheduler stopped');
  }
};

/**
 * Additional function to manually trigger reminder checking
 * @param {string} specificTime - Optional specific time to check (HH:MM format)
 */
export const manuallyCheckReminders = async (specificTime = null) => {
  let timeToCheck;
  
  if (specificTime) {
    timeToCheck = specificTime;
  } else {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    timeToCheck = `${currentHour}:${currentMinute}`;
  }
  
  console.log(`👨‍💻 Manually checking reminders for time: ${timeToCheck}`);
  await checkMedicationReminders(timeToCheck);
};

// ✅ Appointment Reminder Scheduler (Runs Every Minute)
cron.schedule("* * * * *", async () => {
  console.log("🔔 Checking for appointment reminders...");
  try {
    // If in mock mode, skip real database operations
    if (isMockMode()) {
      console.log("⚠️ Running in mock mode - skipping real appointment checks");
      return;
    }
    
    await connectDB();
    
    const now = new Date();
    console.log(`Current date/time: ${now.toISOString()}`);
    
    // Calculate target times for reminders (24 hours, 12 hours, and 1 hour before appointments)
    const reminder24h = new Date(now);
    reminder24h.setHours(now.getHours() + 24);
    
    const reminder12h = new Date(now);
    reminder12h.setHours(now.getHours() + 12);
    
    const reminder1h = new Date(now);
    reminder1h.setHours(now.getHours() + 1);
    
    // Format dates and times for database query
    const formatDateForQuery = (date) => date.toISOString().split('T')[0];
    const formatTimeForQuery = (date) => date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit", 
      hour12: false 
    });
    
    const date24h = formatDateForQuery(reminder24h);
    const time24h = formatTimeForQuery(reminder24h);
    const date12h = formatDateForQuery(reminder12h);
    const time12h = formatTimeForQuery(reminder12h);
    const date1h = formatDateForQuery(reminder1h);
    const time1h = formatTimeForQuery(reminder1h);
    
    console.log(`Looking for appointments at these times:
    - 24h: ${date24h} ${time24h}
    - 12h: ${date12h} ${time12h}
    - 1h: ${date1h} ${time1h}`);
    
    // Find appointments that are happening at our target reminder times
    // Use case-insensitive query for status
    const query = {
      $or: [
        { status: "approved" },
        { status: "Approved" }  // Check for both uppercase and lowercase
      ],
      $or: [
        // 24-hour reminders
        { 
          date: date24h,
          time: time24h,
          reminderSent24h: { $ne: true }
        },
        // 12-hour reminders
        { 
          date: date12h,
          time: time12h,
          reminderSent12h: { $ne: true }
        },
        // 1-hour reminders
        { 
          date: date1h,
          time: time1h,
          reminderSent1h: { $ne: true }
        }
      ]
    };
    
    console.log(`Appointment query: ${JSON.stringify(query)}`);
    
    // First, count all approved appointments to check if there are any
    const totalApprovedCount = await Appointment.countDocuments({
      $or: [
        { status: "approved" },
        { status: "Approved" }
      ]
    });
    
    console.log(`Total approved appointments in database: ${totalApprovedCount}`);
    
    const appointments = await Appointment.find(query).populate('doctor');
    
    console.log(`Found ${appointments.length} appointments that need reminders`);

    if (appointments.length === 0) {
      // If no appointments match our criteria, let's check why
      const sampleAppointments = await Appointment.find().limit(3);
      if (sampleAppointments.length > 0) {
        console.log(`Sample appointments in database (for debugging):
        ${JSON.stringify(sampleAppointments.map(a => ({
          id: a._id,
          date: a.date,
          time: a.time,
          status: a.status,
          reminderSent24h: a.reminderSent24h,
          reminderSent12h: a.reminderSent12h,
          reminderSent1h: a.reminderSent1h
        })))}
        `);
      }
      
      console.log("✅ No pending appointment reminders.");
      return;
    }

    console.log(`📬 Found ${appointments.length} appointments to send reminders for`);
    
    for (const appointment of appointments) {
      const userProfile = await UserProfile.findOne({ userId: appointment.userId });
      if (!userProfile) {
        console.log(`⚠️ No user profile found for user ${appointment.userId}`);
        continue;
      }
      
      // Calculate which reminder this is (24h, 12h, or 1h)
      const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
      const hoursUntilAppointment = Math.round((appointmentDate - now) / (1000 * 60 * 60));
      
      let reminderType = "";
      let reminderField = "";
      
      if (hoursUntilAppointment >= 22 && hoursUntilAppointment <= 24) {
        reminderType = "24-hour";
        reminderField = "reminderSent24h";
      } else if (hoursUntilAppointment >= 11 && hoursUntilAppointment <= 13) {
        reminderType = "12-hour";
        reminderField = "reminderSent12h";
      } else if (hoursUntilAppointment >= 0 && hoursUntilAppointment <= 2) {
        reminderType = "1-hour";
        reminderField = "reminderSent1h";
      } else {
        // This should not happen given our query, but just in case
        console.log(`⚠️ Appointment for user ${appointment.userId} doesn't match any reminder timeframe (${hoursUntilAppointment} hours away)`);
        continue;
      }
      
      console.log(`Sending ${reminderType} reminder for appointment on ${appointment.date} at ${appointment.time}`);
      
      // Use the notification service to send the reminder
      const result = await sendAppointmentReminder(appointment, userProfile, reminderType);
      
      if (result.success) {
        // Mark this reminder as sent
        const updateResult = await Appointment.findByIdAndUpdate(appointment._id, {
          [reminderField]: true,
          lastReminderSent: new Date()
        });
        
        console.log(`✅ ${reminderType} appointment reminder sent to user ${appointment.userId} for appointment on ${appointment.date} at ${appointment.time}`);
        console.log(`Update result: ${updateResult ? "Success" : "Failed"}`);
      } else if (result.skipped) {
        console.log(`⏭️ Skipped ${reminderType} appointment reminder for user ${appointment.userId} - already sent recently`);
      } else {
        console.error(`❌ Failed to send ${reminderType} appointment reminder to user ${appointment.userId}:`, result.error);
      }
    }
  } catch (err) {
    console.error("❌ Error checking appointments:", err);
  }
});

// ✅ Daily Health Tips (Runs Once a Day at 9 AM)
cron.schedule("0 9 * * *", async () => {
  console.log("💡 Sending daily health tips...");
  try {
    // If in mock mode, skip real database operations
    if (isMockMode()) {
      console.log("⚠️ Running in mock mode - skipping real health tip sending");
      return;
    }
    
    // Get all users
    const users = await User.find({ role: "patient" });
    if (users.length === 0) return console.log("✅ No users to send health tips to.");

    for (const user of users) {
      const userProfile = await UserProfile.findOne({ userId: user._id });
      if (!userProfile) {
        console.log(`⚠️ No user profile found for user ${user._id}`);
        continue;
      }

      // Use the notification service to send health tip
      const result = await sendHealthTip(user, userProfile);
      if (result.success) {
        console.log(`✅ Health tip sent to user ${user._id}`);
      } else if (result.skipped) {
        console.log(`⏭️ Skipped health tip for user ${user._id} - already sent today`);
      } else {
        console.error(`❌ Failed to send health tip to user ${user._id}:`, result.error);
      }
    }
  } catch (err) {
    console.error("❌ Error sending health tips:", err);
  }
});

// Start the scheduler when this module is loaded
startReminderScheduler();

// Export isSchedulerRunning
export { isSchedulerRunning };
