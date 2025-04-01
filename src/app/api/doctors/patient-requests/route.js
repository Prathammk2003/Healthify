import { connectDB } from '@/lib/db';
import PatientRequest from '@/models/PatientRequest';  
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import UserProfile from '@/models/UserProfile';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET endpoint to fetch pending patient requests for a doctor
export async function GET(req) {
  try {
    await connectDB();

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract and verify the token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure the user is a doctor
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized - doctors only' }, { status: 403 });
    }

    // Find all pending requests for this doctor
    const requests = await PatientRequest.find({ 
      doctorId: decoded.id,
      status: 'pending'
    });

    return NextResponse.json({ 
      message: 'Requests retrieved successfully',
      requests 
    });
  } catch (error) {
    console.error('Get patient requests error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT endpoint to approve/reject a patient request
export async function PUT(req) {
  try {
    await connectDB();

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract and verify the token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure the user is a doctor
    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Unauthorized - doctors only' }, { status: 403 });
    }

    // Get request data
    const { requestId, status } = await req.json();
    
    if (!requestId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Find the request
    const request = await PatientRequest.findById(requestId);
    
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    // Make sure the doctor owns this request
    if (request.doctorId.toString() !== decoded.id) {
      return NextResponse.json({ error: 'Not authorized to update this request' }, { status: 403 });
    }

    // Update the request status
    request.status = status;
    await request.save();

    // If approved, update the patient-doctor relationship
    if (status === 'approved') {
      console.log(`Approving patient request: ${requestId}, patientId: ${request.patientId}`);
      
      try {
        // Find or create doctor profile
        let doctorProfile = await Doctor.findOne({ userId: decoded.id });
        
        if (!doctorProfile) {
          console.log(`Creating doctor profile for user ID: ${decoded.id}`);
          doctorProfile = new Doctor({
            userId: decoded.id,
            specialization: 'General',
            patients: [],
            availability: []
          });
        }
        
        // Find patient profile
        const patientProfile = await UserProfile.findOne({ userId: request.patientId });
        
        if (!patientProfile) {
          console.log(`Patient profile not found for user ID: ${request.patientId}`);
          return NextResponse.json({ 
            message: `Request ${status} successfully, but patient profile not found`,
            request 
          });
        }
        
        // Update doctor's patients list if not already included
        if (!doctorProfile.patients.includes(patientProfile._id)) {
          doctorProfile.patients.push(patientProfile._id);
          await doctorProfile.save();
          console.log(`Added patient ${patientProfile._id} to doctor's patients list`);
        }
        
        // Update patient's doctor reference
        patientProfile.doctor = doctorProfile._id;
        await patientProfile.save();
        console.log(`Updated patient ${patientProfile._id} with doctor reference ${doctorProfile._id}`);
        
      } catch (relationshipError) {
        console.error('Error updating patient-doctor relationship:', relationshipError);
        // We still return success for the request status update, but log the relationship error
      }
    }

    return NextResponse.json({
      message: `Request ${status} successfully`,
      request
    });
  } catch (error) {
    console.error('Update patient request error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 