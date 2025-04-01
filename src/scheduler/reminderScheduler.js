import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import cron from "node-cron";
import MedicationReminder from "../models/MedicationReminder";
import UserProfile from "../models/UserProfile";
import Appointment from "../models/Appointment";
import User from "../models/User";
import { sendAppointmentReminder, sendMedicationReminder, sendHealthTip } from "../services/notificationService";
import { connectDB } from '../lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Check and trigger medication reminders for a specific minute
 * @param {string} currentTime - Time in HH:MM format (24-hour)
 */
export const checkMedicationReminders = async (currentTime) => {
  console.log(`[${new Date().toISOString()}] Checking medication reminders for time: ${currentTime}`);
  
  try {
    await connectDB();
    
    // Find all reminders scheduled for the current time with status 'Pending'
    const reminders = await MedicationReminder.find({
      time: currentTime,
      status: 'Pending',
      active: true
    });
    
    console.log(`Found ${reminders.length} medication reminders for time ${currentTime}`);
    
    if (reminders.length === 0) {
      return;
    }
    
    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Get user profile for contact information
        const userProfile = await UserProfile.findOne({ userId: reminder.userId });
        
        if (!userProfile) {
          console.error(`User profile not found for userId: ${reminder.userId}`);
          continue;
        }
        
        console.log(`Processing reminder for medication: ${reminder.medicationName} (User: ${reminder.userId})`);
        
        // Send the reminder notification
        const result = await sendMedicationReminder(reminder, userProfile);
        
        if (result.success) {
          // Update reminder status
          if (!result.skipped) {
            await MedicationReminder.findByIdAndUpdate(reminder._id, { 
              status: 'Sent',
              lastSent: new Date()
            });
            console.log(`Reminder status updated to 'Sent' for reminder ${reminder._id}`);
          } else {
            console.log(`Reminder notification skipped for reminder ${reminder._id} (already sent recently)`);
          }
        } else {
          console.error(`Failed to send reminder for ${reminder._id}:`, result.error);
        }
      } catch (error) {
        console.error(`Error processing individual reminder ${reminder._id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error in checkMedicationReminders:', error);
  }
};

/**
 * Start the medication reminder scheduler
 */
export const startReminderScheduler = () => {
  if (isSchedulerRunning) {
    console.log('Medication reminder scheduler is already running');
    return;
  }
  
  console.log('Starting medication reminder scheduler...');
  
  // Schedule cron job to run every minute
  const job = cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    await checkMedicationReminders(currentTime);
  });
  
  isSchedulerRunning = true;
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

// Additional function to manually trigger reminder checking
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
  
  console.log(`Manually checking reminders for time: ${timeToCheck}`);
  await checkMedicationReminders(timeToCheck);
};

// ✅ Appointment Reminder Scheduler (Runs Every Minute)
cron.schedule("* * * * *", async () => {
  console.log("🔔 Checking for appointment reminders...");
  try {
    const now = new Date();
    // Create time intervals for appointment reminders (now, 24 hours before, and 2 hours before)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const twoHoursLater = new Date(now);
    twoHoursLater.setHours(now.getHours() + 2);

    // Find appointments that are happening now, in 2 hours, or tomorrow
    const appointments = await Appointment.find({
      status: "approved",
      $or: [
        { 
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
        },
        { 
          date: twoHoursLater.toISOString().split('T')[0],
          time: twoHoursLater.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
        },
        { 
          date: tomorrow.toISOString().split('T')[0],
          time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
        }
      ]
    });

    if (appointments.length === 0) return console.log("✅ No pending appointment reminders.");

    console.log(`📬 Found ${appointments.length} appointments to send reminders for`);
    for (const appointment of appointments) {
      const userProfile = await UserProfile.findOne({ userId: appointment.userId });
      if (!userProfile) {
        console.log(`⚠️ No user profile found for user ${appointment.userId}`);
        continue;
      }

      // Use the notification service to send the reminder
      const result = await sendAppointmentReminder(appointment, userProfile);
      if (result.success) {
        console.log(`✅ Appointment reminder sent to user ${appointment.userId} for appointment on ${appointment.date} at ${appointment.time}`);
      } else if (result.skipped) {
        console.log(`⏭️ Skipped appointment reminder for user ${appointment.userId} - already sent recently`);
      } else {
        console.error(`❌ Failed to send appointment reminder to user ${appointment.userId}:`, result.error);
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
