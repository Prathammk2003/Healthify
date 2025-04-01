import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    await connectDB();
    console.log('Connected to database');

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    const { doctorId, date, time } = await req.json();
    console.log('Appointment request data:', { doctorId, date, time });

    if (!doctorId || !date || !time) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json({ error: 'Invalid doctor ID format' }, { status: 400 });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      console.log(`Doctor with ID ${doctorId} not found`);
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    console.log(`Creating appointment with doctor ID: ${doctorId} for user: ${userId}`);

    // Get the patient profile - either find existing or create new
    let patientProfile = await UserProfile.findOne({ userId });
    
    if (!patientProfile) {
      // Get user info to create a profile
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Split the name into first and last name
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Not Provided';
      
      // Create a new patient profile with all required fields
      patientProfile = new UserProfile({
        userId,
        firstName,
        lastName,
        dateOfBirth: new Date('2000-01-01'), // Default date of birth
        address: 'Not provided', // Default address
        contactNumber: 'Not provided', // Default contact number
        medicalHistory: []
      });
      
      await patientProfile.save();
      console.log(`Created new patient profile with ID: ${patientProfile._id}`);
    }
    
    // Automatically associate patient with doctor if not already associated
    if (!doctor.patients.some(patientId => patientId.toString() === patientProfile._id.toString())) {
      doctor.patients.push(patientProfile._id);
      await doctor.save();
      console.log(`Associated patient ${patientProfile._id} with doctor ${doctorId}`);
    }

    // Create appointment with pending status
    const appointment = await Appointment.create({
      doctor: doctorId,
      date,
      time,
      userId,
      status: 'pending'
    });

    console.log('Appointment created:', appointment);

    return NextResponse.json(
      { message: 'Appointment request sent successfully!', appointment },
      { status: 201 }
    );
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 });
  }
}

// Get appointments for the logged-in user
export async function GET(req) {
  try {
    await connectDB();
    console.log('Connected to database - fetching appointments');

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    // First, get all appointments without populating to validate
    console.log(`Fetching appointments for user ID: ${userId}`);
    const allAppointments = await Appointment.find({ userId }).lean();
    
    console.log(`Found ${allAppointments.length} appointments before validation`);
    
    // Fix any invalid doctor references
    for (const appointment of allAppointments) {
      if (appointment.doctor && !mongoose.Types.ObjectId.isValid(appointment.doctor)) {
        console.log(`Found appointment with invalid doctor ID: ${appointment.doctor}`);
        
        // Update the appointment with a valid doctor ID
        await Appointment.findByIdAndUpdate(
          appointment._id,
          { 
            doctor: mongoose.Types.ObjectId.createFromHexString("000000000000000000000000"),
            status: 'rejected'
          }
        );
        console.log(`Fixed invalid doctor reference for appointment: ${appointment._id}`);
      }
    }
    
    // Now get appointments with proper populate
    const appointments = await Appointment.find({ userId })
      .populate({
        path: 'doctor',
        populate: {
          path: 'userId',
          select: 'name email',
          options: { lean: true }
        }
      })
      .sort({ date: 1, time: 1 })
      .lean();

    console.log(`Found ${appointments.length} appointments after validation`);

    // Format the response to handle any invalid references
    const formattedAppointments = appointments.map(appointment => {
      try {
        // Create a safe version of the appointment object
        const doctor = appointment.doctor;
        let doctorName = 'Unknown Doctor';
        let doctorEmail = 'No email';

        if (doctor && doctor.userId) {
          doctorName = doctor.userId.name || doctorName;
          doctorEmail = doctor.userId.email || doctorEmail;
        }

        return {
          ...appointment,
          doctor: {
            id: doctor?._id?.toString() || '',
            name: doctorName,
            email: doctorEmail
          }
        };
      } catch (err) {
        console.error('Error formatting appointment:', err);
        return {
          ...appointment,
          doctor: { id: '', name: 'Error loading doctor info', email: '' }
        };
      }
    });

    return NextResponse.json({ appointments: formattedAppointments }, { status: 200 });
  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}


