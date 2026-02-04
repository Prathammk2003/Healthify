/**
 * Analytics Integration Script
 * This script migrates existing mental health data to the new predictive analytics system
 * and generates initial health trends and predictions for existing users.
 */

import { connectDB } from '../lib/db.js';
import MentalHealth from '../models/MentalHealth.js';
import HealthTrend from '../models/HealthTrend.js';
import RiskAssessment from '../models/RiskAssessment.js';
import HealthPrediction from '../models/HealthPrediction.js';
import HealthAnalyticsEngine from '../lib/healthAnalytics.js';
import RiskAssessmentEngine from '../lib/riskAssessment.js';

class AnalyticsIntegration {
  constructor() {
    this.analyticsEngine = new HealthAnalyticsEngine();
    this.riskEngine = new RiskAssessmentEngine();
  }

  /**
   * Main integration function
   */
  async integrateAnalytics() {
    try {
      console.log('🚀 Starting analytics integration...');
      await connectDB();

      // Get all users who have mental health data
      const usersWithData = await this.getUsersWithMentalHealthData();
      console.log(`📊 Found ${usersWithData.length} users with mental health data`);

      let successCount = 0;
      let errorCount = 0;

      for (const userId of usersWithData) {
        try {
          console.log(`\n👤 Processing user: ${userId}`);
          
          // Create health trends from existing data
          await this.createHealthTrendsForUser(userId);
          
          // Generate risk assessment
          await this.generateRiskAssessmentForUser(userId);
          
          // Generate predictions
          await this.generatePredictionsForUser(userId);
          
          successCount++;
          console.log(`✅ Successfully processed user ${userId}`);
          
        } catch (error) {
          console.error(`❌ Error processing user ${userId}:`, error.message);
          errorCount++;
        }
      }

      console.log(`\n🎉 Integration completed!`);
      console.log(`✅ Successfully processed: ${successCount} users`);
      console.log(`❌ Errors: ${errorCount} users`);

    } catch (error) {
      console.error('💥 Integration failed:', error);
      throw error;
    }
  }

  /**
   * Get all users who have mental health data
   */
  async getUsersWithMentalHealthData() {
    const users = await MentalHealth.distinct('userId');
    return users;
  }

  /**
   * Create health trends for a user from existing mental health data
   */
  async createHealthTrendsForUser(userId) {
    console.log(`  📈 Creating health trends for user ${userId}`);
    
    // Get all mental health data for the user
    const mentalHealthData = await MentalHealth.find({ userId })
      .sort({ createdAt: 1 }); // Oldest first

    if (mentalHealthData.length === 0) {
      console.log(`  ⚠️ No mental health data found for user ${userId}`);
      return;
    }

    // Define the metrics we want to track
    const metrics = [
      { name: 'stress_level', category: 'mental_health', getValue: (data) => data.stressLevel },
      { name: 'anxiety_level', category: 'mental_health', getValue: (data) => data.anxiety || 0 },
      { name: 'sleep_quality', category: 'lifestyle', getValue: (data) => data.sleepHours },
      { name: 'energy_level', category: 'lifestyle', getValue: (data) => data.energyLevel || 5 },
      { name: 'mood_score', category: 'mental_health', getValue: (data) => this.convertMoodToScore(data.mood) },
      { name: 'social_interaction', category: 'social', getValue: (data) => data.socialInteraction || 5 },
      { name: 'self_esteem', category: 'mental_health', getValue: (data) => data.selfEsteem || 5 },
      { name: 'concentration_level', category: 'mental_health', getValue: (data) => data.concentration || 5 }
    ];

    // Create trends for each metric
    for (const metric of metrics) {
      try {
        // Check if trend already exists
        let trend = await HealthTrend.findOne({
          userId,
          metricName: metric.name,
          isActive: true
        });

        if (!trend) {
          // Create new trend
          trend = new HealthTrend({
            userId,
            metricName: metric.name,
            category: metric.category,
            timeframe: 'daily',
            dataPoints: [],
            analytics: {},
            targets: this.getDefaultTargetsForMetric(metric.name),
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

        // Add historical data points
        for (const dataPoint of mentalHealthData) {
          const value = metric.getValue(dataPoint);
          if (value !== undefined && value !== null) {
            trend.dataPoints.push({
              timestamp: dataPoint.createdAt,
              value: value,
              source: 'mental_health',
              context: {
                mood: dataPoint.mood,
                migrated: true
              }
            });
          }
        }

        // Calculate analytics
        trend.calculateAnalytics();
        
        // Update data quality
        this.updateDataQuality(trend);
        
        // Detect patterns
        await this.detectPatterns(trend);
        
        await trend.save();
        console.log(`    ✅ Created trend for ${metric.name}: ${trend.dataPoints.length} data points`);
        
      } catch (error) {
        console.error(`    ❌ Error creating trend for ${metric.name}:`, error.message);
      }
    }
  }

  /**
   * Generate risk assessment for a user
   */
  async generateRiskAssessmentForUser(userId) {
    try {
      console.log(`  🛡️ Generating risk assessment for user ${userId}`);
      
      const assessment = await this.riskEngine.generateRiskAssessment(userId, 'comprehensive');
      console.log(`    ✅ Risk assessment created: ${assessment.riskLevel} risk (${assessment.overallRiskScore}/100)`);
      
    } catch (error) {
      console.error(`    ❌ Error generating risk assessment:`, error.message);
    }
  }

  /**
   * Generate predictions for a user
   */
  async generatePredictionsForUser(userId) {
    try {
      console.log(`  🔮 Generating predictions for user ${userId}`);
      
      const predictions = await this.analyticsEngine.generatePredictions(userId, '1_week');
      console.log(`    ✅ Generated ${predictions.length} predictions`);
      
      for (const prediction of predictions) {
        console.log(`      - ${prediction.predictionType}: ${prediction.riskScore}/100 risk`);
      }
      
    } catch (error) {
      console.error(`    ❌ Error generating predictions:`, error.message);
    }
  }

  /**
   * Convert mood string to numeric score
   */
  convertMoodToScore(mood) {
    const moodScores = {
      'Happy': 9,
      'Content': 7,
      'Neutral': 5,
      'Anxious': 3,
      'Sad': 2,
      'Stressed': 2
    };
    return moodScores[mood] || 5;
  }

  /**
   * Get default targets for specific metrics
   */
  getDefaultTargetsForMetric(metricName) {
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
      },
      social_interaction: {
        idealRange: { min: 5, max: 10 },
        warningThresholds: { lower: 3, upper: 10 },
        criticalThresholds: { lower: 1, upper: 10 }
      },
      self_esteem: {
        idealRange: { min: 6, max: 10 },
        warningThresholds: { lower: 4, upper: 10 },
        criticalThresholds: { lower: 2, upper: 10 }
      },
      concentration_level: {
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

  /**
   * Update data quality metrics
   */
  updateDataQuality(trend) {
    const dataPoints = trend.dataPoints;
    if (dataPoints.length === 0) return;

    // Calculate completeness based on expected frequency
    const firstPoint = dataPoints[0];
    const lastPoint = dataPoints[dataPoints.length - 1];
    const daysDiff = (lastPoint.timestamp - firstPoint.timestamp) / (1000 * 60 * 60 * 24);
    const expectedPoints = Math.ceil(daysDiff) + 1;
    
    trend.dataQuality.completeness = Math.min(dataPoints.length / expectedPoints, 1);

    // Calculate consistency (coefficient of variation)
    const values = dataPoints.map(dp => dp.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean;
    trend.dataQuality.consistency = Math.max(0, 1 - cv);

    // Update last data point
    trend.dataQuality.lastDataPoint = lastPoint.timestamp;
  }

  /**
   * Detect patterns in the trend data
   */
  async detectPatterns(trend) {
    const dataPoints = trend.dataPoints;
    if (dataPoints.length < 7) return;

    const patterns = [];

    // Simple weekly pattern detection
    const values = dataPoints.map(dp => dp.value);
    const weeklyPattern = this.detectWeeklyPattern(values);
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

  /**
   * Detect weekly patterns
   */
  detectWeeklyPattern(values) {
    if (values.length < 14) return { detected: false, confidence: 0 };

    const weeklyLag = 7;
    if (values.length <= weeklyLag) return { detected: false, confidence: 0 };

    const correlation = this.calculateAutocorrelation(values, weeklyLag);
    
    return {
      detected: correlation > 0.5,
      confidence: correlation
    };
  }

  /**
   * Calculate autocorrelation
   */
  calculateAutocorrelation(values, lag) {
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

  /**
   * Run integration for specific user (for testing)
   */
  async integrateUser(userId) {
    try {
      console.log(`🔧 Running integration for user: ${userId}`);
      await connectDB();
      
      await this.createHealthTrendsForUser(userId);
      await this.generateRiskAssessmentForUser(userId);
      await this.generatePredictionsForUser(userId);
      
      console.log(`✅ Integration completed for user ${userId}`);
      
    } catch (error) {
      console.error(`❌ Integration failed for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up analytics data (for testing/development)
   */
  async cleanupAnalyticsData() {
    try {
      console.log('🧹 Cleaning up analytics data...');
      await connectDB();
      
      const [trendsDeleted, assessmentsDeleted, predictionsDeleted] = await Promise.all([
        HealthTrend.deleteMany({}),
        RiskAssessment.deleteMany({}),
        HealthPrediction.deleteMany({})
      ]);
      
      console.log(`✅ Cleanup completed:`);
      console.log(`  - Health Trends: ${trendsDeleted.deletedCount} deleted`);
      console.log(`  - Risk Assessments: ${assessmentsDeleted.deletedCount} deleted`);
      console.log(`  - Predictions: ${predictionsDeleted.deletedCount} deleted`);
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}

export default AnalyticsIntegration;

// CLI functionality for running the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const integration = new AnalyticsIntegration();
  
  const command = process.argv[2];
  const userId = process.argv[3];
  
  switch (command) {
    case 'integrate':
      if (userId) {
        await integration.integrateUser(userId);
      } else {
        await integration.integrateAnalytics();
      }
      break;
      
    case 'cleanup':
      await integration.cleanupAnalyticsData();
      break;
      
    default:
      console.log(`
📊 Healthcare Analytics Integration Tool
`);
      console.log('Usage:');
      console.log('  node src/scripts/analyticsIntegration.js integrate [userId]  # Integrate all users or specific user');
      console.log('  node src/scripts/analyticsIntegration.js cleanup           # Clean up analytics data');
      console.log('');
      console.log('Examples:');
      console.log('  node src/scripts/analyticsIntegration.js integrate');
      console.log('  node src/scripts/analyticsIntegration.js integrate 507f1f77bcf86cd799439011');
      console.log('  node src/scripts/analyticsIntegration.js cleanup');
  }
  
  process.exit(0);
}