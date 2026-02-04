import { connectDB } from '@/lib/db';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
// Removed direct jwt import since we're using validateJWT
import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils'; // Added validateJWT import

export async function POST(req) {
  try {
    await connectDB();

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role: 'doctor' });
    await newUser.save();

    const newDoctor = new Doctor({ userId: newUser._id });
    await newDoctor.save();

    return NextResponse.json({ message: 'Doctor registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Register Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectDB();

    // Validate authentication using our utility function
    const user = await validateJWT(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: No valid token provided' }, { status: 401 });
    }

    // Find the doctor document for this user
    let doctor = await Doctor.findOne({ userId: user._id }).populate('patients');
    
    // If no doctor profile exists and the user is a doctor, create one
    if (!doctor && user.role === 'doctor') {
      console.log(`Creating new doctor profile for user ${user._id}`);
      doctor = new Doctor({ 
        userId: user._id,
        specialization: 'General Physician',
        patients: []
      });
      await doctor.save();
      
      // Re-populate the patients field
      doctor = await Doctor.findOne({ userId: user._id }).populate('patients');
    }
    
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    return NextResponse.json({ doctor }, { status: 200 });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}