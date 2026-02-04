import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HealthTrend from '@/models/HealthTrend';
import MentalHealth from '@/models/MentalHealth';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = authResult.userId;
    const category = searchParams.get('category');
    const metricName = searchParams.get('metric');
    const timeframe = searchParams.get('timeframe') || 'daily';
    const days = parseInt(searchParams.get('days')) || 30;
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';

    await connectDB();

    let trends = [];

    if (metricName) {
      // Get specific metric trend
      const trend = await HealthTrend.findOne({
        userId,
        metricName,
        isActive: true
      });
      
      if (trend) {
        trends = [trend];
      }
    } else if (category) {
      // Get trends by category
      trends = await HealthTrend.getUserTrendsByCategory(userId, category);
    } else {
      // Get all active trends
      trends = await HealthTrend.find({
        userId,
        isActive: true
      }).sort({ category: 1, metricName: 1 });
    }

    // Filter data points by timeframe
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const processedTrends = trends.map(trend => {
      const filteredDataPoints = trend.dataPoints.filter(dp => 
        dp.timestamp >= cutoffDate
      );

      const processedTrend = {
        _id: trend._id,
        metricName: trend.metricName,
        category: trend.category,
        timeframe: trend.timeframe,
        dataPoints: filteredDataPoints,
        trendStatus: trend.trendStatus,
        dataFreshness: trend.dataFreshness
      };

      if (includeAnalytics) {
        processedTrend.analytics = trend.analytics;
        processedTrend.predictions = trend.predictions;
        processedTrend.patterns = trend.patterns;
        processedTrend.targets = trend.targets;
        processedTrend.correlations = trend.correlations;
      }

      return processedTrend;
    });

    // Get trend insights
    const insights = await generateTrendInsights(userId, processedTrends, days);

    return NextResponse.json({
      success: true,
      trends: processedTrends,
      insights,
      total: processedTrends.length
    });

  } catch (error) {
    console.error('Error fetching health trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health trends' },
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
    const { 
      metricName, 
      category, 
      value, 
      source = 'manual',
      context = {},
      timeframe = 'daily'
    } = body;

    if (!metricName || !category || value === undefined) {
      return NextResponse.json(
        { error: 'metricName, category, and value are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find or create trend
    let trend = await HealthTrend.findOne({
      userId,
      metricName,
      category,
      isActive: true
    });

    if (!trend) {
      trend = new HealthTrend({
        userId,
        metricName,
        category,
        timeframe,
        dataPoints: [],
        analytics: {},
        predictions: {},
        correlations: [],
        patterns: [],
        targets: getDefaultTargets(metricName),
        dataQuality: {
          completeness: 0,
          consistency: 0,
          gapAnalysis: {
            longestGap: 0,
            averageGap: 0,
            totalGaps: 0
          }
        }
      });
    }

    // Add data point
    await trend.addDataPoint(value, source, context);

    // Recalculate analytics
    trend.calculateAnalytics();

    // Update data quality metrics
    updateDataQuality(trend);

    // Check for patterns
    await detectPatterns(trend);

    // Update correlations if multiple trends exist
    await updateCorrelations(userId, trend);

    await trend.save();

    return NextResponse.json({
      success: true,
      message: 'Trend data point added successfully',
      trend: {
        _id: trend._id,
        metricName: trend.metricName,
        currentValue: trend.analytics.currentValue,
        trendDirection: trend.analytics.trendDirection,
        trendStatus: trend.trendStatus
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding trend data:', error);
    return NextResponse.json(
      { error: 'Failed to add trend data' },
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
    const { trendId, targets, isActive } = body;

    if (!trendId) {
      return NextResponse.json(
        { error: 'Trend ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const trend = await HealthTrend.findById(trendId);
    if (!trend) {
      return NextResponse.json(
        { error: 'Trend not found' },
        { status: 404 }
      );
    }

    // Verify user owns this trend
    if (trend.userId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update allowed fields
    if (targets) {
      trend.targets = { ...trend.targets, ...targets };
    }
    
    if (typeof isActive === 'boolean') {
      trend.isActive = isActive;
    }

    await trend.save();

    return NextResponse.json({
      success: true,
      message: 'Trend updated successfully',
      trend
    });

  } catch (error) {
    console.error('Error updating trend:', error);
    return NextResponse.json(
      { error: 'Failed to update trend' },
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
    const trendId = searchParams.get('id');

    if (!trendId) {
      return NextResponse.json(
        { error: 'Trend ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const trend = await HealthTrend.findById(trendId);
    if (!trend) {
      return NextResponse.json(
        { error: 'Trend not found' },
        { status: 404 }
      );
    }

    // Verify user owns this trend
    if (trend.userId.toString() !== authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Deactivate instead of deleting for data integrity
    trend.isActive = false;
    await trend.save();

    return NextResponse.json({
      success: true,
      message: 'Trend deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating trend:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate trend' },
      { status: 500 }
    );
  }
}

// Helper function to generate trend insights
async function generateTrendInsights(userId, trends, days) {
  try {
    const insights = {
      overview: {
        totalMetrics: trends.length,
        improvingTrends: 0,
        decliningTrends: 0,
        stableTrends: 0,
        criticalTrends: 0
      },
      highlights: [],
      recommendations: [],
      correlationInsights: []
    };

    // Analyze each trend
    for (const trend of trends) {
      if (trend.analytics) {
        switch (trend.analytics.trendDirection) {
          case 'improving':
            insights.overview.improvingTrends++;
            break;
          case 'declining':
            insights.overview.decliningTrends++;
            break;
          default:
            insights.overview.stableTrends++;
        }

        if (trend.trendStatus === 'critical') {
          insights.overview.criticalTrends++;
        }

        // Generate highlights
        if (trend.analytics.trendDirection === 'improving' && trend.analytics.trendStrength > 0.7) {
          insights.highlights.push({
            type: 'positive',
            metric: trend.metricName,
            message: `${formatMetricName(trend.metricName)} has been improving significantly`,
            value: trend.analytics.changePercentage
          });
        }

        if (trend.analytics.trendDirection === 'declining' && trend.analytics.trendStrength > 0.7) {
          insights.highlights.push({
            type: 'warning',
            metric: trend.metricName,
            message: `${formatMetricName(trend.metricName)} has been declining`,
            value: trend.analytics.changePercentage
          });
        }

        // Generate recommendations
        if (trend.trendStatus === 'critical' || trend.trendStatus === 'warning') {
          insights.recommendations.push({
            metric: trend.metricName,
            priority: trend.trendStatus === 'critical' ? 'high' : 'medium',
            recommendation: generateMetricRecommendation(trend.metricName, trend.analytics)
          });
        }
      }

      // Analyze correlations
      if (trend.correlations && trend.correlations.length > 0) {
        const strongCorrelations = trend.correlations.filter(c => 
          c.strength === 'strong' && Math.abs(c.correlationCoefficient) > 0.7
        );

        for (const correlation of strongCorrelations) {
          insights.correlationInsights.push({
            metric1: trend.metricName,
            metric2: correlation.metricName,
            strength: correlation.correlationCoefficient,
            type: correlation.correlationCoefficient > 0 ? 'positive' : 'negative',
            insight: generateCorrelationInsight(trend.metricName, correlation)
          });
        }
      }
    }

    return insights;

  } catch (error) {
    console.error('Error generating trend insights:', error);
    return {
      overview: { totalMetrics: 0, improvingTrends: 0, decliningTrends: 0, stableTrends: 0, criticalTrends: 0 },
      highlights: [],
      recommendations: [],
      correlationInsights: []
    };
  }
}

// Helper function to get default targets for metrics
function getDefaultTargets(metricName) {
  const defaultTargets = {
    stress_level: {
      idealRange: { min: 0, max: 4 },
      warningThresholds: { lower: 0, upper: 6 },
      criticalThresholds: { lower: 0, upper: 8 }
    },
    anxiety_level: {
      idealRange: { min: 0, max: 3 },
      warningThresholds: { lower: 0, upper: 5 },
      criticalThresholds: { lower: 0, upper: 7 }
    },
    sleep_quality: {
      idealRange: { min: 7, max: 9 },
      warningThresholds: { lower: 6, upper: 10 },
      criticalThresholds: { lower: 4, upper: 12 }
    },
    energy_level: {
      idealRange: { min: 6, max: 10 },
      warningThresholds: { lower: 4, upper: 10 },
      criticalThresholds: { lower: 2, upper: 10 }
    },
    mood_score: {
      idealRange: { min: 6, max: 10 },
      warningThresholds: { lower: 4, upper: 10 },
      criticalThresholds: { lower: 2, upper: 10 }
    }
  };

  return defaultTargets[metricName] || {
    idealRange: { min: 5, max: 10 },
    warningThresholds: { lower: 3, upper: 10 },
    criticalThresholds: { lower: 1, upper: 10 }
  };
}

// Helper function to update data quality metrics
function updateDataQuality(trend) {
  const dataPoints = trend.dataPoints;
  if (dataPoints.length === 0) return;

  // Calculate completeness based on expected frequency
  const firstPoint = dataPoints[0];
  const lastPoint = dataPoints[dataPoints.length - 1];
  const daysDiff = (lastPoint.timestamp - firstPoint.timestamp) / (1000 * 60 * 60 * 24);
  const expectedPoints = Math.ceil(daysDiff) + 1; // Daily expected
  
  trend.dataQuality.completeness = Math.min(dataPoints.length / expectedPoints, 1);

  // Calculate consistency (coefficient of variation)
  const values = dataPoints.map(dp => dp.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  trend.dataQuality.consistency = Math.max(0, 1 - cv); // Higher consistency = lower CV

  // Update last data point
  trend.dataQuality.lastDataPoint = lastPoint.timestamp;
}

// Helper function to detect patterns
async function detectPatterns(trend) {
  const dataPoints = trend.dataPoints;
  if (dataPoints.length < 7) return; // Need at least a week of data

  const patterns = [];

  // Simple weekly pattern detection
  const values = dataPoints.map(dp => dp.value);
  const weeklyPattern = detectWeeklyPattern(values);
  if (weeklyPattern.detected) {
    patterns.push({
      type: 'cyclical',
      description: 'Weekly pattern detected',
      confidence: weeklyPattern.confidence,
      frequency: '7 days'
    });
  }

  trend.patterns = patterns;
}

// Helper function to detect weekly patterns
function detectWeeklyPattern(values) {
  if (values.length < 14) return { detected: false, confidence: 0 };

  // Simple autocorrelation for weekly pattern
  const weeklyLag = 7;
  if (values.length <= weeklyLag) return { detected: false, confidence: 0 };

  const correlation = calculateAutocorrelation(values, weeklyLag);
  
  return {
    detected: correlation > 0.5,
    confidence: correlation
  };
}

// Helper function to calculate autocorrelation
function calculateAutocorrelation(values, lag) {
  const n = values.length - lag;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (values[i] - mean) * (values[i + lag] - mean);
  }
  
  for (let i = 0; i < values.length; i++) {
    denominator += Math.pow(values[i] - mean, 2);
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Helper function to update correlations
async function updateCorrelations(userId, targetTrend) {
  try {
    // Get other trends for the user
    const otherTrends = await HealthTrend.find({
      userId,
      isActive: true,
      _id: { $ne: targetTrend._id }
    });

    const correlations = [];

    for (const otherTrend of otherTrends) {
      if (targetTrend.dataPoints.length >= 10 && otherTrend.dataPoints.length >= 10) {
        const correlation = calculateTrendCorrelation(targetTrend, otherTrend);
        if (Math.abs(correlation) > 0.3) { // Only significant correlations
          correlations.push({
            metricName: otherTrend.metricName,
            correlationCoefficient: correlation,
            strength: Math.abs(correlation) > 0.7 ? 'strong' : 
                     Math.abs(correlation) > 0.5 ? 'moderate' : 'weak',
            significance: Math.abs(correlation) > 0.5
          });
        }
      }
    }

    targetTrend.correlations = correlations;

  } catch (error) {
    console.error('Error updating correlations:', error);
  }
}

// Helper function to calculate correlation between trends
function calculateTrendCorrelation(trend1, trend2) {
  // Align data points by timestamp
  const alignedData = alignTrendData(trend1.dataPoints, trend2.dataPoints);
  
  if (alignedData.length < 5) return 0; // Need at least 5 aligned points

  const values1 = alignedData.map(d => d.value1);
  const values2 = alignedData.map(d => d.value2);

  return calculateCorrelation(values1, values2);
}

// Helper function to align trend data by timestamp
function alignTrendData(dataPoints1, dataPoints2) {
  const aligned = [];
  
  for (const dp1 of dataPoints1) {
    const dp2 = dataPoints2.find(dp => 
      Math.abs(dp.timestamp - dp1.timestamp) < 24 * 60 * 60 * 1000 // Within 24 hours
    );
    
    if (dp2) {
      aligned.push({
        timestamp: dp1.timestamp,
        value1: dp1.value,
        value2: dp2.value
      });
    }
  }
  
  return aligned;
}

// Helper function to calculate correlation coefficient
function calculateCorrelation(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;
  
  const n = arr1.length;
  const sum1 = arr1.reduce((a, b) => a + b, 0);
  const sum2 = arr2.reduce((a, b) => a + b, 0);
  const sum1Sq = arr1.reduce((a, b) => a + b * b, 0);
  const sum2Sq = arr2.reduce((a, b) => a + b * b, 0);
  const pSum = arr1.reduce((acc, val, i) => acc + val * arr2[i], 0);
  
  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
  
  return den === 0 ? 0 : num / den;
}

// Helper function to format metric names
function formatMetricName(metricName) {
  const nameMap = {
    stress_level: 'Stress Level',
    anxiety_level: 'Anxiety Level',
    depression_score: 'Depression Score',
    sleep_quality: 'Sleep Quality',
    energy_level: 'Energy Level',
    mood_score: 'Mood Score',
    overall_wellbeing: 'Overall Wellbeing'
  };
  return nameMap[metricName] || metricName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper function to generate metric recommendations
function generateMetricRecommendation(metricName, analytics) {
  const recommendations = {
    stress_level: 'Consider stress management techniques like meditation, deep breathing exercises, or consulting with a healthcare provider.',
    anxiety_level: 'Practice relaxation techniques, consider therapy, or speak with a mental health professional.',
    sleep_quality: 'Improve sleep hygiene: maintain regular sleep schedule, avoid screens before bedtime, create comfortable sleep environment.',
    energy_level: 'Focus on nutrition, regular exercise, adequate sleep, and consider consulting with a healthcare provider.',
    mood_score: 'Engage in activities you enjoy, maintain social connections, consider therapy or counseling if mood persists low.'
  };

  return recommendations[metricName] || 'Monitor this metric closely and consider consulting with a healthcare provider if concerning patterns continue.';
}

// Helper function to generate correlation insights
function generateCorrelationInsight(metric1, correlation) {
  const direction = correlation.correlationCoefficient > 0 ? 'increases' : 'decreases';
  const strength = correlation.strength;
  
  return `${formatMetricName(metric1)} has a ${strength} correlation with ${formatMetricName(correlation.metricName)}. When one ${direction}, the other tends to follow.`;
}