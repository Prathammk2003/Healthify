'use server';

import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Get a specific user - accessible by the user themselves or an admin
export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyJwtToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if the requesting user is trying to access their own data or is an admin
    const requestingUser = await User.findById(decoded.id);
    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Allow access if the user is accessing their own data or is an admin
    if (decoded.id !== userId && !requestingUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only access your own data or you need admin privileges' }, { status: 403 });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get User Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// Update a user - accessible by the user themselves or an admin
export async function PUT(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = await verifyJwtToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if the requesting user is trying to update their own data or is an admin
    const requestingUser = await User.findById(decoded.id);
    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow users to update their own data, unless they're an admin
    const isOwnAccount = decoded.id === userId;
    const isAdmin = requestingUser.isAdmin;
    
    if (!isOwnAccount && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only update your own data or you need admin privileges' }, { status: 403 });
    }

    const { name, email, role, password } = await request.json();
    
    // Find the user to update
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    // Role can only be changed by admins
    if (role && isAdmin) {
      updateData.role = role;
      updateData.isAdmin = role === 'admin';
    }
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// Delete a user - only accessible by an admin
export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify token and check if user is an admin
    const decoded = await verifyJwtToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Check if the requesting user is an admin
    const adminUser = await User.findById(decoded.id);
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only admin users can delete users' }, { status: 403 });
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Don't allow admin to delete themselves
    if (userId === decoded.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
    }

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 