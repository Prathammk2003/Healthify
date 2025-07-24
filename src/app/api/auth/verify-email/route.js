import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, code, password } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    await connectDB();
    
    // Find user with the given email and verification code that hasn't expired
    const user = await User.findOne({
      email: email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() } // Code should not be expired
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification code. Please request a new verification code.'
      }, { status: 400 });
    }

    // If the user provided a new password and needs to set it, update it now
    if (password && user.passwordChangeRequired) {
      const bcrypt = require('bcryptjs');
      user.password = await bcrypt.hash(password, 10);
      user.passwordChangeRequired = false;
    }

    // Update user to verified and clear verification code
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Determine if password needs to be set
    const passwordNeeded = user.passwordChangeRequired;

    return NextResponse.json({ 
      message: passwordNeeded 
        ? 'Email verified successfully. Please set your password to complete registration.'
        : 'Email verified successfully. You can now log in.',
      email: user.email,
      passwordChangeRequired: passwordNeeded
    }, { status: 200 });
  } catch (error) {
    console.error('Email Verification Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 