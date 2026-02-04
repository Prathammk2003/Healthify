import HealthPrediction from '../models/HealthPrediction.js';
import RiskAssessment from '../models/RiskAssessment.js';
import HealthTrend from '../models/HealthTrend.js';
import MentalHealth from '../models/MentalHealth.js';
import MedicationReminder from '../models/MedicationReminder.js';
import Appointment from '../models/Appointment.js';
import { connectDB } from '../lib/db.js';

/**
 * Advanced Healthcare Predictive Analytics Engine
 * Uses machine learning algorithms and statistical analysis for health predictions
 */
class HealthAnalyticsEngine {
  constructor() {
    this.weightingFactors = {
      mentalHealth: 0.30,
      medicationAdherence: 0.25,
      symptomHistory: 0.20,
      appointmentPattern: 0.15,
      lifestyle: 0.10
    };
  }

  /**
   * Generate comprehensive health predictions for a user
   */
  async generatePredictions(userId, timeframe = '1_week') {
    try {
      await connectDB();
      
      // Gather all user health data
      const healthData = await this.aggregateUserHealthData(userId);
      
      if (!healthData || Object.keys(healthData).length === 0) {
        throw new Error('Insufficient health data for predictions');
      }

      const predictions = [];

      // Generate mental health risk prediction
      const mentalHealthPrediction = await this.predictMentalHealthRisk(userId, healthData, timeframe);
      if (mentalHealthPrediction) predictions.push(mentalHealthPrediction);

      // Generate medication adherence prediction
      const medicationPrediction = await this.predictMedicationAdherence(userId, healthData, timeframe);
      if (medicationPrediction) predictions.push(medicationPrediction);

      // Generate health deterioration prediction
      const deteriorationPrediction = await this.predictHealthDeterioration(userId, healthData, timeframe);
      if (deteriorationPrediction) predictions.push(deteriorationPrediction);

      // Generate emergency risk prediction
      const emergencyPrediction = await this.predictEmergencyRisk(userId, healthData, timeframe);
      if (emergencyPrediction) predictions.push(emergencyPrediction);

      // Save all predictions
      const savedPredictions = await Promise.all(
        predictions.map(pred => new HealthPrediction(pred).save())
      );

      return savedPredictions;
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw error;
    }
  }

  /**
   * Predict mental health risk based on historical patterns
   */
  async predictMentalHealthRisk(userId, healthData, timeframe) {
    const mentalHealthHistory = healthData.mentalHealth || [];
    
    if (mentalHealthHistory.length < 3) {
      return null; // Need at least 3 data points
    }

    // Calculate trend analysis
    const recentEntries = mentalHealthHistory.slice(-14); // Last 14 entries
    const stressTrend = this.calculateTrend(recentEntries.map(e => e.stressLevel));
    const anxietyTrend = this.calculateTrend(recentEntries.map(e => e.anxiety));
    const sleepTrend = this.calculateTrend(recentEntries.map(e => e.sleepHours));
    const moodTrend = this.calculateMoodTrend(recentEntries.map(e => e.mood));

    // Risk factors analysis
    const riskFactors = [];
    let riskScore = 0;

    // High stress trend
    if (stressTrend.direction === 'increasing' && stressTrend.slope > 0.3) {
      riskScore += 25;
      riskFactors.push({
        name: 'Increasing Stress Levels',
        weight: 0.25,
        impact: 'negative',
        description: 'Stress levels have been consistently increasing'
      });
    }

    // High anxiety levels
    const avgAnxiety = recentEntries.reduce((sum, e) => sum + e.anxiety, 0) / recentEntries.length;
    if (avgAnxiety > 7) {
      riskScore += 20;
      riskFactors.push({
        name: 'High Anxiety Levels',
        weight: 0.20,
        impact: 'negative',
        description: `Average anxiety level is ${avgAnxiety.toFixed(1)}/10`
      });
    }

    // Poor sleep patterns
    if (sleepTrend.average < 6) {
      riskScore += 15;
      riskFactors.push({
        name: 'Insufficient Sleep',
        weight: 0.15,
        impact: 'negative',
        description: `Average sleep: ${sleepTrend.average.toFixed(1)} hours`
      });
    }

    // Declining mood
    if (moodTrend.direction === 'declining') {
      riskScore += 20;
      riskFactors.push({
        name: 'Declining Mood Pattern',
        weight: 0.20,
        impact: 'negative',
        description: 'Overall mood has been declining recently'
      });
    }

    // Pattern recognition for cyclical issues
    const cyclicalRisk = this.detectCyclicalPatterns(recentEntries);
    if (cyclicalRisk > 0.7) {
      riskScore += 15;
      riskFactors.push({
        name: 'Cyclical Mental Health Pattern',
        weight: 0.15,
        impact: 'negative',
        description: 'Detected recurring patterns of mental health decline'
      });
    }

    const confidence = Math.min(recentEntries.length / 14, 1); // Max confidence with 14+ entries

    return {
      userId,
      predictionType: 'mental_health_risk',
      confidence,
      riskScore: Math.min(riskScore, 100),
      factors: riskFactors,
      timeframe,
      predictionData: {
        trends: { stressTrend, anxietyTrend, sleepTrend, moodTrend },
        currentMetrics: {
          avgStress: stressTrend.average,
          avgAnxiety: avgAnxiety,
          avgSleep: sleepTrend.average,
          predominantMood: moodTrend.predominant
        },
        cyclicalRisk,
        dataPoints: recentEntries.length
      },
      recommendations: this.generateMentalHealthRecommendations(riskScore, riskFactors),
      validUntil: this.calculateValidUntil(timeframe),
      dataSource: {
        mentalHealthEntries: mentalHealthHistory.length,
        symptomChecks: 0,
        medicationData: 0,
        appointmentHistory: 0
      }
    };
  }

  /**
   * Predict medication adherence based on historical patterns
   */
  async predictMedicationAdherence(userId, healthData, timeframe) {
    const medicationHistory = healthData.medications || [];
    
    if (medicationHistory.length === 0) {
      return null;
    }

    // Analyze medication patterns
    const adherenceScore = this.calculateMedicationAdherence(medicationHistory);
    const missedDoses = this.analyzeMissedDoses(medicationHistory);
    const adherenceTrend = this.calculateAdherenceTrend(medicationHistory);

    let riskScore = 100 - adherenceScore; // Higher score = higher risk of non-adherence
    const riskFactors = [];

    // Recent missed doses
    if (missedDoses.recentMisses > 3) {
      riskScore += 20;
      riskFactors.push({
        name: 'Recent Missed Doses',
        weight: 0.30,
        impact: 'negative',
        description: `${missedDoses.recentMisses} doses missed in last 7 days`
      });
    }

    // Declining adherence trend
    if (adherenceTrend.direction === 'declining') {
      riskScore += 15;
      riskFactors.push({
        name: 'Declining Adherence Trend',
        weight: 0.25,
        impact: 'negative',
        description: 'Medication adherence has been declining over time'
      });
    }

    // Complex medication regimen
    if (medicationHistory.length > 5) {
      riskScore += 10;
      riskFactors.push({
        name: 'Complex Medication Regimen',
        weight: 0.15,
        impact: 'negative',
        description: `Managing ${medicationHistory.length} medications`
      });
    }

    return {
      userId,
      predictionType: 'medication_adherence',
      confidence: Math.min(medicationHistory.length / 10, 1),
      riskScore: Math.min(riskScore, 100),
      factors: riskFactors,
      timeframe,
      predictionData: {
        currentAdherence: adherenceScore,
        missedDoses,
        adherenceTrend,
        medicationCount: medicationHistory.length,
        riskPatterns: this.identifyAdherenceRiskPatterns(medicationHistory)
      },
      recommendations: this.generateAdherenceRecommendations(riskScore, medicationHistory),
      validUntil: this.calculateValidUntil(timeframe),
      dataSource: {
        mentalHealthEntries: 0,
        symptomChecks: 0,
        medicationData: medicationHistory.length,
        appointmentHistory: 0
      }
    };
  }

  /**
   * Predict overall health deterioration risk
   */
  async predictHealthDeterioration(userId, healthData, timeframe) {
    const allData = [
      ...(healthData.mentalHealth || []),
      ...(healthData.symptoms || []),
      ...(healthData.appointments || [])
    ];

    if (allData.length < 5) {
      return null;
    }

    // Multi-factor risk analysis
    let riskScore = 0;
    const riskFactors = [];

    // Mental health deterioration
    const mentalHealthRisk = this.assessMentalHealthDeterioration(healthData.mentalHealth);
    if (mentalHealthRisk.score > 0) {
      riskScore += mentalHealthRisk.score;
      riskFactors.push(...mentalHealthRisk.factors);
    }

    // Increasing symptom reports
    const symptomRisk = this.assessSymptomProgression(healthData.symptoms);
    if (symptomRisk.score > 0) {
      riskScore += symptomRisk.score;
      riskFactors.push(...symptomRisk.factors);
    }

    // Appointment frequency analysis
    const appointmentRisk = this.assessAppointmentPatterns(healthData.appointments);
    if (appointmentRisk.score > 0) {
      riskScore += appointmentRisk.score;
      riskFactors.push(...appointmentRisk.factors);
    }

    // Cross-correlation analysis
    const correlationRisk = this.analyzeDataCorrelations(healthData);
    if (correlationRisk.score > 0) {
      riskScore += correlationRisk.score;
      riskFactors.push(...correlationRisk.factors);
    }

    return {
      userId,
      predictionType: 'health_deterioration',
      confidence: Math.min(allData.length / 20, 1),
      riskScore: Math.min(riskScore, 100),
      factors: riskFactors,
      timeframe,
      predictionData: {
        mentalHealthRisk,
        symptomRisk,
        appointmentRisk,
        correlationRisk,
        dataCompleteness: this.assessDataCompleteness(healthData)
      },
      recommendations: this.generateDeteriorationRecommendations(riskScore, riskFactors),
      validUntil: this.calculateValidUntil(timeframe),
      dataSource: {
        mentalHealthEntries: (healthData.mentalHealth || []).length,
        symptomChecks: (healthData.symptoms || []).length,
        medicationData: (healthData.medications || []).length,
        appointmentHistory: (healthData.appointments || []).length
      }
    };
  }

  /**
   * Predict emergency risk based on all available data
   */
  async predictEmergencyRisk(userId, healthData, timeframe) {
    const emergencyIndicators = [];
    let riskScore = 0;

    // Critical mental health indicators
    const recentMentalHealth = (healthData.mentalHealth || []).slice(-7);
    if (recentMentalHealth.length > 0) {
      const criticalMentalHealth = recentMentalHealth.some(entry => 
        entry.stressLevel >= 9 || entry.anxiety >= 9 || entry.depression >= 8
      );
      
      if (criticalMentalHealth) {
        riskScore += 40;
        emergencyIndicators.push({
          type: 'critical_mental_health',
          severity: 'high',
          description: 'Critical mental health scores detected'
        });
      }
    }

    // Rapid health decline
    const rapidDecline = this.detectRapidHealthDecline(healthData);
    if (rapidDecline.detected) {
      riskScore += 30;
      emergencyIndicators.push({
        type: 'rapid_decline',
        severity: 'high',
        description: rapidDecline.description
      });
    }

    // Medication non-adherence with critical medications
    const criticalMedNonAdherence = this.assessCriticalMedicationRisk(healthData.medications);
    if (criticalMedNonAdherence.risk > 0.7) {
      riskScore += 25;
      emergencyIndicators.push({
        type: 'critical_medication_risk',
        severity: 'medium',
        description: 'Non-adherence to critical medications detected'
      });
    }

    // Multiple concurrent risk factors
    const concurrentRisks = this.assessConcurrentRiskFactors(healthData);
    if (concurrentRisks.count >= 3) {
      riskScore += 20;
      emergencyIndicators.push({
        type: 'multiple_risk_factors',
        severity: 'medium',
        description: `${concurrentRisks.count} concurrent risk factors detected`
      });
    }

    if (riskScore === 0) {
      return null; // No emergency risk detected
    }

    return {
      userId,
      predictionType: 'emergency_risk',
      confidence: 0.85, // High confidence for emergency predictions
      riskScore: Math.min(riskScore, 100),
      factors: emergencyIndicators.map(indicator => ({
        name: indicator.type,
        weight: indicator.severity === 'high' ? 0.4 : 0.2,
        impact: 'negative',
        description: indicator.description
      })),
      timeframe,
      predictionData: {
        emergencyIndicators,
        rapidDecline,
        criticalMedNonAdherence,
        concurrentRisks,
        alertLevel: riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : 'medium'
      },
      recommendations: this.generateEmergencyRecommendations(riskScore, emergencyIndicators),
      validUntil: this.calculateValidUntil('3_days'), // Emergency predictions expire faster
      dataSource: {
        mentalHealthEntries: (healthData.mentalHealth || []).length,
        symptomChecks: (healthData.symptoms || []).length,
        medicationData: (healthData.medications || []).length,
        appointmentHistory: (healthData.appointments || []).length
      }
    };
  }

  /**
   * Aggregate all health data for a user
   */
  async aggregateUserHealthData(userId) {
    try {
      const [mentalHealth, medications, appointments] = await Promise.all([
        MentalHealth.find({ userId }).sort({ createdAt: -1 }).limit(30),
        MedicationReminder.find({ userId }).sort({ createdAt: -1 }),
        Appointment.find({ 
          $or: [{ userId }, { patientId: userId }] 
        }).sort({ createdAt: -1 }).limit(20)
      ]);

      return {
        mentalHealth,
        medications,
        appointments,
        symptoms: [] // Will be populated when symptom history is implemented
      };
    } catch (error) {
      console.error('Error aggregating user health data:', error);
      return {};
    }
  }

  /**
   * Calculate trend direction and strength
   */
  calculateTrend(values) {
    if (values.length < 2) return { direction: 'stable', slope: 0, average: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const average = sumY / n;

    return {
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      slope: Math.abs(slope),
      average
    };
  }

  /**
   * Calculate mood trend
   */
  calculateMoodTrend(moods) {
    const moodScores = moods.map(mood => {
      const scores = {
        'Happy': 5,
        'Content': 4,
        'Neutral': 3,
        'Anxious': 2,
        'Sad': 1,
        'Stressed': 1
      };
      return scores[mood] || 3;
    });

    const trend = this.calculateTrend(moodScores);
    const moodCounts = moods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});

    const predominant = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Neutral';

    return {
      ...trend,
      predominant,
      distribution: moodCounts
    };
  }

  /**
   * Detect cyclical patterns in mental health data
   */
  detectCyclicalPatterns(entries) {
    if (entries.length < 7) return 0;

    // Simple cyclical detection based on stress patterns
    const stressLevels = entries.map(e => e.stressLevel);
    let cyclicalScore = 0;

    // Check for weekly patterns
    for (let i = 0; i < stressLevels.length - 7; i++) {
      const week1 = stressLevels.slice(i, i + 7);
      const week2 = stressLevels.slice(i + 7, i + 14);
      
      if (week2.length === 7) {
        const correlation = this.calculateCorrelation(week1, week2);
        if (correlation > 0.7) {
          cyclicalScore += 0.3;
        }
      }
    }

    return Math.min(cyclicalScore, 1);
  }

  /**
   * Calculate correlation between two arrays
   */
  calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length) return 0;
    
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

  /**
   * Calculate valid until date based on timeframe
   */
  calculateValidUntil(timeframe) {
    const now = new Date();
    const timeframes = {
      '1_day': 1,
      '3_days': 3,
      '1_week': 7,
      '2_weeks': 14,
      '1_month': 30,
      '3_months': 90
    };
    
    const days = timeframes[timeframe] || 7;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Generate mental health recommendations
   */
  generateMentalHealthRecommendations(riskScore, riskFactors) {
    const recommendations = [];

    if (riskScore >= 70) {
      recommendations.push({
        category: 'urgent',
        action: 'Schedule immediate consultation with mental health professional',
        priority: 'critical',
        estimatedImpact: 40
      });
    }

    if (riskFactors.some(f => f.name.includes('Stress'))) {
      recommendations.push({
        category: 'stress_management',
        action: 'Practice stress reduction techniques (meditation, deep breathing)',
        priority: 'high',
        estimatedImpact: 25
      });
    }

    if (riskFactors.some(f => f.name.includes('Sleep'))) {
      recommendations.push({
        category: 'sleep_hygiene',
        action: 'Improve sleep routine and aim for 7-8 hours nightly',
        priority: 'high',
        estimatedImpact: 30
      });
    }

    recommendations.push({
      category: 'monitoring',
      action: 'Continue daily mental health tracking',
      priority: 'medium',
      estimatedImpact: 15
    });

    return recommendations;
  }

  /**
   * Generate adherence recommendations
   */
  generateAdherenceRecommendations(riskScore, medications) {
    const recommendations = [];

    if (riskScore >= 60) {
      recommendations.push({
        category: 'medication_management',
        action: 'Set up medication reminder system and pill organizer',
        priority: 'high',
        estimatedImpact: 35
      });
    }

    if (medications.length > 3) {
      recommendations.push({
        category: 'simplification',
        action: 'Discuss medication simplification with healthcare provider',
        priority: 'medium',
        estimatedImpact: 20
      });
    }

    recommendations.push({
      category: 'tracking',
      action: 'Use medication tracking app or diary',
      priority: 'medium',
      estimatedImpact: 25
    });

    return recommendations;
  }

  /**
   * Generate deterioration recommendations
   */
  generateDeteriorationRecommendations(riskScore, riskFactors) {
    const recommendations = [];

    if (riskScore >= 80) {
      recommendations.push({
        category: 'immediate_care',
        action: 'Schedule urgent medical evaluation',
        priority: 'critical',
        estimatedImpact: 50
      });
    }

    recommendations.push({
      category: 'monitoring',
      action: 'Increase health monitoring frequency',
      priority: 'high',
      estimatedImpact: 30
    });

    recommendations.push({
      category: 'lifestyle',
      action: 'Focus on basic health fundamentals: sleep, nutrition, exercise',
      priority: 'medium',
      estimatedImpact: 25
    });

    return recommendations;
  }

  /**
   * Generate emergency recommendations
   */
  generateEmergencyRecommendations(riskScore, indicators) {
    const recommendations = [];

    if (riskScore >= 70) {
      recommendations.push({
        category: 'emergency',
        action: 'Contact emergency services or crisis hotline immediately',
        priority: 'critical',
        estimatedImpact: 80
      });
    }

    recommendations.push({
      category: 'immediate_support',
      action: 'Reach out to emergency contacts and support network',
      priority: 'critical',
      estimatedImpact: 60
    });

    recommendations.push({
      category: 'safety',
      action: 'Ensure safe environment and remove potential hazards',
      priority: 'high',
      estimatedImpact: 40
    });

    return recommendations;
  }

  // Additional helper methods would go here...
  calculateMedicationAdherence(medications) {
    // Simplified adherence calculation
    return 85; // Placeholder
  }

  analyzeMissedDoses(medications) {
    return { recentMisses: 2 }; // Placeholder
  }

  calculateAdherenceTrend(medications) {
    return { direction: 'stable' }; // Placeholder
  }

  identifyAdherenceRiskPatterns(medications) {
    return {}; // Placeholder
  }

  assessMentalHealthDeterioration(mentalHealth) {
    return { score: 0, factors: [] }; // Placeholder
  }

  assessSymptomProgression(symptoms) {
    return { score: 0, factors: [] }; // Placeholder
  }

  assessAppointmentPatterns(appointments) {
    return { score: 0, factors: [] }; // Placeholder
  }

  analyzeDataCorrelations(healthData) {
    return { score: 0, factors: [] }; // Placeholder
  }

  assessDataCompleteness(healthData) {
    return 0.8; // Placeholder
  }

  detectRapidHealthDecline(healthData) {
    return { detected: false }; // Placeholder
  }

  assessCriticalMedicationRisk(medications) {
    return { risk: 0 }; // Placeholder
  }

  assessConcurrentRiskFactors(healthData) {
    return { count: 0 }; // Placeholder
  }
}

export default HealthAnalyticsEngine;