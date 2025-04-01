import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Get appointments for a specific patient
export async function GET(req, context) {
  try {
    console.log("Patient appointments API called");
    await connectDB();
    
    const params = await context.params;
    const { id } = params;
    console.log("Patient ID:", id);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("Invalid patient ID format");
      return NextResponse.json({ error: 'Invalid patient ID format' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    console.log("Authorization header present:", !!authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No valid authorization header");
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token decoded, user ID:", decoded.id);
    } catch (error) {
      console.log("Token verification failed:", error.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const doctorUserId = decoded.id;
    
    // Check if the requester is a doctor
    const user = await User.findById(doctorUserId);
    console.log("User found:", !!user, "Role:", user?.role);
    if (!user || user.role !== 'doctor') {
      console.log("User is not a doctor");
      return NextResponse.json({ 
        error: 'Unauthorized: Only doctors can view patient appointments',
        details: { userId: doctorUserId, role: user?.role } 
      }, { status: 403 });
    }
    
    // Find the doctor document
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    console.log("Doctor profile found:", !!doctor);
    if (!doctor) {
      console.log("Doctor profile not found");
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    // Get the patient profile to determine the user ID
    const patientProfile = await UserProfile.findById(id);
    console.log("Patient profile found:", !!patientProfile);
    if (!patientProfile) {
      console.log("Patient not found");
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Verify that this patient is associated with the doctor
    const patientInList = doctor.patients && doctor.patients.some(patientId => 
      patientId.toString() === id
    );
    console.log("Patient in doctor's list:", patientInList);
    console.log("Doctor's patients:", doctor.patients ? doctor.patients.length : 0);
    
    if (!patientInList) {
      console.log("Patient not associated with this doctor");
      return NextResponse.json({ 
        error: 'Unauthorized: This patient is not associated with you',
        details: { doctorId: doctor._id, patientId: id }
      }, { status: 403 });
    }
    
    // Find appointments for this patient with this doctor
    const appointments = await Appointment.find({
      userId: patientProfile.userId,
      doctor: doctor._id
    }).sort({ date: -1, time: 1 }); // Most recent first
    
    console.log(`Found ${appointments.length} appointments`);
    
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment._id,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      notes: appointment.notes || '',
      createdAt: appointment.createdAt
    }));

    console.log("Successfully returning appointments data");
    return NextResponse.json({ appointments: formattedAppointments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Create a new appointment for a specific patient
export async function POST(req, context) {
  try {
    await connectDB();
    
    const params = await context.params;
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid patient ID format' }, { status: 400 });
    }

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

    const doctorUserId = decoded.id;
    
    // Check if the requester is a doctor
    const user = await User.findById(doctorUserId);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only doctors can schedule appointments' }, { status: 403 });
    }
    
    // Find the doctor document
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    // Get the patient profile to determine the user ID
    const patientProfile = await UserProfile.findById(id);
    if (!patientProfile) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Verify that this patient is associated with the doctor
    if (!doctor.patients.some(patientId => patientId.toString() === id)) {
      // If patient is not associated, add them
      console.log(`Automatically associating patient ${id} with doctor ${doctor._id}`);
      doctor.patients.push(id);
      await doctor.save();
    }
    
    // Get appointment data from request body
    const { date, time, notes } = await req.json();
    
    if (!date || !time) {
      return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
    }
    
    // Create the appointment
    const appointment = new Appointment({
      doctor: doctor._id,
      date,
      time,
      userId: patientProfile.userId, // This is the user ID, not the profile ID
      status: 'approved', // Auto-approve when doctor creates it
      notes: notes || ''
    });
    
    await appointment.save();
    
    return NextResponse.json({ 
      message: 'Appointment scheduled successfully',
      appointment: {
        id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status,
        notes: appointment.notes
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error scheduling patient appointment:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 