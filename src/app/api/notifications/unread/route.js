import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { verifyJwtToken } from "@/lib/auth";

export async function GET(request) {
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
    
    // Get last viewed timestamp
    const { searchParams } = new URL(request.url);
    const lastViewed = searchParams.get("lastViewed") || null;
    
    // Set up filter for notifications
    const filter = { userId: payload.id };
    
    // If lastViewed timestamp is provided, only count notifications after that time
    if (lastViewed) {
      filter.createdAt = { $gt: new Date(lastViewed) };
    } else {
      // If no lastViewed timestamp, use the last 24 hours as a default
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      filter.createdAt = { $gt: oneDayAgo };
    }
    
    // Count unread notifications
    filter.status = "unread";
    
    // Count notifications
    const count = await Notification.countDocuments(filter);
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification count" },
      { status: 500 }
    );
  }
} 