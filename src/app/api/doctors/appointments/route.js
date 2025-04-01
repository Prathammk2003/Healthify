import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Get all appointments for a doctor
export async function GET(request) {
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

    // Find the doctor document for this user
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Get all appointments for this doctor
    const appointments = await Appointment.find({ doctor: doctor._id })
      .populate({
        path: 'userId',
        select: 'name email',
        options: { lean: true }
      })
      .sort({ date: 1, time: 1 });

    // Format appointments to handle missing user data
    const formattedAppointments = appointments.map(appointment => ({
      ...appointment,
      userId: {
        name: appointment.userId?.name || 'Unknown Patient',
        email: appointment.userId?.email || 'No email available'
      }
    }));

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
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

    // Find and update the appointment
    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, doctor: doctor._id },
      { status, notes },
      { new: true }
    );

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
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