import { connectDB } from '@/lib/db';
import PatientRequest from '@/models/PatientRequest';  
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import UserProfile from '@/models/UserProfile';
// Removed direct jwt import since we're using validateJWT
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { validateJWT } from '@/lib/auth-utils'; // Added validateJWT import

// GET endpoint to fetch pending patient requests for a doctor
export async function GET(req) {
  try {
    await connectDB();
    console.log('Fetching doctor patient requests');

    // Validate authentication using our utility function
    const user = await validateJWT(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the doctor profile for this user ID
    let doctorProfile = await Doctor.findOne({ userId: user._id });
    
    // If no doctor profile exists and the user is a doctor, create one
    if (!doctorProfile && user.role === 'doctor') {
      console.log(`Creating new doctor profile for user ${user._id}`);
      doctorProfile = new Doctor({ 
        userId: user._id,
        specialization: 'General Physician',
        patients: []
      });
      await doctorProfile.save();
    }
    
    if (!doctorProfile) {
      console.warn(`Doctor profile not found for user ID: ${user._id}`);
      return NextResponse.json({ 
        message: 'No doctor profile found',
        requests: [] 
      });
    }
    
    console.log(`Found doctor profile with ID: ${doctorProfile._id} for user: ${user._id}`);

    // Find all pending requests for this doctor
    const requests = await PatientRequest.find({ 
      doctorId: user._id,  // Using the user ID as the doctor ID
      status: 'pending'
    });

    console.log(`Found ${requests.length} pending patient requests`);

    return NextResponse.json({ 
      message: 'Requests retrieved successfully',
      requests 
    });
  } catch (error) {
    console.error('Get patient requests error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error.message
    }, { status: 500 });
  }
}

// PUT endpoint to approve/reject a patient request
export async function PUT(req) {
  try {
    await connectDB();

    // Validate authentication using our utility function
    const user = await validateJWT(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure the user is a doctor
    if (user.role !== 'doctor') {
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
    if (request.doctorId.toString() !== user._id.toString()) {
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
        let doctorProfile = await Doctor.findOne({ userId: user._id });
        
        // If no doctor profile exists, create one
        if (!doctorProfile) {
          console.log(`Creating doctor profile for user ID: ${user._id}`);
          doctorProfile = new Doctor({
            userId: user._id,
            specialization: 'General',
            patients: [],
            availability: []
          });
          await doctorProfile.save();
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