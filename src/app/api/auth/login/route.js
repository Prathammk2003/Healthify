import { connectDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    await connectDB();

    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // ✅ Fetch the user once (fixes duplicate queries)
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: user._id, role: user.role, isAdmin: user.isAdmin }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // ✅ Return user details with `_id` (not `id`)
    return NextResponse.json(
      {
        message: 'Login successful',
        user: { 
          _id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          isAdmin: user.isAdmin 
        },
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
