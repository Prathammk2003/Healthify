import { connectDB } from '@/lib/db';
import MedicationReminder from '@/models/MedicationReminder';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth';
import { sendMedicationReminder } from '@/services/notificationService';
import mongoose from 'mongoose';

// Get medication reminders for the current user
export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Convert userId to valid ObjectId if needed
    const userId = mongoose.Types.ObjectId.isValid(decoded.id) 
      ? decoded.id 
      : mongoose.Types.ObjectId(decoded.id);

    // Find any pending reminders for the user
    const reminders = await MedicationReminder.find({ 
      userId, 
      status: 'Pending' 
    }).sort({ time: 1 });
    
    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('Error fetching medication reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch medication reminders' }, { status: 500 });
  }
}

// Process medication reminder manually
export async function POST(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();
    
    const body = await request.json();
    const { reminderId } = body;
    
    if (!reminderId) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }
    
    // Find the reminder
    const reminder = await MedicationReminder.findById(reminderId);
    
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    
    // Get user profile
    const userProfile = await UserProfile.findOne({ userId: reminder.userId });
    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Send the reminder
    const result = await sendMedicationReminder(reminder, userProfile);
    
    // Update reminder status
    if (result.success) {
      reminder.status = 'Taken';
      await reminder.save();
      
      return NextResponse.json({ 
        message: 'Reminder processed successfully', 
        success: true 
      });
    } else {
      return NextResponse.json({ 
        message: 'Failed to process reminder', 
        error: result.error,
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing medication reminder:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 