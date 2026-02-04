import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils'; // Added validateJWT import

export async function GET(request) {
  try {
    // Validate authentication using our utility function
    const user = await validateJWT(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();
    
    // Find doctor by userId
    let doctor = await Doctor.findOne({ userId: user._id });
    
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
    
    return NextResponse.json({ 
      doctor: {
        _id: doctor._id,
        userId: doctor.userId,
        specialization: doctor.specialization,
        secondarySpecializations: doctor.secondarySpecializations,
        qualifications: doctor.qualifications,
        yearsOfExperience: doctor.yearsOfExperience,
        bio: doctor.bio,
        patients: doctor.patients
      }
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    // Validate authentication using our utility function
    const user = await validateJWT(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();
    
    // Get profile data from request
    const { specialization, secondarySpecializations, qualifications, yearsOfExperience, bio } = await request.json();
    
    // Validate data
    if (!specialization) {
      return NextResponse.json({ error: 'Primary specialization is required' }, { status: 400 });
    }
    
    // Find doctor by userId
    let doctor = await Doctor.findOne({ userId: user._id });
    
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }
    
    // Update doctor profile
    doctor.specialization = specialization;
    doctor.secondarySpecializations = secondarySpecializations || [];
    doctor.qualifications = qualifications || '';
    doctor.yearsOfExperience = yearsOfExperience || 0;
    doctor.bio = bio || '';
    
    await doctor.save();
    
    return NextResponse.json({ 
      message: 'Profile updated successfully',
      doctor: {
        specialization: doctor.specialization,
        secondarySpecializations: doctor.secondarySpecializations,
        qualifications: doctor.qualifications,
        yearsOfExperience: doctor.yearsOfExperience,
        bio: doctor.bio
      }
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}