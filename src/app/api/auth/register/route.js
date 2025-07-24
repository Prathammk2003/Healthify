import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();
    console.log('Registration request received:', { name, email, role });

    if (!name || !email || !role) {
      console.log('Missing required fields');
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // For the modern flow, we don't require password at registration time
    // It will be set after email verification

    await connectDB();
    console.log('Connected to database');

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date();
    codeExpiry.setHours(codeExpiry.getHours() + 1); // Code valid for 1 hour

    // Create user - with a temporary password if provided, or a random one if not
    const tempPassword = password || Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role,
      isVerified: false,
      verificationCode,
      verificationCodeExpires: codeExpiry,
      passwordChangeRequired: !password // Mark that password needs to be set if not provided
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

    // Send verification email using Resend
    let emailSent = false;
    try {
      const data = await resend.emails.send({
        from: 'Healthcare App <onboarding@resend.dev>',
        to: email,
        subject: 'Your Verification Code for Healthcare App',
        reply_to: 'beshu4959gowdaman@gmail.com',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #4a90e2;">Healthcare App</h1>
              <h2 style="color: #333;">Email Verification</h2>
            </div>
            
            <p>Hi ${name},</p>
            <p>Thank you for registering with Healthcare App. Please use the verification code below to verify your email address:</p>
            
            <div style="background-color: #f7f7f7; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h2 style="font-size: 30px; letter-spacing: 5px; color: #333; margin: 0;">${verificationCode}</h2>
            </div>
            
            <p>This code will expire in 1 hour.</p>
            <p>After verification, you'll be able to set up your password and access your account.</p>
            <p>If you did not create an account with Healthcare App, please ignore this email.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; text-align: center; color: #777; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Healthcare App. All rights reserved.</p>
            </div>
          </div>
        `
      });
      
      console.log('Email sent successfully:', data);
      emailSent = true;
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with registration even if email fails
    }

    // For development/testing - respond with verification code if email fails
    const devInfo = !emailSent ? {
      devMessage: "Email sending failed. For testing purposes, here's the verification code:",
      verificationCode
    } : {};

    return NextResponse.json({ 
      message: emailSent 
        ? 'Registration initiated! Please check your email for a 6-digit verification code.' 
        : 'Registration initiated but verification email could not be sent. Please contact support.',
      user: { 
        id: newUser._id, 
        name, 
        email, 
        role
      },
      requiresVerification: true,
      ...devInfo
    }, { status: 201 });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}
