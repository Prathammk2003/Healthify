import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils'; // Added validateJWT import

export async function GET(request) {
  try {
    await connectDB();
    console.log('Fetching doctor patients');

    // Validate authentication using our utility function
    const user = await validateJWT(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const userId = user._id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    // Find the doctor document for this user
    let doctor = await Doctor.findOne({ userId });
    
    // If no doctor profile exists and the user is a doctor, create one
    if (!doctor && user.role === 'doctor') {
      console.log(`Creating new doctor profile for user ${user._id}`);
      doctor = new Doctor({ 
        userId: user._id,
        specialization: 'General Physician',
        patients: []
      });
      await doctor.save();
    }
    
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    console.log(`Found doctor with ID: ${doctor._id} for user: ${userId}`);

    // Get all patients associated with this doctor
    // First get the patient profiles
    const patientProfiles = await UserProfile.find({
      _id: { $in: doctor.patients }
    }).lean();

    console.log(`Found ${patientProfiles.length} patient profiles for doctor`);

    // Get the corresponding user data for each patient
    const patientUserIds = patientProfiles.map(profile => profile.userId);
    const patientUsers = await User.find({
      _id: { $in: patientUserIds }
    }).select('name email phone').lean();

    console.log(`Found ${patientUsers.length} patient users for doctor`);

    // Combine the data
    const patients = patientUsers.map(user => {
      const profile = patientProfiles.find(p => p.userId.toString() === user._id.toString());
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        medicalHistory: profile?.medicalHistory || '',
        allergies: profile?.allergies || '',
        medications: profile?.medications || [],
        conditions: profile?.conditions || []
      };
    });

    return NextResponse.json({ 
      patients,
      message: `Retrieved ${patients.length} patients successfully`
    });
  } catch (error) {
    console.error('Error fetching doctor patients:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch patients',
      details: error.message,
      patients: []
    }, { status: 500 });
  }
}