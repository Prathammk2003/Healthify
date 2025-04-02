import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils';

export async function GET(req) {
  try {
    // Validate JWT token
    const user = await validateJWT(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If we got here, the user is authenticated
    // No need to check for a physical sessions flag file in production
    return NextResponse.json({ status: 'ok', message: 'Session active' });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 