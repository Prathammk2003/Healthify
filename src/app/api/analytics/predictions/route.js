import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HealthAnalyticsEngine from '@/lib/healthAnalytics';
import HealthPrediction from '@/models/HealthPrediction';
import { verifyAuth } from '@/lib/auth';

const analyticsEngine = new HealthAnalyticsEngine();

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = authResult.userId;
    const predictionType = searchParams.get('type');
    const timeframe = searchParams.get('timeframe') || '1_week';
    const limit = parseInt(searchParams.get('limit')) || 10;

    await connectDB();

    // Get active predictions
    const predictions = await HealthPrediction.getActivePredictions(userId, predictionType)
      .limit(limit)
      .populate('userId', 'name email');

    // Get prediction statistics
    const stats = await getPredictionStats(userId);

    return NextResponse.json({
      success: true,
      predictions,
      stats,
      total: predictions.length
    });

  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const userId = authResult.userId;
    const { timeframe = '1_week', regenerate = false } = body;

    await connectDB();

    // Check if recent predictions exist and regenerate is false
    if (!regenerate) {
      const recentPredictions = await HealthPrediction.find({
        userId,
        isActive: true,
        validUntil: { $gt: new Date() },
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // Last 6 hours
      });

      if (recentPredictions.length > 0) {
        return NextResponse.json({
          success: true,
          message: 'Using existing predictions',
          predictions: recentPredictions,
          cached: true
        });
      }
    }

    // Generate new predictions
    const predictions = await analyticsEngine.generatePredictions(userId, timeframe);

    // Deactivate old predictions if regenerating
    if (regenerate) {
      await HealthPrediction.updateMany(
        { userId, isActive: true },
        { isActive: false }
      );
    }

    // Create notification for high-risk predictions
    const highRiskPredictions = predictions.filter(p => p.riskScore >= 70);
    if (highRiskPredictions.length > 0) {
      await createPredictionNotifications(userId, highRiskPredictions);
    }

    return NextResponse.json({
      success: true,
      message: 'Predictions generated successfully',
      predictions,
      highRiskCount: highRiskPredictions.length
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating predictions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate predictions',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { predictionId, outcome, notes } = body;

    if (!predictionId || !outcome) {
      return NextResponse.json(
        { error: 'Prediction ID and outcome are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const prediction = await HealthPrediction.findById(predictionId);
    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    // Verify user owns this prediction
    if (prediction.userId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update prediction outcome
    await prediction.markOutcome(outcome, notes);

    return NextResponse.json({
      success: true,
      message: 'Prediction outcome updated',
      prediction
    });

  } catch (error) {
    console.error('Error updating prediction outcome:', error);
    return NextResponse.json(
      { error: 'Failed to update prediction outcome' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get('id');

    if (!predictionId) {
      return NextResponse.json(
        { error: 'Prediction ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const prediction = await HealthPrediction.findById(predictionId);
    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    // Verify user owns this prediction
    if (prediction.userId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Deactivate instead of deleting for audit trail
    prediction.isActive = false;
    await prediction.save();

    return NextResponse.json({
      success: true,
      message: 'Prediction deactivated'
    });

  } catch (error) {
    console.error('Error deactivating prediction:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate prediction' },
      { status: 500 }
    );
  }
}

// Helper function to get prediction statistics
async function getPredictionStats(userId) {
  try {
    const [totalPredictions, activePredictions, accuracyStats] = await Promise.all([
      HealthPrediction.countDocuments({ userId }),
      HealthPrediction.countDocuments({ userId, isActive: true }),
      HealthPrediction.aggregate([
        { $match: { userId: userId, actualOutcome: { $ne: 'pending' } } },
        {
          $group: {
            _id: '$actualOutcome',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const accuracy = accuracyStats.reduce((acc, stat) => {
      if (stat._id === 'accurate') acc.accurate = stat.count;
      else if (stat._id === 'partially_accurate') acc.partiallyAccurate = stat.count;
      else if (stat._id === 'inaccurate') acc.inaccurate = stat.count;
      return acc;
    }, { accurate: 0, partiallyAccurate: 0, inaccurate: 0 });

    const totalValidated = accuracy.accurate + accuracy.partiallyAccurate + accuracy.inaccurate;
    const accuracyRate = totalValidated > 0 
      ? ((accuracy.accurate + accuracy.partiallyAccurate * 0.5) / totalValidated * 100).toFixed(1)
      : 0;

    return {
      totalPredictions,
      activePredictions,
      accuracy: {
        ...accuracy,
        rate: accuracyRate,
        totalValidated
      }
    };
  } catch (error) {
    console.error('Error calculating prediction stats:', error);
    return {
      totalPredictions: 0,
      activePredictions: 0,
      accuracy: { accurate: 0, partiallyAccurate: 0, inaccurate: 0, rate: 0, totalValidated: 0 }
    };
  }
}

// Helper function to create notifications for high-risk predictions
async function createPredictionNotifications(userId, predictions) {
  try {
    // Import notification service
    const { createNotification } = await import('@/services/notificationService');
    
    for (const prediction of predictions) {
      let message = '';
      let priority = 'medium';

      switch (prediction.predictionType) {
        case 'mental_health_risk':
          message = `High mental health risk detected (${prediction.riskScore}/100). Consider scheduling a consultation.`;
          priority = prediction.riskScore >= 85 ? 'critical' : 'high';
          break;
        case 'medication_adherence':
          message = `Medication adherence risk identified (${prediction.riskScore}/100). Review your medication routine.`;
          priority = prediction.riskScore >= 80 ? 'high' : 'medium';
          break;
        case 'emergency_risk':
          message = `Emergency health risk detected (${prediction.riskScore}/100). Immediate attention may be needed.`;
          priority = 'critical';
          break;
        case 'health_deterioration':
          message = `Health deterioration risk identified (${prediction.riskScore}/100). Monitor symptoms closely.`;
          priority = prediction.riskScore >= 80 ? 'high' : 'medium';
          break;
        default:
          message = `Health risk prediction alert: ${prediction.predictionType} (${prediction.riskScore}/100)`;
      }

      await createNotification(
        userId,
        'health_prediction',
        message,
        'app',
        {
          predictionId: prediction._id,
          predictionType: prediction.predictionType,
          riskScore: prediction.riskScore,
          priority
        }
      );
    }
  } catch (error) {
    console.error('Error creating prediction notifications:', error);
  }
}