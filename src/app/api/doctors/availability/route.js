import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function PUT(req) {
  try {
    await connectDB();
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    // Check if the user is a doctor
    const user = await User.findById(userId);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only doctors can update availability' }, { status: 403 });
    }

    // Get the doctor profile
    let doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Get availability data from request body
    const { availability, slotDuration } = await req.json();
    
    // Validate availability data
    if (!Array.isArray(availability)) {
      return NextResponse.json({ error: 'Invalid availability data format' }, { status: 400 });
    }
    
    // Validate each availability entry
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // 24-hour format HH:MM
    
    for (const entry of availability) {
      if (!entry.day || !validDays.includes(entry.day.toLowerCase())) {
        return NextResponse.json({ 
          error: `Invalid day: ${entry.day}. Must be one of: ${validDays.join(', ')}` 
        }, { status: 400 });
      }
      
      if (!entry.startTime || !timeRegex.test(entry.startTime)) {
        return NextResponse.json({ 
          error: `Invalid start time for ${entry.day}: ${entry.startTime}. Must be in 24-hour format (HH:MM)` 
        }, { status: 400 });
      }
      
      if (!entry.endTime || !timeRegex.test(entry.endTime)) {
        return NextResponse.json({ 
          error: `Invalid end time for ${entry.day}: ${entry.endTime}. Must be in 24-hour format (HH:MM)` 
        }, { status: 400 });
      }
      
      // Check that start time is before end time
      const [startHour, startMinute] = entry.startTime.split(':').map(Number);
      const [endHour, endMinute] = entry.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (startMinutes >= endMinutes) {
        return NextResponse.json({ 
          error: `Invalid time range for ${entry.day}: Start time (${entry.startTime}) must be before end time (${entry.endTime})` 
        }, { status: 400 });
      }
    }
    
    // Update the doctor's availability
    doctor.availability = availability;
    await doctor.save();
    
    // Store slotDuration in database - this could be further developed
    // based on your system requirements
    
    return NextResponse.json({ 
      message: 'Availability updated successfully',
      availability: doctor.availability
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating doctor availability:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 