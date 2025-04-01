import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Only allow in development mode for security
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    await connectDB();
    console.log('Connected to database for seeding');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: "admin@healthcare.com" });
    
    if (adminExists) {
      return NextResponse.json({ message: "Admin user already exists" });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    
    const adminUser = new User({
      name: "Admin User",
      email: "admin@healthcare.com",
      password: hashedPassword,
      role: "admin",
      isAdmin: true
    });
    
    await adminUser.save();

    // Create some test users
    const users = [
      {
        name: "Dr. John Smith",
        email: "doctor@healthcare.com",
        password: await bcrypt.hash("Doctor@123", 10),
        role: "doctor"
      },
      {
        name: "Patient User",
        email: "patient@healthcare.com",
        password: await bcrypt.hash("Patient@123", 10),
        role: "patient"
      }
    ];

    // Check if test users exist and create if they don't
    for (const userData of users) {
      const userExists = await User.findOne({ email: userData.email });
      if (!userExists) {
        const user = new User(userData);
        await user.save();
      }
    }

    return NextResponse.json({ 
      message: "Seed data created successfully",
      adminCredentials: {
        email: "admin@healthcare.com",
        password: "Admin@123"
      },
      testAccounts: [
        { email: "doctor@healthcare.com", password: "Doctor@123", role: "doctor" },
        { email: "patient@healthcare.com", password: "Patient@123", role: "patient" }
      ]
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
} 