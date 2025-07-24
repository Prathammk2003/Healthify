import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import TimeSlot from '@/models/TimeSlot';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export async function DELETE(req, { params }) {
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
      return NextResponse.json({ error: 'Unauthorized: Only doctors can delete time slots' }, { status: 403 });
    }

    // Get the doctor profile
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    // Get slot ID from URL
    const { id } = params;
    
    // Validate slot ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid slot ID' }, { status: 400 });
    }
    
    // Find the slot
    const slot = await TimeSlot.findById(id);
    
    if (!slot) {
      return NextResponse.json({ error: 'Time slot not found' }, { status: 404 });
    }
    
    // Check if this slot belongs to the doctor
    if (slot.doctor.toString() !== doctor._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized: This slot does not belong to you' }, { status: 403 });
    }
    
    // Check if the slot is already booked
    if (slot.isBooked) {
      return NextResponse.json({ 
        error: 'Cannot delete a booked slot. Cancel the appointment first.' 
      }, { status: 400 });
    }
    
    // Delete the slot
    await TimeSlot.findByIdAndDelete(id);
    
    return NextResponse.json({
      message: 'Time slot deleted successfully',
      slotId: id
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 