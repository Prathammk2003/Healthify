import { NextResponse } from 'next/server';
import IntelligentNotificationSystem from '@/lib/intelligentNotifications';

const notificationSystem = new IntelligentNotificationSystem();

export async function POST(request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET || 'healthcare-cron-secret-2024';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request for intelligent notifications');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🤖 Running intelligent notifications cron job...');
    
    const startTime = Date.now();
    const result = await notificationSystem.processIntelligentNotifications();
    const duration = Date.now() - startTime;

    console.log(`✅ Intelligent notifications completed in ${duration}ms`);
    console.log(`📊 Results: ${result.notificationsSent} notifications sent, ${result.errors} errors`);

    return NextResponse.json({
      success: true,
      message: 'Intelligent notifications processed successfully',
      data: {
        notificationsSent: result.notificationsSent,
        errors: result.errors,
        duration: duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in intelligent notifications cron job:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process intelligent notifications',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for manual testing
export async function GET(request) {
  try {
    // Check if this is a manual test request
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    const userId = searchParams.get('userId');
    
    if (!testMode) {
      return NextResponse.json({ 
        message: 'Intelligent notifications endpoint',
        usage: 'POST with Authorization header for cron jobs, GET with ?test=true for testing'
      });
    }

    console.log('🧪 Running intelligent notifications in test mode...');
    
    let result;
    if (userId) {
      // Test for specific user
      console.log(`Testing for user: ${userId}`);
      const notificationCount = await notificationSystem.processUserIntelligentNotifications(userId);
      result = { notificationsSent: notificationCount, errors: 0 };
    } else {
      // Test for all users
      result = await notificationSystem.processIntelligentNotifications();
    }

    return NextResponse.json({
      success: true,
      message: 'Test completed',
      data: result
    });

  } catch (error) {
    console.error('Error in test mode:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}