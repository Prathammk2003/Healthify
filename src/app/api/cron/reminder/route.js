import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import UserProfile from '@/models/UserProfile';
import { sendAppointmentReminder } from '@/services/notificationService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(req) {
  try {
    console.log("🔔 Appointment reminder cron job started");
    
    // Check for authorization (optional)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
    
    console.log(`Checking for appointments at these times:
      24h: ${formatDateForQuery(reminder24h)} ${formatTimeForQuery(reminder24h)}
      12h: ${formatDateForQuery(reminder12h)} ${formatTimeForQuery(reminder12h)}
      1h: ${formatDateForQuery(reminder1h)} ${formatTimeForQuery(reminder1h)}`);
    
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
    }).populate('doctor', 'userId').populate('userId', 'name email');

    if (appointments.length === 0) {
      console.log("✅ No pending appointment reminders.");
      return NextResponse.json({ success: true, message: "No reminders to send" });
    }

    console.log(`📬 Found ${appointments.length} appointments to send reminders for`);
    
    const results = [];
    
    for (const appointment of appointments) {
      try {
        const userProfile = await UserProfile.findOne({ userId: appointment.userId._id });
        if (!userProfile) {
          console.log(`⚠️ No user profile found for user ${appointment.userId._id}`);
          results.push({ id: appointment._id, status: "error", error: "No user profile found" });
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
          console.log(`⚠️ Appointment doesn't match any reminder timeframe (${hoursUntilAppointment} hours away)`);
          results.push({ id: appointment._id, status: "error", error: "Invalid reminder timeframe" });
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
          
          console.log(`✅ ${reminderType} appointment reminder sent for appointment on ${appointment.date} at ${appointment.time}`);
          results.push({ 
            id: appointment._id, 
            status: "success", 
            type: reminderType 
          });
        } else if (result.skipped) {
          console.log(`⏭️ Skipped ${reminderType} appointment reminder - already sent recently`);
          results.push({ 
            id: appointment._id, 
            status: "skipped",
            type: reminderType 
          });
        } else {
          console.error(`❌ Failed to send ${reminderType} appointment reminder:`, result.error);
          results.push({ 
            id: appointment._id, 
            status: "error",
            type: reminderType,
            error: result.error 
          });
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment._id}:`, error);
        results.push({ id: appointment._id, status: "error", error: error.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: appointments.length,
      results
    });
  } catch (error) {
    console.error("❌ Error in appointment reminder cron job:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 