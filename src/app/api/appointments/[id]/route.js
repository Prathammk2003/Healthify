import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

    const { doctor, date, time } = await req.json();
    const { id } = params; // ✅ Get ID from URL

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });
    }

    console.log(`🔍 Updating appointment with ID: ${id} for user: ${userId}`);

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: id, userId }, // ✅ Ensure user can only update their own appointment
      { doctor, date, time },
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    console.log("✅ Appointment updated successfully:", updatedAppointment);
    return NextResponse.json({ message: "Appointment updated successfully!", appointment: updatedAppointment }, { status: 200 });

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
