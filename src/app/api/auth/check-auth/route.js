import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils';

export async function GET(req) {
  try {
    // Validate JWT token
    const user = await validateJWT(req);
    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Return user info if authenticated
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Authentication error' 
    }, { status: 500 });
  }
} 