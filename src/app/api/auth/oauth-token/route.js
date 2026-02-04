import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function POST(req) {
  try {
    // Verify that the request is from an authenticated NextAuth session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated via OAuth' }, { status: 401 });
    }

    const { userId, email, role } = await req.json();

    // Validate that the session user matches the requested user
    if (session.user.id !== userId || session.user.email !== email) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 });
    }

    // Connect to database
    await connectDB();

    // Find the user to ensure they exist
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || false,
        provider: user.provider || 'google' // Mark as OAuth user
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'healthify-oauth'
      }
    );

    console.log('Generated JWT token for OAuth user:', {
      userId: user._id,
      email: user.email,
      role: user.role,
      provider: user.provider
    });

    return NextResponse.json({ 
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || false
      }
    });

  } catch (error) {
    console.error('OAuth token generation error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}