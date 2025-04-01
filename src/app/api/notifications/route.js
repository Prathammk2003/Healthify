import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import MedicationReminder from "@/models/MedicationReminder";
import Appointment from "@/models/Appointment";
import { verifyJwtToken } from "@/lib/auth";

export async function GET(request) {
  try {
    // Get token from Authorization header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify token
    const decoded = await verifyJwtToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    // Connect to DB
    await connectDB();
    
    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "30");
    const page = parseInt(searchParams.get("page") || "1");
    const type = searchParams.get("type");
    const showAll = searchParams.get("showAll") === "true";
    
    // Prepare filter
    const filter = { userId: decoded.id };
    if (type) {
      filter.type = type;
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get base notifications
    let notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // If not showing all, add additional filters for relevant notifications
    if (!showAll) {
      // Get pending medication reminders
      const pendingMedications = await MedicationReminder.find({
        userId: decoded.id,
        status: "Pending"
      });
      
      // Get upcoming appointments (today and future)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcomingAppointments = await Appointment.find({
        userId: decoded.id,
        date: { $gte: today.toISOString().split('T')[0] },
        status: { $ne: "cancelled" }
      });
      
      // Create reference IDs sets for quick lookup
      const pendingMedicationIds = new Set(pendingMedications.map(med => med._id.toString()));
      const upcomingAppointmentIds = new Set(upcomingAppointments.map(appt => appt._id.toString()));
      
      // Filter notifications to only include relevant ones
      notifications = notifications.filter(notification => {
        // Include all notifications from today
        const notificationDate = new Date(notification.createdAt);
        const isToday = notificationDate.toDateString() === new Date().toDateString();
        if (isToday) return true;
        
        // For medication notifications, only include if the medication is pending
        if (notification.type === "medication" && notification.referenceId) {
          return pendingMedicationIds.has(notification.referenceId.toString());
        }
        
        // For appointment notifications, only include if the appointment is upcoming
        if (notification.type === "appointment" && notification.referenceId) {
          return upcomingAppointmentIds.has(notification.referenceId.toString());
        }
        
        // For health tips, include those within the last 3 days
        if (notification.type === "healthTip") {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return notificationDate >= threeDaysAgo;
        }
        
        return false;
      });
    }
    
    // Get total count for pagination (of filtered notifications)
    const total = await Notification.countDocuments(filter);
    
    return NextResponse.json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Get token from cookies
    const token = request.cookies.get("token")?.value || "";
    
    // Verify token
    const payload = await verifyJwtToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Connect to DB
    await connectDB();
    
    // Get notification ID from request body
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    
    if (notificationId) {
      // Delete specific notification (only if it belongs to the user)
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        userId: payload.id,
      });
      
      if (!result) {
        return NextResponse.json({ error: "Notification not found or not authorized to delete" }, { status: 404 });
      }
      
      return NextResponse.json({ message: "Notification deleted successfully" });
    } else {
      // Delete all user notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await Notification.deleteMany({
        userId: payload.id,
        createdAt: { $lt: thirtyDaysAgo },
      });
      
      return NextResponse.json({
        message: `${result.deletedCount} old notifications deleted successfully`,
      });
    }
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }
} 