import { connectDB } from '@/lib/db';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// ✅ Get user profile
export async function GET(req, context) {
  try {
    await connectDB();

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

    const { id } = await context.params;
    const profile = await UserProfile.findOne({ userId: id }).populate('doctor');

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ✅ Update or create user profile
export async function PUT(req, context) {
  try {
    await connectDB();

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

    const { id } = await context.params;
    const { firstName, lastName, dateOfBirth, contactNumber, address, medicalHistory } = await req.json();
    if (!firstName || !lastName || !dateOfBirth || !contactNumber || !address) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    let profile = await UserProfile.findOne({ userId: id });

    if (profile) {
      // Update existing profile
      profile.firstName = firstName;
      profile.lastName = lastName;
      profile.dateOfBirth = dateOfBirth;
      profile.contactNumber = contactNumber;
      profile.address = address;
      profile.medicalHistory = medicalHistory;
      await profile.save();
    } else {
      // Create new profile
      profile = new UserProfile({
        userId: id,
        firstName,
        lastName,
        dateOfBirth,
        contactNumber,
        address,
        medicalHistory,
      });
      await profile.save();
    }

    return NextResponse.json({ message: 'Profile updated!', profile }, { status: 200 });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}