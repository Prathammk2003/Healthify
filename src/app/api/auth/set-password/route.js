import { connectDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    await connectDB();
    
    // Find user with the given email that is verified but needs password change
    const user = await User.findOne({
      email: email,
      isVerified: true,
      passwordChangeRequired: true
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid user or password change not required.'
      }, { status: 400 });
    }

    // Update password and mark that change is no longer required
    user.password = await bcrypt.hash(password, 10);
    user.passwordChangeRequired = false;
    await user.save();

    return NextResponse.json({ 
      message: 'Password set successfully. You can now log in.',
      email: user.email
    }, { status: 200 });
  } catch (error) {
    console.error('Set Password Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 