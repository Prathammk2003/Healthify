import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import User from '@/models/User';

export async function GET(req) {
  try {
    // Connect to the database
    await connectDB();
    
    // Get a doctor (first one found)
    const doctor = await Doctor.findOne({});
    if (!doctor) {
      return NextResponse.json({ error: 'No doctors found in the system' }, { status: 404 });
    }
    
    // Get a user with role "patient" (first one found)
    const user = await User.findOne({ role: 'patient' });
    if (!user) {
      return NextResponse.json({ error: 'No patients found in the system' }, { status: 404 });
    }
    
    // Current date and time
    const now = new Date();
    
    // For testing 1-hour reminder - Create an appointment 1 hour from now
    const oneHourFromNow = new Date(now);
    oneHourFromNow.setHours(now.getHours() + 1);
    
    // Format dates and times for the appointment
    const formatDate = (date) => date.toISOString().split('T')[0];
    const formatTime = (date) => date.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit", 
      hour12: false 
    });
    
    // Create the appointment
    const testAppointment = new Appointment({
      doctor: doctor._id,
      userId: user._id,
      date: formatDate(oneHourFromNow),
      time: formatTime(oneHourFromNow),
      status: 'approved',
      notes: 'This is a test appointment created for reminder testing',
      // Don't set any reminder flags so they'll be sent
      reminderSent24h: false,
      reminderSent12h: false,
      reminderSent1h: false,
    });
    
    await testAppointment.save();
    
    return NextResponse.json({
      success: true,
      message: 'Test appointment created successfully',
      appointment: {
        id: testAppointment._id,
        doctorId: doctor._id,
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        date: testAppointment.date,
        time: testAppointment.time,
        reminderTime: new Date(oneHourFromNow).toLocaleString()
      }
    });
  } catch (error) {
    console.error('Error creating test appointment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 