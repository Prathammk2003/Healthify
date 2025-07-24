import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth';

export async function PUT(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
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
    let doctor = await Doctor.findOne({ userId: decoded.id });
    
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