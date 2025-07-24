import { NextResponse } from 'next/server';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { isMockMode } from '@/lib/mockDb';

// Create mock login response
const createMockLoginResponse = (email) => {
  console.log('Using mock login for:', email);
  
  // Mock user data
  const mockUser = {
    _id: 'mock-user-123',
    email: email,
    name: 'Mock User',
    role: email.includes('admin') ? 'admin' : 'patient',
    isAdmin: email.includes('admin'),
    isVerified: true
  };
  
  // Generate a JWT token
  const token = jwt.sign(
    { 
      id: mockUser._id,
      email: mockUser.email,
      role: mockUser.role
    },
    process.env.JWT_SECRET || 'mock-jwt-secret',
    { expiresIn: '7d' }
  );
  
  return { 
    user: mockUser, 
    token 
  };
};

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Check for required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Connect to database or use mock mode
    await connectDB();
    
    // Handle mock mode
    if (isMockMode()) {
      // In mock mode, allow any credentials with basic validation
      if (email.includes('@') && password.length >= 6) {
        const mockResponse = createMockLoginResponse(email);
        return NextResponse.json(mockResponse);
      } else {
        // Return error for invalid credentials
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }
    
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Special case for Dr. Mahesh - bypass verification check
    const isDrMahesh = user.email.toLowerCase().includes('mahesh') && user.role === 'doctor';
    
    // Check if user is verified (skip for Dr. Mahesh)
    if (!user.isVerified && !isDrMahesh) {
      return NextResponse.json({ 
        error: 'Email not verified. Please verify your email to continue.',
        needsVerification: true
      }, { status: 401 });
    }

    // Check if user needs to set a password (for users created by admin)
    if (!user.password) {
      return NextResponse.json({ 
        error: 'You need to set a password to complete registration.',
        passwordChangeRequired: true
      }, { status: 401 });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
