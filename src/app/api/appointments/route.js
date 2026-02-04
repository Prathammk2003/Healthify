import { connectDB } from '@/lib/db';
import Appointment from '@/models/Appointment';
import Doctor from '@/models/Doctor';
import User from '@/models/User';
import UserProfile from '@/models/UserProfile';
import { NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth';
import mongoose from 'mongoose';
import { isTimeSlotAvailable, updateSlotFromAppointment } from '@/utils/slotManager';
import { sendEmail } from '@/services/notificationService';

export async function POST(req) {
  try {
    await connectDB();
    console.log('Connected to database - creating appointment request');

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);

    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      console.error('User ID missing in token');
      return NextResponse.json({ error: 'Unauthorized: User ID missing' }, { status: 401 });
    }

    const { doctorId, date, time } = await req.json();
    console.log('Appointment request data:', { userId, doctorId, date, time });

    if (!doctorId || !date || !time) {
      console.error('Missing required fields');
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate doctorId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      console.error(`Invalid doctor ID format: ${doctorId}`);
      return NextResponse.json({ error: 'Invalid doctor ID format' }, { status: 400 });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      console.error(`Doctor with ID ${doctorId} not found`);
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // NEW: Check if time slot is available in real-time
    const isAvailable = await isTimeSlotAvailable(doctorId, date, time);
    if (!isAvailable) {
      console.error(`Time slot ${date} at ${time} is not available for doctor ${doctorId}`);
      return NextResponse.json({
        error: 'This time slot is no longer available. Please select another time.',
        errorCode: 'TIME_SLOT_UNAVAILABLE'
      }, { status: 409 });
    }

    console.log(`Doctor found: ${doctor._id}, creating appointment...`);

    // Get the patient profile - either find existing or create new
    let patientProfile = await UserProfile.findOne({ userId });

    if (!patientProfile) {
      console.log(`Patient profile not found for user ID: ${userId}, creating new profile...`);
      // Get user info to create a profile
      const user = await User.findById(userId);
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
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
    } else {
      console.log(`Found existing patient profile: ${patientProfile._id}`);
    }

    // Note: Association with doctor now happens only after approval
    // We removed automatic association at request time

    // Create appointment with pending status
    const appointmentData = {
      doctor: doctorId,
      date,
      time,
      userId,
      status: 'pending'
    };
    console.log('Creating appointment with data:', appointmentData);

    const appointment = await Appointment.create(appointmentData);

    // NEW: Update the time slot status
    await updateSlotFromAppointment(appointment, 'create');

    console.log('Appointment created successfully:', {
      id: appointment._id,
      doctor: appointment.doctor,
      status: appointment.status
    });

    // ✅ SEND EMAIL TO DOCTOR when patient requests appointment
    try {
      console.log('🔍 Attempting to send appointment request email to doctor...');

      // Get patient information
      const patientUser = await User.findById(userId);
      const patientName = patientUser ? patientUser.name : 'A patient';
      const patientEmail = patientUser ? patientUser.email : 'Not provided';

      // Get doctor's user information to get email
      const doctorUser = await User.findById(doctor.userId);

      if (doctorUser && doctorUser.email) {
        console.log('📧 Doctor email:', doctorUser.email);

        const emailSubject = `New Appointment Request - ${date}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
            <h2 style="color: #3b82f6;">📅 New Appointment Request</h2>
            <p>Hello Dr. ${doctorUser.name || 'Doctor'},</p>
            <p>You have received a new appointment request from a patient. Please review and approve or reject this request.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Patient Name:</strong> ${patientName}</p>
              <p style="margin: 5px 0;"><strong>Patient Email:</strong> ${patientEmail}</p>
              <p style="margin: 5px 0;"><strong>Requested Date:</strong> ${date}</p>
              <p style="margin: 5px 0;"><strong>Requested Time:</strong> ${time}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> PENDING APPROVAL</p>
            </div>
            <p style="color: #3b82f6; font-weight: bold;">⏰ Please review this request in your doctor dashboard.</p>
            <p style="margin-top: 20px;">Thank you for using our healthcare service!</p>
          </div>
        `;

        await sendEmail({
          email: doctorUser.email,
          subject: emailSubject,
          html: emailHtml,
          text: `New appointment request from ${patientName} for ${date} at ${time}. Please review in your dashboard.`
        });

        console.log(`✅ Email sent successfully to doctor ${doctorUser.email} about new appointment request!`);
      } else {
        console.log('⚠️ Cannot send email - doctor user or email not found');
      }
    } catch (emailError) {
      console.error('Error sending appointment request email to doctor:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        message: 'Appointment request sent successfully!',
        appointment,
        appointmentId: appointment._id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Server Error creating appointment:', error);
    return NextResponse.json({
      error: 'Server error',
      details: error.message,
      stack: error.stack
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
    const decoded = await verifyJwtToken(token);

    if (!decoded || !decoded.id) {
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


