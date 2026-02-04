import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { verifyJwtToken } from "@/lib/auth";
import { isMockMode, findInMockCollection, updateInMockCollection } from '@/lib/mockDb';

export async function PUT(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await verifyJwtToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { notificationId, all } = await request.json();

    await connectDB();

    // Handle mock mode
    if (isMockMode()) {
      console.log('Using mock mode for marking notifications as read');
      return NextResponse.json({ success: true });
    }

    if (all) {
      // Mark all notifications as read for the user
      await Notification.updateMany(
        { userId: decoded.id, status: "unread" },
        { status: "read", readAt: new Date() }
      );
    } else if (notificationId) {
      // Mark specific notification as read
      await Notification.updateOne(
        { _id: notificationId, userId: decoded.id },
        { status: "read", readAt: new Date() }
      );
    } else {
      return NextResponse.json({ error: 'Notification ID or "all" flag required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}