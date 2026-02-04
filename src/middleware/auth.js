import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils';

export async function verifyAdmin(req) {
  try {
    await connectDB();
    const token = req.cookies.get('token')?.value;

    if (!token) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    // Create a mock request object for validateJWT
    const mockReq = {
      headers: {
        get: (name) => {
          if (name.toLowerCase() === 'authorization') {
            return `Bearer ${token}`;
          }
          return null;
        }
      },
      cookies: {
        get: (name) => {
          if (name === 'token') {
            return { value: token };
          }
          return null;
        }
      }
    };

    const user = await validateJWT(mockReq);

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return user; // Return user if admin
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}