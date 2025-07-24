import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import TimeSlot from '@/models/TimeSlot';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export async function POST(req) {
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
      return NextResponse.json({ error: 'Unauthorized: Only doctors can create time slots' }, { status: 403 });
    }

    // Get the doctor profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Get request data
    const { date, slots, overrideExisting = false } = await req.json();
    
    // Validate date format
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json({ error: 'Invalid date format. Format should be YYYY-MM-DD' }, { status: 400 });
    }
    
    // Validate slots array
    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({ error: 'Invalid slots data. Must provide an array of time slots' }, { status: 400 });
    }
    
    // If overrideExisting is true, delete all existing slots for this date
    if (overrideExisting) {
      await TimeSlot.deleteMany({ doctor: doctor._id, date, isBooked: false });
    }
    
    // Check for existing booked slots to avoid conflicts
    const existingBookedSlots = await TimeSlot.find({ 
      doctor: doctor._id, 
      date, 
      isBooked: true 
    });
    
    const bookedTimes = existingBookedSlots.map(slot => slot.time);
    
    // Filter out slots that are already booked
    const validSlots = slots.filter(slot => !bookedTimes.includes(slot.time));
    
    // Validate time format for all slots
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // 24-hour format HH:MM
    
    const slotsToCreate = validSlots.filter(slot => {
      // Validate time format
      if (!slot.time || !timeRegex.test(slot.time)) {
        return false;
      }
      
      // Validate duration
      if (!slot.duration || slot.duration < 15) {
        return false;
      }
      
      return true;
    }).map(slot => ({
      doctor: doctor._id,
      date,
      time: slot.time,
      duration: slot.duration,
      isBooked: false,
      isRecurring: false
    }));
    
    // Check if we have any valid slots to create
    if (slotsToCreate.length === 0) {
      return NextResponse.json({ 
        error: 'No valid slots to create. All slots are either invalid or already booked.' 
      }, { status: 400 });
    }
    
    // Create the time slots
    try {
      await TimeSlot.insertMany(slotsToCreate, { ordered: false });
    } catch (error) {
      // Handle duplicate keys (some slots might already exist)
      if (error.code === 11000) {
        console.log('Some slots already exist, continuing with non-duplicates');
      } else {
        throw error;
      }
    }
    
    // Get the created/existing slots to return
    const allSlots = await TimeSlot.find({ doctor: doctor._id, date }).sort({ time: 1 });
    
    return NextResponse.json({
      message: 'Time slots created successfully',
      count: slotsToCreate.length,
      totalSlots: allSlots.length,
      slots: allSlots.map(slot => ({
        id: slot._id.toString(),
        time: slot.time,
        duration: slot.duration,
        isBooked: slot.isBooked,
        date: slot.date
      }))
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating time slots:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 