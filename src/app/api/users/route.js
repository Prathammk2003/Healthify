import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { verifyJwtToken } from '@/lib/auth';

// ✅ Register a new user
export async function POST(req) {
  try {
    await connectDB();

    const { name, email, password, role } = await req.json();
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // If role is admin, check if request is coming from an existing admin
    if (role === 'admin') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Only existing administrators can create admin accounts' }, { status: 403 });
      }

      try {
        const token = authHeader.split(' ')[1];
        const decoded = await verifyJwtToken(token);
        
        // Check if the user making the request is an admin
        const requestingUser = await User.findById(decoded.id);
        if (!requestingUser || !requestingUser.isAdmin) {
          return NextResponse.json({ error: 'Only administrators can create admin accounts' }, { status: 403 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role: role || 'patient',
      isAdmin: role === 'admin'
    });
    await newUser.save();

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error("🚨 Registration Error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ✅ Get all users - only admins can see all users
export async function GET(req) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = await verifyJwtToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Check if user is an admin
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await User.find().select('-password');
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ✅ Delete a user - only for admin
export async function DELETE(req) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = await verifyJwtToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Check if user is an admin
    const user = await User.findById(decoded.id);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get the user ID from the URL search params
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Don't allow admin to delete themselves
    if (id === decoded.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


