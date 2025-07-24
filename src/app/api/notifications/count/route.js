import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { verifyJwtToken } from "@/lib/auth";
import { isMockMode, findInMockCollection } from '@/lib/mockDb';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
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

    await connectDB();
    
    // Handle mock mode
    if (isMockMode()) {
      console.log('Using mock mode for notification count');
      // Return mock notification count (random between 0-5)
      return NextResponse.json({ count: Math.floor(Math.random() * 6) });
    }
    
    // Get unread count
    const count = await Notification.countDocuments({
      userId: decoded.id,
      status: "unread"
    });
    
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json({ error: 'Failed to fetch notification count', count: 0 }, { status: 500 });
  }
} 