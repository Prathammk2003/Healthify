import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MedicationReminder from '@/models/MedicationReminder';
import Notification from '@/models/Notification';
import { verifyJwtToken } from '@/lib/auth';
import mongoose from 'mongoose';

// Update a medication reminder
export async function PUT(request, { params }) {
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

    // Ensure params is awaited if it's a Promise
    const { id } = await params;
    const body = await request.json();

    await connectDB();

    // Convert userId to valid ObjectId if needed
    const userId = mongoose.Types.ObjectId.isValid(decoded.id) 
      ? decoded.id 
      : mongoose.Types.ObjectId(decoded.id);

    // Find and update medication reminder
    const reminder = await MedicationReminder.findOneAndUpdate(
      { _id: id, userId },
      { 
        medicationName: body.medicationName,
        dosage: body.dosage,
        frequency: body.frequency,
        time: body.time,
        notes: body.notes,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!reminder) {
      return NextResponse.json({ error: 'Medication reminder not found' }, { status: 404 });
    }

    // Create a notification for the updated medication
    const notification = {
      userId,
      type: 'medication',
      messageContent: `Medication reminder updated: ${reminder.medicationName} - ${reminder.dosage} at ${reminder.time}`,
      status: 'sent',
      channel: 'app',
    };

    await Notification.create(notification);

    return NextResponse.json({
      message: 'Medication reminder updated successfully',
      medication: reminder,
    });
  } catch (error) {
    console.error('Error updating medication reminder:', error);
    return NextResponse.json({ error: 'Failed to update medication reminder' }, { status: 500 });
  }
}

// Delete a medication reminder
export async function DELETE(request, { params }) {
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
    
    // Ensure params is awaited if it's a Promise
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing medication ID' }, { status: 400 });
    }
    
    await connectDB();

    // Convert userId to valid ObjectId if needed
    const userId = mongoose.Types.ObjectId.isValid(decoded.id) 
      ? decoded.id 
      : mongoose.Types.ObjectId(decoded.id);

    // Find and delete medication reminder
    const reminder = await MedicationReminder.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!reminder) {
      return NextResponse.json({ error: 'Medication reminder not found' }, { status: 404 });
    }

    // Create a notification for the deleted medication
    const notification = {
      userId,
      type: 'medication',
      messageContent: `Medication reminder deleted: ${reminder.medicationName}`,
      status: 'sent',
      channel: 'app',
    };

    await Notification.create(notification);

    return NextResponse.json({
      message: 'Medication reminder deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting medication reminder:', error);
    return NextResponse.json({ error: 'Failed to delete medication reminder' }, { status: 500 });
  }
} 