import { connectDB } from '@/lib/db';
import UserProfile from '@/models/UserProfile';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export async function GET(req, context) {
  try {
    console.log("Patient details API called");
    await connectDB();
    console.log("Connected to DB");
    
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

    const userId = decoded.id;
    
    // Check if the user is a doctor
    const user = await User.findById(userId);
    console.log("User found:", !!user, "Role:", user?.role);
    if (!user || user.role !== 'doctor') {
      console.log("User is not a doctor");
      return NextResponse.json({ 
        error: 'Unauthorized: Only doctors can view patient details',
        details: { userId, role: user?.role } 
      }, { status: 403 });
    }
    
    // Find the doctor document to verify patient association
    const doctor = await Doctor.findOne({ userId });
    console.log("Doctor profile found:", !!doctor);
    if (!doctor) {
      console.log("Doctor profile not found");
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    // Verify that this patient belongs to the doctor
    const patientInList = doctor.patients && doctor.patients.some(patientId => 
      patientId.toString() === id
    );
    console.log("Patient in doctor's list:", patientInList);
    console.log("Doctor's patients:", doctor.patients ? doctor.patients.length : 0);
    
    if (!patientInList) {
      console.log("Patient not associated with this doctor");
      return NextResponse.json({ 
        error: 'Unauthorized: Patient not associated with this doctor',
        details: { doctorId: doctor._id, patientId: id }
      }, { status: 403 });
    }
    
    // Fetch patient details
    const patient = await UserProfile.findById(id).populate('userId', 'name email');
    console.log("Patient found:", !!patient);
    
    if (!patient) {
      console.log("Patient not found");
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Map patient data to include user information
    const patientData = {
      _id: patient._id,
      name: patient.userId?.name || `${patient.firstName} ${patient.lastName}`,
      email: patient.userId?.email || 'No email provided',
      phone: patient.contactNumber,
      address: patient.address,
      medicalHistory: patient.medicalHistory,
      dateOfBirth: patient.dateOfBirth,
      allergies: patient.allergies || [],
      medications: patient.medications || []
    };

    console.log("Successfully returning patient data");
    return NextResponse.json({ patient: patientData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function PUT(req, context) {
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

    const userId = decoded.id;
    
    // Check if the user is a doctor
    const user = await User.findById(userId);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized: Only doctors can update patient details' }, { status: 403 });
    }
    
    // Find the doctor document
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    // Verify that this patient belongs to the doctor
    if (!doctor.patients.includes(id)) {
      return NextResponse.json({ error: 'Unauthorized: Patient not associated with this doctor' }, { status: 403 });
    }

    const updateData = await req.json();
    const allowedFields = ['medicalHistory', 'allergies', 'medications', 'contactNumber', 'address'];
    
    // Filter out any fields that are not allowed to be updated
    const filteredUpdateData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});
    
    if (Object.keys(filteredUpdateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const patient = await UserProfile.findByIdAndUpdate(
      id,
      { $set: filteredUpdateData },
      { new: true }
    ).populate('userId', 'name email');

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Map updated patient data
    const patientData = {
      _id: patient._id,
      name: patient.userId?.name || `${patient.firstName} ${patient.lastName}`,
      email: patient.userId?.email || 'No email provided',
      phone: patient.contactNumber,
      address: patient.address,
      medicalHistory: patient.medicalHistory,
      dateOfBirth: patient.dateOfBirth,
      allergies: patient.allergies || [],
      medications: patient.medications || []
    };

    return NextResponse.json({ 
      message: 'Patient updated successfully', 
      patient: patientData 
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating patient details:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 