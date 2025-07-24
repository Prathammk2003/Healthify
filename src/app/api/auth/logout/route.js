import { NextResponse } from 'next/server';
import { validateJWT } from '@/lib/auth-utils';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export async function POST(req) {
  try {
    // Attempt to validate JWT token
    const user = await validateJWT(req);

    // Log the logout activity
    if (user) {
      console.log(`User logged out: ${user.email}`);
    } else {
      console.log('User logged out: Unknown user (invalid token)');
    }

    // Check if we're in development mode and should check the session flag
    if (process.env.NODE_ENV === 'development') {
      try {
        // Only perform this check in development mode where the server files are accessible
        const sessionsFlagPath = path.resolve(process.cwd(), '.active_sessions');
        
        // Check if the sessions flag exists - indicates server is running
        const sessionsActive = fs.existsSync(sessionsFlagPath);
        if (!sessionsActive) {
          return NextResponse.json({
            status: 'warn',
            message: 'Server may be restarting. User logged out successfully.'
          });
        }
      } catch (error) {
        console.error('Error checking sessions flag:', error);
      }
    }

    // Return success response whether the user was found or not
    // The client will clear the tokens regardless
    return NextResponse.json({ 
      status: 'ok', 
      message: 'User logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still return success, as the client will clear tokens regardless
    return NextResponse.json({ 
      status: 'ok', 
      message: 'User logged out successfully' 
    });
  }
} 