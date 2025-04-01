import { connectDB } from '@/lib/db';
import UserProfile from '@/models/UserProfile';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import Appointment from '@/models/Appointment';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectDB();

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
    
    // Check if the user is a doctor
    const user = await User.findById(userId);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only doctors can view patients' }, { status: 403 });
    }
    
    // Find the doctor document to get associated patients
    let doctor = await Doctor.findOne({ userId });
    
    // Create doctor document if it doesn't exist
    if (!doctor) {
      console.log(`Creating doctor profile for user ID: ${userId}`);
      doctor = new Doctor({
        userId,
        specialization: 'General',
        patients: [],
        availability: []
      });
      await doctor.save();
    }
    
    // Get query parameter for showing only patients with appointments
    const url = new URL(req.url);
    const showOnlyWithAppointments = url.searchParams.get('withAppointments') !== 'false'; // Default to true
    
    let patientIds = [];
    
    if (showOnlyWithAppointments) {
      // Find all appointments associated with this doctor
      const appointments = await Appointment.find({ doctor: doctor._id });
      
      // Get unique patient IDs from appointments
      const patientUserIds = [...new Set(appointments.map(app => app.userId.toString()))];
      
      if (patientUserIds.length === 0) {
        // No appointments found
        return NextResponse.json({ patients: [] }, { status: 200 });
      }
      
      // Find patient profiles for these user IDs
      const patientProfiles = await UserProfile.find({ userId: { $in: patientUserIds } });
      patientIds = patientProfiles.map(profile => profile._id);
    } else {
      // Use all patients associated with the doctor
      patientIds = doctor.patients || [];
    }
    
    if (patientIds.length === 0) {
      // No patients found
      return NextResponse.json({ patients: [] }, { status: 200 });
    }
    
    // Fetch patient profiles
    const patients = await UserProfile.find({ 
      _id: { $in: patientIds } 
    }).populate('userId', 'name email');
    
    // Map patient data to include user information
    const mappedPatients = patients.map(patient => {
      return {
        _id: patient._id,
        name: patient.userId?.name || `${patient.firstName} ${patient.lastName}`,
        email: patient.userId?.email || 'No email provided',
        phone: patient.contactNumber,
        address: patient.address,
        medicalHistory: patient.medicalHistory,
        dateOfBirth: patient.dateOfBirth,
      };
    });

    return NextResponse.json({ patients: mappedPatients }, { status: 200 });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();

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
    
    // Find the doctor document
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    const { patientId, medicalHistory } = await req.json();
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Verify that this patient belongs to the doctor
    if (!doctor.patients.includes(patientId)) {
      return NextResponse.json({ error: 'Unauthorized: Patient not associated with this doctor' }, { status: 403 });
    }

    const patient = await UserProfile.findByIdAndUpdate(
      patientId,
      { $set: { medicalHistory: medicalHistory || [] } },
      { new: true }
    );

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Patient updated successfully', patient }, { status: 200 });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

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
    
    // Check if the user is a doctor
    const user = await User.findById(doctorUserId);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only doctors can add patients' }, { status: 403 });
    }
    
    // Find the doctor document
    let doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      // Create doctor profile if it doesn't exist
      doctor = new Doctor({
        userId: doctorUserId,
        specialization: 'General',
        patients: [],
        availability: []
      });
      await doctor.save();
    }
    
    // Get patient data from request body
    const { 
      name, 
      email, 
      phone, 
      address, 
      dateOfBirth, 
      medicalHistory = [],
      allergies = [],
      medications = []
    } = await req.json();
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 });
    }
    
    // Check if patient with this email already exists
    let existingPatientUser = null;
    if (email) {
      existingPatientUser = await User.findOne({ email });
    }
    
    let userId;
    
    // If no existing user, create a new one
    if (!existingPatientUser && email) {
      // Generate a random password for the new user
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const newUser = new User({
        name,
        email,
        password: tempPassword, // This should be hashed in a real application
        role: 'patient'
      });
      
      await newUser.save();
      userId = newUser._id;
    } else if (existingPatientUser) {
      userId = existingPatientUser._id;
    }
    
    // Create or find the patient profile
    let patientProfile;
    
    if (userId) {
      // Check if profile already exists
      patientProfile = await UserProfile.findOne({ userId });
      
      if (!patientProfile) {
        // Create new profile
        patientProfile = new UserProfile({
          userId,
          firstName: name.split(' ')[0],
          lastName: name.split(' ').slice(1).join(' '),
          contactNumber: phone,
          address,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          medicalHistory,
          allergies,
          medications
        });
        
        await patientProfile.save();
      } else {
        // Update existing profile
        patientProfile.contactNumber = phone || patientProfile.contactNumber;
        patientProfile.address = address || patientProfile.address;
        if (dateOfBirth) patientProfile.dateOfBirth = new Date(dateOfBirth);
        if (medicalHistory.length > 0) patientProfile.medicalHistory = medicalHistory;
        if (allergies.length > 0) patientProfile.allergies = allergies;
        if (medications.length > 0) patientProfile.medications = medications;
        
        await patientProfile.save();
      }
    } else {
      // Create profile without user association
      patientProfile = new UserProfile({
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        contactNumber: phone,
        address,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        medicalHistory,
        allergies,
        medications
      });
      
      await patientProfile.save();
    }
    
    // Associate patient with doctor if not already associated
    if (!doctor.patients.includes(patientProfile._id)) {
      doctor.patients.push(patientProfile._id);
      await doctor.save();
    }
    
    // Prepare response
    const patientData = {
      _id: patientProfile._id,
      name: userId ? (await User.findById(userId)).name : `${patientProfile.firstName} ${patientProfile.lastName}`,
      email: userId ? (await User.findById(userId)).email : 'No email provided',
      phone: patientProfile.contactNumber,
      address: patientProfile.address,
      dateOfBirth: patientProfile.dateOfBirth,
      medicalHistory: patientProfile.medicalHistory,
      allergies: patientProfile.allergies,
      medications: patientProfile.medications
    };
    
    return NextResponse.json({ 
      message: 'Patient added successfully', 
      patient: patientData 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding patient:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}