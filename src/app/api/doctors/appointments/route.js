import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import Notification from '@/models/Notification';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Get all appointments for a doctor
export async function GET(request) {
  try {
    await connectDB();
    console.log('Fetching doctor appointments');

    const authHeader = request.headers.get('authorization');
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

    // Find the doctor document for this user
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    console.log(`Found doctor with ID: ${doctor._id} for user: ${userId}`);

    // Get all appointments for this doctor - include pending and pending_update
    const appointments = await Appointment.find({ 
      doctor: doctor._id 
    })
    .populate({
      path: 'userId',
      select: 'name email',
      options: { lean: true }
    })
    .sort({ date: 1, time: 1 });

    console.log(`Found ${appointments.length} appointments for doctor`);

    // Format appointments to handle missing user data
    const formattedAppointments = appointments.map(appointment => {
      // Convert the Mongoose document to a plain object
      const plainAppointment = appointment.toObject ? appointment.toObject() : appointment;
      
      // Ensure the userId object is properly formatted
      return {
        ...plainAppointment,
        userId: {
          name: plainAppointment.userId?.name || 'Unknown Patient',
          email: plainAppointment.userId?.email || 'No email available',
          _id: plainAppointment.userId?._id || plainAppointment.userId
        }
      };
    });

    return NextResponse.json({ 
      appointments: formattedAppointments,
      message: `Retrieved ${appointments.length} appointments successfully`
    });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch appointments',
      details: error.message 
    }, { status: 500 });
  }
}

// Update appointment status
export async function PUT(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
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

    // Get request body
    const { appointmentId, status, notes } = await request.json();
    if (!appointmentId || !status) {
      return NextResponse.json({ error: 'Appointment ID and status are required' }, { status: 400 });
    }

    // Find the doctor document for this user
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Get the appointment before update
    const originalAppointment = await Appointment.findOne({ 
      _id: appointmentId, 
      doctor: doctor._id 
    });

    if (!originalAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check if this is a response to a reschedule request
    const isRespondingToReschedule = originalAppointment.status === 'pending_update';
    
    // Prepare update data
    let updateData = { status, notes };

    // If approving a reschedule request
    if (isRespondingToReschedule && status === 'approved') {
      // Keep the new date and time as they are (already in the appointment)
      console.log('Approving reschedule request');
    } 
    // If rejecting a reschedule request
    else if (isRespondingToReschedule && status === 'rejected') {
      // Revert to the previous date and time
      updateData.date = originalAppointment.previousDate;
      updateData.time = originalAppointment.previousTime;
      console.log('Rejecting reschedule request, reverting to original date/time');
    }

    // Find and update the appointment
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, doctor: doctor._id },
      updateData,
      { new: true }
    );

    // Create notification for the patient
    let notificationMessage = '';
    let notificationMetadata = {
      appointmentId: appointmentId,
      date: appointment.date,
      time: appointment.time,
    };

    // Get doctor's name for notification
    const doctorUser = await User.findById(userId, 'name');
    const doctorName = doctorUser ? doctorUser.name : 'Your doctor';

    if (isRespondingToReschedule) {
      if (status === 'approved') {
        notificationMessage = `${doctorName} has approved your request to reschedule your appointment to ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'reschedule_approved';
      } else if (status === 'rejected') {
        notificationMessage = `${doctorName} has rejected your request to reschedule. Your appointment remains on ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'reschedule_rejected';
      }
    } else {
      // Standard approval/rejection notifications
      if (status === 'approved') {
        notificationMessage = `${doctorName} has approved your appointment on ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'appointment_approved';
      } else if (status === 'rejected') {
        notificationMessage = `${doctorName} has rejected your appointment request for ${appointment.date} at ${appointment.time}.`;
        notificationMetadata.action = 'appointment_rejected';
      }
    }

    // Create notification if we have a message
    if (notificationMessage) {
      try {
        await Notification.create({
          userId: appointment.userId,
          type: 'appointment',
          messageContent: notificationMessage,
          referenceId: appointmentId,
          refModel: 'Appointment',
          metadata: {
            ...notificationMetadata,
            important: true
          }
        });
        console.log(`Created notification for patient about appointment status update`);
      } catch (error) {
        console.error('Error creating notification:', error);
        // Don't fail the update if notification creation fails
      }
    }

    // If the doctor approved the appointment, associate the patient with the doctor
    if (status === 'approved') {
      try {
        // Get patient profile using userId from appointment
        const patientProfile = await UserProfile.findOne({ userId: appointment.userId });
        
        if (patientProfile) {
          // Check if patient is already associated with this doctor
          if (!doctor.patients.some(patientId => patientId.toString() === patientProfile._id.toString())) {
            // Add patient to doctor's patient list
            doctor.patients.push(patientProfile._id);
            await doctor.save();
            console.log(`Associated patient ${patientProfile._id} with doctor ${doctor._id} after approval`);
          }
        }
      } catch (error) {
        console.error('Error associating patient with doctor:', error);
        // Don't fail the appointment update if association fails
      }
    }

    return NextResponse.json({ 
      message: `Appointment ${status} successfully`,
      appointment 
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
} 