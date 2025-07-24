import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Notification from "@/models/Notification";
import Doctor from "@/models/Doctor";
import User from "@/models/User";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { isTimeSlotAvailable, updateSlotFromAppointment } from '@/utils/slotManager';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyJwtToken } from '@/lib/jwt';

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: User ID missing" }, { status: 401 });
    }

    const { doctor: doctorId, date, time } = await req.json();
    const { id } = params; // ✅ Get ID from URL

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
    }

    console.log(`🔍 Updating appointment with ID: ${id} for user: ${userId}`);

    // First fetch the existing appointment to compare changes
    const currentAppointment = await Appointment.findOne({ _id: id, userId });
    
    if (!currentAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    
    // Check if date or time is being updated
    const isDateChanged = date && date !== currentAppointment.date;
    const isTimeChanged = time && time !== currentAppointment.time;
    
    // If date or time is being updated, change status to pending_update
    let updateData = { doctor: doctorId, date, time };
    let statusMessage = "Appointment updated successfully!";
    
    if (isDateChanged || isTimeChanged) {
      // If changing date/time, check if the new slot is available
      const isAvailable = await isTimeSlotAvailable(doctorId, date, time);
      if (!isAvailable) {
        return NextResponse.json({ 
          error: 'This time slot is no longer available. Please select another time.',
          errorCode: 'TIME_SLOT_UNAVAILABLE'
        }, { status: 409 });
      }
      
      updateData.status = 'pending_update';
      statusMessage = "Appointment update request sent to doctor for approval";
      
      // Store the previous values for reference
      updateData.previousDate = currentAppointment.date;
      updateData.previousTime = currentAppointment.time;
    }

    // Update the appointment
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );
    
    // Update time slot status
    await updateSlotFromAppointment(updatedAppointment, 'update');

    // If date or time was changed, create notification for the doctor
    if (isDateChanged || isTimeChanged) {
      try {
        // Get doctor information
        const doctor = await Doctor.findById(doctorId);
        if (doctor && doctor.userId) {
          // Get user name
          const user = await User.findById(userId, 'name');
          const userName = user ? user.name : 'A patient';
          
          // Create notification
          await Notification.create({
            userId: doctor.userId,
            type: 'appointment',
            messageContent: `${userName} has requested to reschedule their appointment from ${currentAppointment.date} at ${currentAppointment.time} to ${date} at ${time}. Please approve or reject this change.`,
            referenceId: id,
            refModel: 'Appointment',
            metadata: {
              important: true,
              oldDate: currentAppointment.date,
              oldTime: currentAppointment.time,
              newDate: date,
              newTime: time,
              action: 'reschedule',
              patientId: userId
            }
          });
          
          console.log(`Created notification for doctor ${doctor.userId} about appointment reschedule request`);
        }
      } catch (error) {
        console.error("Error creating notification:", error);
        // Continue anyway - don't fail the update if notification fails
      }
    }

    console.log("✅ Appointment updated successfully:", updatedAppointment);
    return NextResponse.json({ 
      message: statusMessage, 
      appointment: updatedAppointment 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Server Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    console.log('Connected to database for appointment deletion');

    // Verify token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const userId = decoded.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: User ID missing" }, { status: 401 });
    }

    // Get ID from URL
    const { id } = params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
    }

    console.log(`Deleting appointment with ID: ${id} for user: ${userId}`);

    // Find and delete appointment (only if it belongs to the authenticated user)
    const deletedAppointment = await Appointment.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!deletedAppointment) {
      return NextResponse.json({ error: "Appointment not found or you don't have permission to delete it" }, { status: 404 });
    }

    // Release the time slot
    await updateSlotFromAppointment(deletedAppointment, 'delete');

    console.log("Appointment deleted successfully:", deletedAppointment);
    
    return NextResponse.json({ 
      message: "Appointment deleted successfully!",
      appointmentId: id
    }, { status: 200 });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ 
      error: "Server error", 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify token
    const decoded = await verifyJwtToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    
    // Find the appointment by ID
    const appointment = await Appointment.findById(params.id)
      .populate('patient', 'firstName lastName email')
      .populate('doctor', 'firstName lastName email specialization');
    
    if (!appointment) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }
    
    // Check if the user has permission to view this appointment
    const userId = decoded.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    
    // Only allow access if the user is an admin, the patient, or the doctor of this appointment
    if (
      user.role !== 'admin' && 
      appointment.patient._id.toString() !== userId && 
      appointment.doctor._id.toString() !== userId
    ) {
      return NextResponse.json({ message: 'Unauthorized to view this appointment' }, { status: 403 });
    }
    
    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
