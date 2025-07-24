import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import { getAvailableTimeSlots } from '@/utils/slotManager';
import mongoose from 'mongoose';

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { id } = params;
    
    // Validate doctor ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid doctor ID format' }, { status: 400 });
    }
    
    // Get the date from query parameters
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json({ 
        error: 'Invalid or missing date parameter. Format should be YYYY-MM-DD' 
      }, { status: 400 });
    }
    
    // Verify doctor exists
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    
    // Get available time slots for this doctor on this date
    const slots = await getAvailableTimeSlots(id, date);
    
    // Filter to available slots only
    const availableSlots = slots.filter(slot => !slot.isBooked);
    
    // Format the response
    const formattedSlots = availableSlots.map(slot => ({
      id: slot._id.toString(),
      time: slot.time,
      duration: slot.duration,
      isRecurring: slot.isRecurring
    }));
    
    return NextResponse.json({ 
      date,
      doctorId: id,
      doctorName: doctor.userId ? doctor.userId.name : 'Doctor', 
      availableSlots: formattedSlots,
      totalAvailable: formattedSlots.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 