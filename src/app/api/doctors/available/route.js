import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    console.log('Connected to database');

    // First check if we have any users who are doctors
    const doctorUsers = await User.find({ role: 'doctor' }).lean();
    console.log('Found doctor users:', doctorUsers.length);

    // Check if we have any doctor records
    const doctorRecords = await Doctor.find().lean();
    console.log('Found doctor records:', doctorRecords.length);

    // If we have doctor users but no doctor records, create them
    if (doctorUsers.length > 0 && doctorRecords.length === 0) {
      console.log('Creating missing doctor records for existing doctor users');
      
      for (const doctorUser of doctorUsers) {
        // Check if a doctor record already exists for this user
        const existingDoctor = await Doctor.findOne({ userId: doctorUser._id });
        
        if (!existingDoctor) {
          console.log(`Creating doctor record for user: ${doctorUser.name} (${doctorUser._id})`);
          const newDoctor = new Doctor({ userId: doctorUser._id });
          await newDoctor.save();
        }
      }
    }

    // Find all doctors with populated user data
    const doctors = await Doctor.find()
      .populate({
        path: 'userId',
        select: 'name email',
        options: { lean: true }
      })
      .lean();

    console.log('Found doctors with populated user data:', doctors.length);

    // Create formatted list of doctors with proper error handling
    const formattedDoctors = [];
    
    for (const doctor of doctors) {
      try {
        // Only add doctors with valid user data
        if (doctor.userId) {
          formattedDoctors.push({
            id: doctor._id.toString(),
            name: doctor.userId.name || 'Unknown Doctor',
            email: doctor.userId.email || 'No email available',
            specialization: doctor.specialization || 'General Physician',
            secondarySpecializations: doctor.secondarySpecializations || [],
            qualifications: doctor.qualifications || '',
            yearsOfExperience: doctor.yearsOfExperience || 0
          });
        } else {
          console.log('Skipping doctor with missing user data:', doctor._id);
        }
      } catch (err) {
        console.error('Error processing doctor:', err);
      }
    }

    console.log('Formatted doctors for response:', formattedDoctors);
    return NextResponse.json({ doctors: formattedDoctors }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/doctors/available:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
} 