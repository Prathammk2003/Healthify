import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import TimeSlot from '@/models/TimeSlot';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  try {
    await connectDB();
    
    // Verify authentication
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
      return NextResponse.json({ error: 'Unauthorized: Only doctors can view their slots' }, { status: 403 });
    }

    // Get the doctor profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Get date from query parameters
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    
    // Validate date format
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json({ 
        error: 'Invalid or missing date parameter. Format should be YYYY-MM-DD' 
      }, { status: 400 });
    }
    
    // Get time slots for this date
    const slots = await TimeSlot.find({ doctor: doctor._id, date }).sort({ time: 1 });
    
    // Format slots for response
    const formattedSlots = slots.map(slot => ({
      id: slot._id.toString(),
      time: slot.time,
      duration: slot.duration,
      isBooked: slot.isBooked,
      appointmentId: slot.appointmentId ? slot.appointmentId.toString() : null,
      isRecurring: slot.isRecurring
    }));
    
    return NextResponse.json({
      date,
      doctorId: doctor._id.toString(),
      slots: formattedSlots,
      totalSlots: formattedSlots.length,
      availableSlots: formattedSlots.filter(slot => !slot.isBooked).length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 