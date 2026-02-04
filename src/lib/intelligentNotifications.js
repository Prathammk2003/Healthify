import { connectDB } from './db.js';
import HealthPrediction from '../models/HealthPrediction.js';
import RiskAssessment from '../models/RiskAssessment.js';
import HealthTrend from '../models/HealthTrend.js';
import Notification from '../models/Notification.js';
import { sendSMS, sendEmail, createNotification } from '../services/notificationService.js';
import UserProfile from '../models/UserProfile.js';
import User from '../models/User.js';

/**
 * Intelligent Notification System
 * Sends proactive, personalized health alerts based on predictive analytics
 */
class IntelligentNotificationSystem {
  constructor() {
    this.notificationRules = {
      // Critical health risks
      critical_risk: {
        priority: 'critical',
        channels: ['app', 'sms'],
        cooldown: 2 * 60 * 60 * 1000, // 2 hours
        template: 'critical_health_risk'
      },
      // High risk predictions
      high_risk_prediction: {
        priority: 'high',
        channels: ['app', 'sms'],
        cooldown: 6 * 60 * 60 * 1000, // 6 hours
        template: 'high_risk_prediction'
      },
      // Declining health trends
      declining_trend: {
        priority: 'medium',
        channels: ['app'],
        cooldown: 24 * 60 * 60 * 1000, // 24 hours
        template: 'declining_trend'
      },
      // Positive improvements
      positive_trend: {
        priority: 'low',
        channels: ['app'],
        cooldown: 7 * 24 * 60 * 60 * 1000, // 7 days
        template: 'positive_improvement'
      },
      // Early intervention opportunities
      early_intervention: {
        priority: 'medium',
        channels: ['app'],
        cooldown: 12 * 60 * 60 * 1000, // 12 hours
        template: 'early_intervention'
      },
      // Pattern-based alerts
      pattern_alert: {
        priority: 'medium',
        channels: ['app'],
        cooldown: 48 * 60 * 60 * 1000, // 48 hours
        template: 'pattern_detected'
      }
    };

    this.templates = {
      critical_health_risk: {
        title: '🚨 Critical Health Alert',
        getMessage: (data) => 
          `Critical health risk detected (${data.riskScore}/100). Please seek immediate medical attention. Your safety is our priority.`,
        actionText: 'View Details',
        actionUrl: '/dashboard/predictive-analytics'
      },
      high_risk_prediction: {
        title: '⚠️ High Risk Alert',
        getMessage: (data) => 
          `High ${data.predictionType.replace(/_/g, ' ')} risk predicted (${data.riskScore}/100). Consider taking preventive action.`,
        actionText: 'View Recommendations',
        actionUrl: '/dashboard/predictive-analytics'
      },
      declining_trend: {
        title: '📉 Health Trend Alert',
        getMessage: (data) => 
          `Your ${data.metricName.replace(/_/g, ' ')} has been declining recently. Let's work on improving this together.`,
        actionText: 'View Trends',
        actionUrl: '/dashboard/predictive-analytics'
      },
      positive_improvement: {
        title: '🎉 Great Progress!',
        getMessage: (data) => 
          `Excellent work! Your ${data.metricName.replace(/_/g, ' ')} has improved by ${data.improvement}%. Keep it up!`,
        actionText: 'See Progress',
        actionUrl: '/dashboard/predictive-analytics'
      },
      early_intervention: {
        title: '💡 Health Opportunity',
        getMessage: (data) => 
          `We've identified an opportunity to improve your ${data.area}. Small changes now can prevent bigger issues later.`,
        actionText: 'Learn More',
        actionUrl: '/dashboard/predictive-analytics'
      },
      pattern_detected: {
        title: '🔍 Pattern Detected',
        getMessage: (data) => 
          `We've noticed a ${data.patternType} pattern in your ${data.metricName.replace(/_/g, ' ')}. Understanding this can help optimize your health.`,
        actionText: 'Explore Pattern',
        actionUrl: '/dashboard/predictive-analytics'
      }
    };
  }

  /**
   * Process all intelligent notifications
   */
  async processIntelligentNotifications() {
    try {
      console.log('🧠 Processing intelligent notifications...');
      await connectDB();

      // Get all users with recent analytics data
      const usersToProcess = await this.getUsersWithRecentAnalytics();
      console.log(`Found ${usersToProcess.length} users to process`);

      let notificationsSent = 0;
      let errors = 0;

      for (const userId of usersToProcess) {
        try {
          const notifications = await this.processUserNotifications(userId);
          notificationsSent += notifications;
        } catch (error) {
          console.error(`Error processing notifications for user ${userId}:`, error);
          errors++;
        }
      }

      console.log(`✅ Intelligent notifications completed:`);
      console.log(`📧 Notifications sent: ${notificationsSent}`);
      console.log(`❌ Errors: ${errors}`);

      return { notificationsSent, errors };

    } catch (error) {
      console.error('Error in intelligent notification processing:', error);
      throw error;
    }
  }

  /**
   * Process notifications for a specific user
   */
  async processUserNotifications(userId) {
    let notificationCount = 0;

    // Check for critical risk assessments
    notificationCount += await this.checkCriticalRisks(userId);

    // Check for high-risk predictions
    notificationCount += await this.checkHighRiskPredictions(userId);

    // Check for declining trends
    notificationCount += await this.checkDecliningTrends(userId);

    // Check for positive improvements
    notificationCount += await this.checkPositiveImprovements(userId);

    // Check for early intervention opportunities
    notificationCount += await this.checkEarlyInterventions(userId);

    // Check for pattern-based alerts
    notificationCount += await this.checkPatternAlerts(userId);

    return notificationCount;
  }

  /**
   * Check for critical risk assessments
   */
  async checkCriticalRisks(userId) {
    try {
      const latestAssessment = await RiskAssessment.getLatestAssessment(userId);
      
      if (!latestAssessment || latestAssessment.riskLevel !== 'critical') {
        return 0;
      }

      // Check if we've already sent a critical risk notification recently
      const recentNotification = await this.hasRecentNotification(
        userId, 
        'critical_risk', 
        this.notificationRules.critical_risk.cooldown
      );

      if (recentNotification) {
        return 0;
      }

      const notificationData = {
        type: 'critical_risk',
        riskScore: latestAssessment.overallRiskScore,
        riskLevel: latestAssessment.riskLevel,
        assessmentId: latestAssessment._id
      };

      await this.sendIntelligentNotification(userId, 'critical_risk', notificationData);
      return 1;

    } catch (error) {
      console.error(`Error checking critical risks for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check for high-risk predictions
   */
  async checkHighRiskPredictions(userId) {
    try {
      const highRiskPredictions = await HealthPrediction.find({
        userId,
        isActive: true,
        riskScore: { $gte: 70 },
        validUntil: { $gt: new Date() }
      }).sort({ riskScore: -1 });

      let notificationCount = 0;

      for (const prediction of highRiskPredictions) {
        const recentNotification = await this.hasRecentNotification(
          userId,
          `high_risk_${prediction.predictionType}`,
          this.notificationRules.high_risk_prediction.cooldown
        );

        if (!recentNotification) {
          const notificationData = {
            type: 'high_risk_prediction',
            predictionType: prediction.predictionType,
            riskScore: prediction.riskScore,
            confidence: prediction.confidence,
            recommendations: prediction.recommendations?.slice(0, 3) || []
          };

          await this.sendIntelligentNotification(userId, 'high_risk_prediction', notificationData);
          notificationCount++;
        }
      }

      return notificationCount;

    } catch (error) {
      console.error(`Error checking high-risk predictions for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check for declining trends
   */
  async checkDecliningTrends(userId) {
    try {
      const decliningTrends = await HealthTrend.find({
        userId,
        isActive: true,
        'analytics.trendDirection': 'declining',
        'analytics.trendStrength': { $gte: 0.6 } // Strong declining trend
      });

      let notificationCount = 0;

      for (const trend of decliningTrends) {
        const recentNotification = await this.hasRecentNotification(
          userId,
          `declining_${trend.metricName}`,
          this.notificationRules.declining_trend.cooldown
        );

        if (!recentNotification) {
          const notificationData = {
            type: 'declining_trend',
            metricName: trend.metricName,
            trendStrength: trend.analytics.trendStrength,
            changePercentage: trend.analytics.changePercentage,
            currentValue: trend.analytics.currentValue
          };

          await this.sendIntelligentNotification(userId, 'declining_trend', notificationData);
          notificationCount++;
        }
      }

      return notificationCount;

    } catch (error) {
      console.error(`Error checking declining trends for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check for positive improvements
   */
  async checkPositiveImprovements(userId) {
    try {
      const improvingTrends = await HealthTrend.find({
        userId,
        isActive: true,
        'analytics.trendDirection': 'improving',
        'analytics.trendStrength': { $gte: 0.7 }, // Strong improvement
        'analytics.changePercentage': { $gte: 15 } // At least 15% improvement
      });

      let notificationCount = 0;

      for (const trend of improvingTrends) {
        const recentNotification = await this.hasRecentNotification(
          userId,
          `positive_${trend.metricName}`,
          this.notificationRules.positive_trend.cooldown
        );

        if (!recentNotification) {
          const notificationData = {
            type: 'positive_improvement',
            metricName: trend.metricName,
            improvement: Math.abs(trend.analytics.changePercentage),
            trendStrength: trend.analytics.trendStrength
          };

          await this.sendIntelligentNotification(userId, 'positive_trend', notificationData);
          notificationCount++;
        }
      }

      return notificationCount;

    } catch (error) {
      console.error(`Error checking positive improvements for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check for early intervention opportunities
   */
  async checkEarlyInterventions(userId) {
    try {
      // Look for trends that are stable but approaching warning thresholds
      const riskyTrends = await HealthTrend.find({
        userId,
        isActive: true,
        'analytics.trendDirection': 'stable'
      });

      let notificationCount = 0;

      for (const trend of riskyTrends) {
        const currentValue = trend.analytics.currentValue;
        const warningUpper = trend.targets?.warningThresholds?.upper;
        const warningLower = trend.targets?.warningThresholds?.lower;

        let needsIntervention = false;
        let area = '';

        if (warningUpper && currentValue >= warningUpper * 0.8) {
          needsIntervention = true;
          area = trend.metricName.replace(/_/g, ' ');
        } else if (warningLower && currentValue <= warningLower * 1.2) {
          needsIntervention = true;
          area = trend.metricName.replace(/_/g, ' ');
        }

        if (needsIntervention) {
          const recentNotification = await this.hasRecentNotification(
            userId,
            `intervention_${trend.metricName}`,
            this.notificationRules.early_intervention.cooldown
          );

          if (!recentNotification) {
            const notificationData = {
              type: 'early_intervention',
              area,
              metricName: trend.metricName,
              currentValue,
              targetRange: trend.targets?.idealRange
            };

            await this.sendIntelligentNotification(userId, 'early_intervention', notificationData);
            notificationCount++;
          }
        }
      }

      return notificationCount;

    } catch (error) {
      console.error(`Error checking early interventions for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check for pattern-based alerts
   */
  async checkPatternAlerts(userId) {
    try {
      const trendsWithPatterns = await HealthTrend.find({
        userId,
        isActive: true,
        'patterns.0': { $exists: true } // Has at least one pattern
      });

      let notificationCount = 0;

      for (const trend of trendsWithPatterns) {
        for (const pattern of trend.patterns) {
          if (pattern.confidence >= 0.7) {
            const recentNotification = await this.hasRecentNotification(
              userId,
              `pattern_${trend.metricName}_${pattern.type}`,
              this.notificationRules.pattern_alert.cooldown
            );

            if (!recentNotification) {
              const notificationData = {
                type: 'pattern_detected',
                metricName: trend.metricName,
                patternType: pattern.type,
                confidence: pattern.confidence,
                description: pattern.description
              };

              await this.sendIntelligentNotification(userId, 'pattern_alert', notificationData);
              notificationCount++;
            }
          }
        }
      }

      return notificationCount;

    } catch (error) {
      console.error(`Error checking pattern alerts for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Send intelligent notification
   */
  async sendIntelligentNotification(userId, notificationType, data) {
    try {
      const rule = this.notificationRules[notificationType];
      const template = this.templates[rule.template];

      if (!rule || !template) {
        console.error(`Invalid notification type or template: ${notificationType}`);
        return;
      }

      const message = template.getMessage(data);
      const title = template.title;

      // Create in-app notification
      await createNotification(
        userId,
        'health_intelligence',
        message,
        'app',
        {
          ...data,
          title,
          actionText: template.actionText,
          actionUrl: template.actionUrl,
          priority: rule.priority,
          intelligentType: notificationType
        }
      );

      // Send SMS if required and user has phone number
      if (rule.channels.includes('sms')) {
        await this.sendSMSNotification(userId, title, message);
      }

      // Send email if required
      if (rule.channels.includes('email')) {
        await this.sendEmailNotification(userId, title, message, data);
      }

      console.log(`✅ Sent ${notificationType} notification to user ${userId}`);

    } catch (error) {
      console.error(`Error sending intelligent notification:`, error);
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, title, message) {
    try {
      const userProfile = await UserProfile.findOne({ userId });
      
      if (userProfile && userProfile.contactNumber) {
        await sendSMS({
          phoneNumber: userProfile.contactNumber,
          message: `${title}: ${message}`
        });
      }
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, title, message, data) {
    try {
      const user = await User.findById(userId);
      
      if (user && user.email) {
        const emailContent = this.generateEmailContent(title, message, data);
        
        await sendEmail({
          to: user.email,
          subject: title,
          html: emailContent
        });
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  /**
   * Generate rich email content
   */
  generateEmailContent(title, message, data) {
    return `
      <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
        <div style=\"background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;\">
          <h1 style=\"margin: 0;\">${title}</h1>
        </div>
        <div style=\"padding: 20px; background: #f8f9fa;\">
          <p style=\"font-size: 16px; line-height: 1.6;\">${message}</p>
          
          <div style=\"background: white; padding: 15px; border-radius: 8px; margin: 20px 0;\">
            <h3>Quick Actions:</h3>
            <a href=\"https://your-domain.com/dashboard/predictive-analytics\" 
               style=\"display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;\">
              View Analytics Dashboard
            </a>
            <a href=\"https://your-domain.com/dashboard/mental-health\" 
               style=\"display: inline-block; background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;\">
              Update Health Data
            </a>
          </div>
          
          <p style=\"font-size: 14px; color: #666;\">
            This is an automated health intelligence notification. If you need immediate medical attention, please contact emergency services.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Check if user has recent notification of this type
   */
  async hasRecentNotification(userId, notificationKey, cooldownMs) {
    try {
      const cutoffTime = new Date(Date.now() - cooldownMs);
      
      const recentNotification = await Notification.findOne({
        userId,
        'metadata.intelligentType': notificationKey,
        createdAt: { $gte: cutoffTime }
      });

      return !!recentNotification;
    } catch (error) {
      console.error('Error checking recent notifications:', error);
      return false;
    }
  }

  /**
   * Get users with recent analytics data
   */
  async getUsersWithRecentAnalytics() {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      
      const [usersWithPredictions, usersWithAssessments, usersWithTrends] = await Promise.all([
        HealthPrediction.distinct('userId', { 
          createdAt: { $gte: cutoffDate },
          isActive: true 
        }),
        RiskAssessment.distinct('userId', { 
          createdAt: { $gte: cutoffDate } 
        }),
        HealthTrend.distinct('userId', { 
          lastCalculated: { $gte: cutoffDate },
          isActive: true 
        })
      ]);

      // Combine and deduplicate user IDs
      const allUsers = new Set([
        ...usersWithPredictions,
        ...usersWithAssessments,
        ...usersWithTrends
      ]);

      return Array.from(allUsers);
    } catch (error) {
      console.error('Error getting users with recent analytics:', error);
      return [];
    }
  }

  /**
   * Process notifications for a specific user (public method)
   */
  async processUserIntelligentNotifications(userId) {
    try {
      await connectDB();
      return await this.processUserNotifications(userId);
    } catch (error) {
      console.error(`Error processing intelligent notifications for user ${userId}:`, error);
      throw error;
    }
  }
}

export default IntelligentNotificationSystem;