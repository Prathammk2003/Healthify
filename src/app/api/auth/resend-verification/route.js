import { connectDB } from '@/lib/db';
import User from '@/models/User';
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
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();
    
    // Find user with the given email
    const user = await User.findOne({ email });

    if (!user) {
      // For security reasons, don't reveal that the user doesn't exist
      return NextResponse.json({ 
        message: 'If your email exists in our system, a verification code has been sent.'
      }, { status: 200 });
    }

    // If user is already verified, no need to resend
    if (user.isVerified && !user.passwordChangeRequired) {
      return NextResponse.json({ 
        message: 'Your email is already verified. Please login.'
      }, { status: 200 });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date();
    codeExpiry.setHours(codeExpiry.getHours() + 1); // Code valid for 1 hour

    // Update user with new code
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = codeExpiry;
    await user.save();

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
            
            <p>Hi ${user.name},</p>
            <p>You requested a new verification code. Please use the code below to verify your email address:</p>
            
            <div style="background-color: #f7f7f7; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h2 style="font-size: 30px; letter-spacing: 5px; color: #333; margin: 0;">${verificationCode}</h2>
            </div>
            
            <p>This code will expire in 1 hour.</p>
            ${user.passwordChangeRequired ? 
              '<p>After verification, you\'ll be able to set up your password and access your account.</p>' : 
              ''}
            <p>If you did not request this verification code, please ignore this email.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e4; text-align: center; color: #777; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Healthcare App. All rights reserved.</p>
            </div>
          </div>
        `
      });
      
      console.log('Email sent successfully:', data);
      emailSent = true;
      console.log('Verification code resent to:', email);
    } catch (emailError) {
      console.error('Error resending verification email:', emailError);
    }

    // For development/testing - respond with verification code if email fails
    const devInfo = !emailSent ? {
      devMessage: "Email sending failed. For testing purposes, here's the verification code:",
      verificationCode
    } : {};

    return NextResponse.json({ 
      message: emailSent 
        ? 'Verification code has been sent to your email.' 
        : 'Could not send verification code. Please try again later or contact support.',
      ...devInfo
    }, { status: 200 });
  } catch (error) {
    console.error('Resend Verification Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
} 