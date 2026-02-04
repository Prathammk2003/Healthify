import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import RiskAssessmentEngine from '@/lib/riskAssessment';
import RiskAssessment from '@/models/RiskAssessment';
import { verifyAuth } from '@/lib/auth';

const riskEngine = new RiskAssessmentEngine();

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = authResult.userId;
    const assessmentType = searchParams.get('type') || 'comprehensive';
    const limit = parseInt(searchParams.get('limit')) || 10;
    const includeTrend = searchParams.get('includeTrend') === 'true';

    await connectDB();

    // Get latest assessment
    const latestAssessment = await RiskAssessment.getLatestAssessment(userId, assessmentType);

    // Get assessment history
    const assessmentHistory = await RiskAssessment.find({ 
      userId,
      assessmentType 
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('overallRiskScore riskLevel createdAt categoryScores alerts');

    // Get risk trend if requested
    let riskTrend = null;
    if (includeTrend) {
      riskTrend = await RiskAssessment.getRiskTrend(userId, 90); // Last 90 days
    }

    // Calculate assessment insights
    const insights = await calculateAssessmentInsights(userId, assessmentHistory);

    return NextResponse.json({
      success: true,
      latestAssessment,
      assessmentHistory,
      riskTrend,
      insights,
      total: assessmentHistory.length
    });

  } catch (error) {
    console.error('Error fetching risk assessments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk assessments' },
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
    const { assessmentType = 'comprehensive', forceRegenerate = false } = body;

    await connectDB();

    // Check if recent assessment exists
    if (!forceRegenerate) {
      const recentAssessment = await RiskAssessment.findOne({
        userId,
        assessmentType,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (recentAssessment) {
        return NextResponse.json({
          success: true,
          message: 'Using existing recent assessment',
          assessment: recentAssessment,
          cached: true
        });
      }
    }

    // Generate new risk assessment
    const assessment = await riskEngine.generateRiskAssessment(userId, assessmentType);

    // Create notifications for critical risks
    if (assessment.riskLevel === 'critical' || assessment.criticalAlertsCount > 0) {
      await createRiskNotifications(userId, assessment);
    }

    // Update health trends based on assessment
    await updateHealthTrends(userId, assessment);

    return NextResponse.json({
      success: true,
      message: 'Risk assessment generated successfully',
      assessment,
      requiresAttention: assessment.riskLevel === 'critical' || assessment.riskLevel === 'high'
    }, { status: 201 });

  } catch (error) {
    console.error('Error generating risk assessment:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate risk assessment',
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
    const { assessmentId, updates } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const assessment = await RiskAssessment.findById(assessmentId);
    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Verify user owns this assessment
    if (assessment.userId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update allowed fields
    const allowedUpdates = ['nextAssessmentDue', 'notes'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        assessment[key] = updates[key];
      }
    });

    await assessment.save();

    return NextResponse.json({
      success: true,
      message: 'Assessment updated successfully',
      assessment
    });

  } catch (error) {
    console.error('Error updating risk assessment:', error);
    return NextResponse.json(
      { error: 'Failed to update assessment' },
      { status: 500 }
    );
  }
}

// Get risk assessment summary
export async function PATCH(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = authResult.userId;
    const assessmentId = searchParams.get('id');

    await connectDB();

    if (assessmentId) {
      // Get specific assessment summary
      const assessment = await RiskAssessment.findById(assessmentId);
      if (!assessment || assessment.userId.toString() !== userId) {
        return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
      }

      const summary = assessment.getSummary();
      return NextResponse.json({
        success: true,
        summary,
        assessmentId
      });
    } else {
      // Get overall risk summary for user
      const latestAssessment = await RiskAssessment.getLatestAssessment(userId);
      if (!latestAssessment) {
        return NextResponse.json({
          success: true,
          message: 'No assessments found',
          summary: null
        });
      }

      const summary = latestAssessment.getSummary();
      
      // Add additional summary data
      const summaryWithExtras = {
        ...summary,
        lastAssessmentDate: latestAssessment.createdAt,
        nextDue: latestAssessment.nextAssessmentDue,
        daysUntilNext: latestAssessment.daysUntilNextAssessment,
        assessmentType: latestAssessment.assessmentType,
        confidence: latestAssessment.confidence
      };

      return NextResponse.json({
        success: true,
        summary: summaryWithExtras
      });
    }

  } catch (error) {
    console.error('Error fetching assessment summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

// Helper function to calculate assessment insights
async function calculateAssessmentInsights(userId, assessmentHistory) {
  try {
    if (assessmentHistory.length === 0) {
      return {
        trend: 'no_data',
        averageRisk: 0,
        improvementAreas: [],
        strengths: []
      };
    }

    const scores = assessmentHistory.map(a => a.overallRiskScore);
    const latestScore = scores[0];
    const averageRisk = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Calculate trend
    let trend = 'stable';
    if (assessmentHistory.length >= 2) {
      const scoreChange = scores[0] - scores[1];
      if (scoreChange > 10) trend = 'worsening';
      else if (scoreChange < -10) trend = 'improving';
    }

    // Identify improvement areas (highest risk categories)
    const latestAssessment = assessmentHistory[0];
    const categoryScores = latestAssessment.categoryScores || {};
    
    const improvementAreas = Object.entries(categoryScores)
      .filter(([_, score]) => score >= 60)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([category, score]) => ({
        category: formatCategoryName(category),
        score,
        priority: score >= 80 ? 'high' : 'medium'
      }));

    // Identify strengths (lowest risk categories)
    const strengths = Object.entries(categoryScores)
      .filter(([_, score]) => score <= 40)
      .sort(([_, a], [__, b]) => a - b)
      .slice(0, 3)
      .map(([category, score]) => ({
        category: formatCategoryName(category),
        score
      }));

    return {
      trend,
      averageRisk: Math.round(averageRisk),
      currentRisk: latestScore,
      improvementAreas,
      strengths,
      assessmentCount: assessmentHistory.length
    };

  } catch (error) {
    console.error('Error calculating insights:', error);
    return {
      trend: 'unknown',
      averageRisk: 0,
      improvementAreas: [],
      strengths: []
    };
  }
}

// Helper function to format category names
function formatCategoryName(category) {
  const nameMap = {
    mentalHealth: 'Mental Health',
    physicalHealth: 'Physical Health',
    lifestyle: 'Lifestyle',
    medication: 'Medication',
    social: 'Social',
    environmental: 'Environmental'
  };
  return nameMap[category] || category;
}

// Helper function to create risk notifications
async function createRiskNotifications(userId, assessment) {
  try {
    const { createNotification } = await import('@/services/notificationService');

    // Critical risk notification
    if (assessment.riskLevel === 'critical') {
      await createNotification(
        userId,
        'risk_alert',
        `Critical health risk detected (${assessment.overallRiskScore}/100). Immediate attention recommended.`,
        'app',
        {
          assessmentId: assessment._id,
          riskLevel: assessment.riskLevel,
          riskScore: assessment.overallRiskScore,
          priority: 'critical'
        }
      );
    }

    // Critical alerts notifications
    const criticalAlerts = assessment.alerts.filter(alert => alert.priority === 'critical');
    for (const alert of criticalAlerts) {
      await createNotification(
        userId,
        'health_alert',
        alert.message,
        'app',
        {
          assessmentId: assessment._id,
          alertType: alert.type,
          priority: 'critical'
        }
      );
    }

  } catch (error) {
    console.error('Error creating risk notifications:', error);
  }
}

// Helper function to update health trends
async function updateHealthTrends(userId, assessment) {
  try {
    const HealthTrend = (await import('@/models/HealthTrend')).default;

    // Update overall wellbeing trend
    let overallTrend = await HealthTrend.findOne({
      userId,
      metricName: 'overall_wellbeing',
      isActive: true
    });

    if (!overallTrend) {
      overallTrend = new HealthTrend({
        userId,
        metricName: 'overall_wellbeing',
        category: 'mental_health',
        timeframe: 'daily'
      });
    }

    // Add new data point (inverse of risk score for wellbeing)
    const wellbeingScore = 100 - assessment.overallRiskScore;
    await overallTrend.addDataPoint(wellbeingScore, 'risk_assessment', {
      assessmentId: assessment._id,
      riskLevel: assessment.riskLevel
    });

    // Calculate analytics
    overallTrend.calculateAnalytics();
    await overallTrend.save();

  } catch (error) {
    console.error('Error updating health trends:', error);
  }
}