import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();
    console.log('Registration request received:', { name, email, role });

    if (!name || !email || !password || !role) {
      console.log('Missing required fields');
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    await connectDB();
    console.log('Connected to database');

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role 
    });
    await newUser.save();
    console.log('User created:', { id: newUser._id, name, email, role });

    // If the role is 'doctor', create a corresponding Doctor entry
    if (role === 'doctor') {
      console.log('Creating doctor profile for user:', newUser._id);
      try {
        const newDoctor = new Doctor({ userId: newUser._id });
        await newDoctor.save();
        console.log('Doctor profile created successfully:', {
          doctorId: newDoctor._id,
          userId: newDoctor.userId
        });
      } catch (doctorError) {
        console.error('Error creating doctor profile:', doctorError);
        // Delete the user if doctor creation fails
        await User.findByIdAndDelete(newUser._id);
        return NextResponse.json({ error: 'Failed to create doctor profile' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      message: 'User registered successfully',
      user: { 
        id: newUser._id, 
        name, 
        email, 
        role 
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}
