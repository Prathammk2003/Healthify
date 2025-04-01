import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
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
    
    // Get unread count
    const count = await Notification.countDocuments({
      userId: decoded.id,
      status: "unread"
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching notification count:", error);
    return NextResponse.json({ error: "Failed to fetch notification count" }, { status: 500 });
  }
} 