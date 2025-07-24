import { connectDB } from '@/lib/db';
import { isTimeSlotAvailable } from '@/utils/slotManager';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectDB();
    
    // Get query parameters
    const url = new URL(req.url);
    const doctorId = url.searchParams.get('doctorId');
    const date = url.searchParams.get('date');
    const time = url.searchParams.get('time');
    
    // Validate inputs
    if (!doctorId || !date || !time) {
      return NextResponse.json({ 
        error: 'Missing required parameters: doctorId, date, and time are required' 
      }, { status: 400 });
    }
    
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({ error: 'Invalid doctor ID format' }, { status: 400 });
    }
    
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json({ 
        error: 'Invalid date format. Format should be YYYY-MM-DD' 
      }, { status: 400 });
    }
    
    if (!time.match(/^\d{2}:\d{2}$/)) {
      return NextResponse.json({ 
        error: 'Invalid time format. Format should be HH:MM (24-hour)' 
      }, { status: 400 });
    }
    
    // Check if the time slot is available
    const isAvailable = await isTimeSlotAvailable(doctorId, date, time);
    
    return NextResponse.json({ 
      isAvailable,
      doctorId,
      date,
      time
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking time slot availability:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 