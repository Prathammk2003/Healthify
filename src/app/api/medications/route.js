import { connectDB } from '@/lib/db';
import MedicationReminder from '@/models/MedicationReminder';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyJwtToken } from '@/lib/auth';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

// Get all medication reminders for a user
export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
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

    // Fetch medications for the user
    const reminders = await MedicationReminder.find({ userId })
      .sort({ createdAt: -1 });

    return NextResponse.json({ medications: reminders });
  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 });
  }
}

// Create a new medication reminder
export async function POST(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received medication data:', body);
    
    await connectDB();

    // Format time to ensure 24-hour format (HH:MM)
    let formattedTime = body.time;
    if (body.time && (body.time.includes('AM') || body.time.includes('PM'))) {
      const timeObj = new Date(`2000-01-01 ${body.time}`);
      formattedTime = timeObj.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: false 
      });
    }
    
    // Format times array (for twice daily)
    let formattedTimes = [];
    if (body.times && body.times.length > 0) {
      formattedTimes = body.times.map(time => {
        if (time && (time.includes('AM') || time.includes('PM'))) {
          const timeObj = new Date(`2000-01-01 ${time}`);
          return timeObj.toLocaleTimeString("en-US", { 
            hour: "2-digit", 
            minute: "2-digit", 
            hour12: false 
          });
        }
        return time;
      });
    }
    
    console.log(`Original time: ${body.time}, Formatted time: ${formattedTime}`);
    console.log(`Original times: ${JSON.stringify(body.times)}, Formatted times: ${JSON.stringify(formattedTimes)}`);

    // Create reminder object with base fields
    const reminderData = {
      userId: mongoose.Types.ObjectId.isValid(decoded.id) ? decoded.id : mongoose.Types.ObjectId(decoded.id),
      medicationName: body.medicationName,
      dosage: body.dosage,
      frequency: body.frequency,
      notes: body.notes,
      enableVoiceCall: body.enableVoiceCall || false
    };

    // Add scheduling fields based on frequency
    if (body.frequency === 'Twice Daily' && body.times && body.times.length >= 2) {
      reminderData.times = formattedTimes;
      // Use first time as main time for backward compatibility
      reminderData.time = formattedTimes[0];
    } else if (body.frequency === 'Weekly' && body.daysOfWeek && body.daysOfWeek.length > 0) {
      reminderData.daysOfWeek = body.daysOfWeek;
      reminderData.time = formattedTime;
    } else if (body.frequency === 'Monthly' && body.daysOfMonth && body.daysOfMonth.length > 0) {
      reminderData.daysOfMonth = body.daysOfMonth;
      reminderData.time = formattedTime;
    } else {
      // Default for Daily and As Needed
      reminderData.time = formattedTime;
    }

    console.log('Creating medication with:', reminderData);

    const reminder = new MedicationReminder(reminderData);
    await reminder.save();

    // Create a notification for the new medication
    const notification = {
      userId: decoded.id,
      type: 'medication',
      messageContent: `New medication reminder added: ${reminder.medicationName} - ${reminder.dosage} at ${reminder.time}`,
      status: 'sent',
      channel: 'app',
    };

    await Notification.create(notification);

    return NextResponse.json({
      message: 'Medication reminder added successfully',
      medication: reminder,
    });
  } catch (error) {
    console.error('Error creating medication:', error);
    return NextResponse.json({ error: 'Failed to create medication' }, { status: 500 });
  }
}

// ✅ Update an existing medication reminder
export async function PUT(req) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    await connectDB();
    
    const body = await req.json();
    const { id, medicationName, dosage, time, times, frequency, daysOfWeek, daysOfMonth, notes, enableVoiceCall } = body;
    
    if (!id || !medicationName || !dosage || !frequency) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    // Format time if provided
    let formattedTime = time;
    if (time && (time.includes('AM') || time.includes('PM'))) {
      const timeObj = new Date(`2000-01-01 ${time}`);
      formattedTime = timeObj.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit", 
        hour12: false 
      });
    }
    
    // Format times array (for twice daily)
    let formattedTimes = [];
    if (times && times.length > 0) {
      formattedTimes = times.map(t => {
        if (t && (t.includes('AM') || t.includes('PM'))) {
          const timeObj = new Date(`2000-01-01 ${t}`);
          return timeObj.toLocaleTimeString("en-US", { 
            hour: "2-digit", 
            minute: "2-digit", 
            hour12: false 
          });
        }
        return t;
      });
    }
    
    // Create update object with base fields
    const updateData = { 
      medicationName, 
      dosage, 
      frequency, 
      notes,
      enableVoiceCall: enableVoiceCall || false 
    };

    // Add scheduling fields based on frequency
    if (frequency === 'Twice Daily' && times && times.length >= 2) {
      updateData.times = formattedTimes;
      // Use first time as main time for backward compatibility
      updateData.time = formattedTimes[0];
    } else if (frequency === 'Weekly' && daysOfWeek && daysOfWeek.length > 0) {
      updateData.daysOfWeek = daysOfWeek;
      updateData.time = formattedTime;
    } else if (frequency === 'Monthly' && daysOfMonth && daysOfMonth.length > 0) {
      updateData.daysOfMonth = daysOfMonth;
      updateData.time = formattedTime;
    } else {
      // Default for Daily and As Needed
      updateData.time = formattedTime;
    }

    const reminder = await MedicationReminder.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!reminder) {
      return NextResponse.json({ error: 'Medication reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Medication reminder updated!', reminder }, { status: 200 });
  } catch (error) {
    console.error('Error updating medication reminder:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ✅ Delete a medication reminder
export async function DELETE(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    await connectDB();
    
    // Get ID from query parameter
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const deletedReminder = await MedicationReminder.findByIdAndDelete(id);

    if (!deletedReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Medication reminder deleted!' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting medication reminder:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
