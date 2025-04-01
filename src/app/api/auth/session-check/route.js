import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils';

// Path to active sessions flag file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sessionsFlagPath = path.resolve(__dirname, '../../../../../.active_sessions');

export async function GET(req) {
  try {
    // Validate JWT token
    const user = await validateJWT(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if sessions flag file exists
    if (!fs.existsSync(sessionsFlagPath)) {
      console.log('Sessions flag not found - services have been terminated');
      return NextResponse.json({ error: 'Services terminated' }, { status: 503 });
    }

    // If we got here, the sessions flag exists and the user is authenticated
    return NextResponse.json({ status: 'ok', message: 'Session active' });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 