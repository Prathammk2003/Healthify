import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import UserProfile from '@/models/UserProfile';
import { sendAppointmentReminder } from '@/services/notificationService';

export async function GET(req) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get the current date and time
    const now = new Date();
    
    // Format the current time for logging
    const currentTime = now.toLocaleTimeString();
    
    console.log(`🔔 Manual reminder check triggered at ${currentTime}`);
    
    // Query all appointments regardless of time to see if the reminder system is working
    const appointments = await Appointment.find({
      status: 'approved',
    }).populate('doctor', 'userId').populate('userId', 'name email');
    
    if (appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No appointments found to check for reminders',
      });
    }
    
    console.log(`Found ${appointments.length} total appointments to check`);
    
    const results = [];
    
    for (const appointment of appointments) {
      try {
        // Get the appointment date and time as a Date object
        const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
        const hoursUntilAppointment = Math.round((appointmentDate - now) / (1000 * 60 * 60));
        
        console.log(`Appointment ID: ${appointment._id}, Date: ${appointment.date}, Time: ${appointment.time}, Hours until: ${hoursUntilAppointment}`);
        
        // Get the user profile
        const userProfile = await UserProfile.findOne({ userId: appointment.userId._id });
        if (!userProfile) {
          console.log(`No user profile found for user ${appointment.userId._id}`);
          results.push({
            id: appointment._id,
            status: 'error',
            error: 'No user profile found'
          });
          continue;
        }
        
        // Determine reminder type based on hours until appointment
        let reminderType = '';
        let reminderField = '';
        let shouldSend = false;
        
        if (hoursUntilAppointment >= 22 && hoursUntilAppointment <= 24 && !appointment.reminderSent24h) {
          reminderType = '24-hour';
          reminderField = 'reminderSent24h';
          shouldSend = true;
        } else if (hoursUntilAppointment >= 11 && hoursUntilAppointment <= 13 && !appointment.reminderSent12h) {
          reminderType = '12-hour';
          reminderField = 'reminderSent12h';
          shouldSend = true;
        } else if (hoursUntilAppointment >= 0 && hoursUntilAppointment <= 2 && !appointment.reminderSent1h) {
          reminderType = '1-hour';
          reminderField = 'reminderSent1h';
          shouldSend = true;
        }
        
        // Include appointment in results regardless of whether reminder is sent
        const appointmentResult = {
          id: appointment._id,
          date: appointment.date,
          time: appointment.time,
          hoursUntil: hoursUntilAppointment,
          reminderType: reminderType || 'none',
          shouldSend: shouldSend,
          reminderStatus: {
            sent24h: appointment.reminderSent24h,
            sent12h: appointment.reminderSent12h,
            sent1h: appointment.reminderSent1h
          }
        };
        
        // If we should send a reminder, do it
        if (shouldSend) {
          console.log(`Sending ${reminderType} reminder for appointment ${appointment._id}`);
          
          const result = await sendAppointmentReminder(appointment, userProfile, reminderType);
          
          if (result.success) {
            // Mark this reminder as sent
            await Appointment.findByIdAndUpdate(appointment._id, {
              [reminderField]: true
            });
            
            appointmentResult.status = 'sent';
            appointmentResult.details = result;
            
            console.log(`✅ ${reminderType} reminder sent for appointment ${appointment._id}`);
          } else if (result.skipped) {
            appointmentResult.status = 'skipped';
            appointmentResult.reason = 'Recently sent';
            
            console.log(`⏭️ ${reminderType} reminder skipped for appointment ${appointment._id}`);
          } else {
            appointmentResult.status = 'error';
            appointmentResult.error = result.error;
            
            console.log(`❌ Failed to send ${reminderType} reminder for appointment ${appointment._id}: ${result.error}`);
          }
        } else {
          appointmentResult.status = 'not_due';
          appointmentResult.reason = 'No reminder due at this time';
        }
        
        results.push(appointmentResult);
      } catch (error) {
        console.error(`Error processing appointment ${appointment._id}:`, error);
        results.push({
          id: appointment._id,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Appointment reminders checked',
      appointmentsChecked: appointments.length,
      results: results
    });
  } catch (error) {
    console.error('Error checking appointment reminders:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 