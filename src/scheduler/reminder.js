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

const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("❌ Missing environment variables. Check your .env.local file.");
  process.exit(1);
}

// ✅ Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

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
  
  console.log(`[${now.toISOString()}] 🔍 Checking medication reminders for time: ${formattedCurrentTime}`);
  
  try {
    // Find all reminders scheduled for the current time with status 'Pending'
    const reminders = await MedicationReminder.find({
      time: formattedCurrentTime,
      status: 'Pending',
      active: true
    });
    
    console.log(`Found ${reminders.length} medication reminders for time ${formattedCurrentTime}`);
    
    if (reminders.length === 0) {
      return;
    }
    
    // Process each reminder
    for (const reminder of reminders) {
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
        
        console.log(`Processing reminder: ${reminder.medicationName} (User: ${reminder.userId})`);
        
        // Get user profile for contact information
        const userProfile = await UserProfile.findOne({ userId: reminder.userId });
        
        if (!userProfile) {
          console.error(`❌ User profile not found for userId: ${reminder.userId}`);
          continue;
        }
        
        if (!userProfile.contactNumber) {
          console.error(`❌ No contact number found for user: ${reminder.userId}`);
          continue;
        }
        
        // Send the reminder notification
        console.log(`📱 Sending reminder to ${userProfile.contactNumber} for medication: ${reminder.medicationName}`);
        const result = await sendMedicationReminder(reminder, userProfile);
        
        if (result.success) {
          // Update reminder status
          await MedicationReminder.findByIdAndUpdate(reminder._id, { 
            status: 'Sent',
            lastSent: new Date()
          });
          console.log(`✅ Updated reminder status to 'Sent' for reminder ${reminder._id}`);
          
          // For daily reminders, reset status for next day automatically
          if (reminder.frequency === 'daily' || reminder.frequency === 'Daily') {
            // Schedule a reset of status back to 'Pending' after 23 hours
            setTimeout(async () => {
              try {
                await MedicationReminder.findByIdAndUpdate(reminder._id, { 
                  status: 'Pending'
                });
                console.log(`✅ Reset reminder ${reminder._id} back to 'Pending' for next occurrence`);
              } catch (error) {
                console.error(`❌ Error resetting reminder status: ${error.message}`);
              }
            }, 23 * 60 * 60 * 1000);
          }
        } else {
          console.error(`❌ Failed to send reminder: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder._id}:`, error);
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
  
  // Schedule cron job to run every minute
  const job = cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    await checkMedicationReminders(currentTime);
  });
  
  console.log('✅ Medication reminder scheduler started successfully');
  
  return job;
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
    await connectDB();
    
    const now = new Date();
    
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
    
    // Find appointments that are happening at our target reminder times
    const appointments = await Appointment.find({
      status: "approved",
      $or: [
        // 24-hour reminders
        { 
          date: formatDateForQuery(reminder24h),
          time: formatTimeForQuery(reminder24h),
          reminderSent24h: { $ne: true }
        },
        // 12-hour reminders
        { 
          date: formatDateForQuery(reminder12h),
          time: formatTimeForQuery(reminder12h),
          reminderSent12h: { $ne: true }
        },
        // 1-hour reminders
        { 
          date: formatDateForQuery(reminder1h),
          time: formatTimeForQuery(reminder1h),
          reminderSent1h: { $ne: true }
        }
      ]
    });

    if (appointments.length === 0) {
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
        await Appointment.findByIdAndUpdate(appointment._id, {
          [reminderField]: true
        });
        
        console.log(`✅ ${reminderType} appointment reminder sent to user ${appointment.userId} for appointment on ${appointment.date} at ${appointment.time}`);
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
