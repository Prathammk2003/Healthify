import { connectDB } from '@/lib/db';
import User from '@/models/User';
import PatientRequest from '@/models/PatientRequest';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// POST endpoint for patients to request a specific doctor
export async function POST(req) {
  try {
    await connectDB();
    console.log('Connected to database - creating patient request');

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
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Get patient user ID from token
    const patientId = decoded.id;
    console.log(`Processing request from patient: ${patientId}`);

    // Get request data
    const { doctorId, reason } = await req.json();
    
    if (!doctorId) {
      console.error('Missing doctor ID in request');
      return NextResponse.json({ error: 'Doctor ID is required' }, { status: 400 });
    }

    // Verify both users exist
    const [patient, doctor] = await Promise.all([
      User.findById(patientId),
      User.findById(doctorId)
    ]);

    if (!patient) {
      console.error(`Patient with ID ${patientId} not found`);
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    if (!doctor) {
      console.error(`Doctor with ID ${doctorId} not found`);
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    if (doctor.role !== 'doctor') {
      console.error(`User ${doctorId} is not a doctor`);
      return NextResponse.json({ error: 'Selected user is not a doctor' }, { status: 400 });
    }

    // Check if a request already exists
    const existingRequest = await PatientRequest.findOne({
      patientId,
      doctorId,
      status: 'pending'
    });

    if (existingRequest) {
      console.log(`Request already exists between patient ${patientId} and doctor ${doctorId}`);
      return NextResponse.json({ 
        message: 'You already have a pending request with this doctor',
        request: existingRequest
      });
    }

    // Create the request
    const patientRequest = new PatientRequest({
      patientId,
      doctorId,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone || '',
      reason: reason || 'General consultation',
      status: 'pending'
    });

    await patientRequest.save();
    console.log(`Patient request created: ${patientRequest._id}`);

    return NextResponse.json({
      message: 'Request sent successfully to the doctor',
      request: patientRequest
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating patient request:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

// GET endpoint to check request status
export async function GET(req) {
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

    // Get patient ID from token
    const patientId = decoded.id;
    
    // Get doctor ID from query
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');

    // If doctorId provided, get specific request
    let query = { patientId };
    if (doctorId) {
      query.doctorId = doctorId;
    }

    // Find requests
    const requests = await PatientRequest.find(query).sort({ createdAt: -1 });

    return NextResponse.json({
      message: 'Requests retrieved successfully',
      requests
    });

  } catch (error) {
    console.error('Error fetching patient requests:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 