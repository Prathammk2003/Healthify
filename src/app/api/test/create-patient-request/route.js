import { connectDB } from '@/lib/db';
import PatientRequest from '@/models/PatientRequest';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    await connectDB();
    
    // This is a test endpoint so we'll make it simpler
    const { doctorId, patientId } = await req.json();
    
    if (!doctorId || !patientId) {
      return NextResponse.json({ 
        error: 'Both doctorId and patientId are required' 
      }, { status: 400 });
    }
    
    // Get patient details
    const patient = await User.findById(patientId);
    if (!patient) {
      return NextResponse.json({ 
        error: 'Patient not found' 
      }, { status: 404 });
    }
    
    // Get doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json({ 
        error: 'Doctor not found or user is not a doctor' 
      }, { status: 404 });
    }
    
    // Check if there's already a pending request
    const existingRequest = await PatientRequest.findOne({
      patientId,
      doctorId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return NextResponse.json({ 
        message: 'A pending request already exists',
        request: existingRequest
      }, { status: 200 });
    }
    
    // Create a new request
    const newRequest = new PatientRequest({
      patientId,
      doctorId,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: 'Test Phone Number',
      reason: 'Test patient request created via API',
      status: 'pending'
    });
    
    await newRequest.save();
    
    return NextResponse.json({ 
      message: 'Test patient request created successfully',
      request: newRequest
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating test patient request:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 