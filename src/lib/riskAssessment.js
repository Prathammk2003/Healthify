import RiskAssessment from '../models/RiskAssessment.js';
import HealthTrend from '../models/HealthTrend.js';
import MentalHealth from '../models/MentalHealth.js';
import { connectDB } from '../lib/db.js';

/**
 * Advanced Risk Assessment Engine
 * Provides comprehensive health risk scoring and analysis
 */
class RiskAssessmentEngine {
  constructor() {
    this.riskWeights = {
      mental_health: 0.35,
      physical_health: 0.25,
      lifestyle: 0.20,
      medication: 0.15,
      social: 0.05
    };

    this.criticalThresholds = {
      stress: 8,
      anxiety: 8,
      depression: 7,
      sleepHours: 4,
      medicationAdherence: 60
    };
  }

  /**
   * Generate comprehensive risk assessment for user
   */
  async generateRiskAssessment(userId, assessmentType = 'comprehensive') {
    try {
      await connectDB();

      const healthData = await this.gatherHealthData(userId);
      const previousAssessment = await RiskAssessment.getLatestAssessment(userId, assessmentType);

      // Calculate category-specific risk scores
      const categoryScores = {
        mentalHealth: await this.assessMentalHealthRisk(healthData),
        physicalHealth: await this.assessPhysicalHealthRisk(healthData),
        lifestyle: await this.assessLifestyleRisk(healthData),
        medication: await this.assessMedicationRisk(healthData),
        social: await this.assessSocialRisk(healthData),
        environmental: await this.assessEnvironmentalRisk(healthData)
      };

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(categoryScores);
      const riskLevel = this.determineRiskLevel(overallRiskScore);

      // Identify risk factors
      const riskFactors = await this.identifyRiskFactors(healthData, categoryScores);

      // Generate alerts
      const alerts = this.generateAlerts(riskFactors, overallRiskScore);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskFactors, categoryScores);

      // Calculate confidence based on data completeness
      const confidence = this.calculateConfidence(healthData);

      // Compare with previous assessment
      const comparisonToPrevious = this.compareWithPrevious(
        previousAssessment, 
        overallRiskScore, 
        riskFactors
      );

      const assessment = new RiskAssessment({
        userId,
        overallRiskScore,
        riskLevel,
        assessmentType,
        riskFactors,
        categoryScores,
        alerts,
        recommendations,
        dataSource: {
          mentalHealthEntries: healthData.mentalHealth?.length || 0,
          symptomReports: healthData.symptoms?.length || 0,
          medicationAdherence: healthData.medicationAdherence || 0,
          appointmentHistory: healthData.appointments?.length || 0,
          vitalSigns: healthData.vitals?.length || 0,
          analysisHistory: healthData.analyses?.length || 0
        },
        confidence,
        nextAssessmentDue: this.calculateNextAssessmentDate(riskLevel),
        comparisonToPrevious
      });

      return await assessment.save();
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      throw error;
    }
  }

  /**
   * Assess mental health risk
   */
  async assessMentalHealthRisk(healthData) {
    const mentalHealthData = healthData.mentalHealth || [];
    
    if (mentalHealthData.length === 0) {
      return 50; // Neutral score when no data
    }

    const recent = mentalHealthData.slice(-14); // Last 14 entries
    let riskScore = 0;

    // Average stress levels
    const avgStress = recent.reduce((sum, entry) => sum + entry.stressLevel, 0) / recent.length;
    if (avgStress >= this.criticalThresholds.stress) {
      riskScore += 30;
    } else if (avgStress >= 6) {
      riskScore += 15;
    }

    // Average anxiety levels
    const avgAnxiety = recent.reduce((sum, entry) => sum + (entry.anxiety || 0), 0) / recent.length;
    if (avgAnxiety >= this.criticalThresholds.anxiety) {
      riskScore += 25;
    } else if (avgAnxiety >= 6) {
      riskScore += 12;
    }

    // Sleep quality
    const avgSleep = recent.reduce((sum, entry) => sum + entry.sleepHours, 0) / recent.length;
    if (avgSleep <= this.criticalThresholds.sleepHours) {
      riskScore += 20;
    } else if (avgSleep <= 6) {
      riskScore += 10;
    }

    // Mood pattern analysis
    const negativeModds = recent.filter(entry => 
      ['Anxious', 'Sad', 'Stressed'].includes(entry.mood)
    ).length;
    const moodRisk = (negativeModds / recent.length) * 25;
    riskScore += moodRisk;

    // Trend analysis
    const stressTrend = this.calculateTrend(recent.map(e => e.stressLevel));
    if (stressTrend.direction === 'increasing' && stressTrend.slope > 0.5) {
      riskScore += 15;
    }

    // Energy and concentration factors
    const avgEnergy = recent.reduce((sum, entry) => sum + (entry.energyLevel || 5), 0) / recent.length;
    const avgConcentration = recent.reduce((sum, entry) => sum + (entry.concentration || 5), 0) / recent.length;
    
    if (avgEnergy <= 3) riskScore += 10;
    if (avgConcentration <= 3) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  /**
   * Assess physical health risk
   */
  async assessPhysicalHealthRisk(healthData) {
    let riskScore = 0;

    // Symptom frequency
    const symptoms = healthData.symptoms || [];
    const recentSymptoms = symptoms.filter(s => 
      new Date() - new Date(s.timestamp) <= 30 * 24 * 60 * 60 * 1000 // Last 30 days
    );

    if (recentSymptoms.length > 10) {
      riskScore += 25;
    } else if (recentSymptoms.length > 5) {
      riskScore += 15;
    }

    // Appointment frequency (too many or too few)
    const appointments = healthData.appointments || [];
    const recentAppointments = appointments.filter(a => 
      new Date() - new Date(a.date) <= 90 * 24 * 60 * 60 * 1000 // Last 90 days
    );

    if (recentAppointments.length > 6) {
      riskScore += 20; // Too many appointments might indicate health issues
    } else if (recentAppointments.length === 0) {
      riskScore += 15; // No recent appointments might indicate neglect
    }

    // Vital signs (if available)
    const vitals = healthData.vitals || [];
    if (vitals.length > 0) {
      const latestVitals = vitals[vitals.length - 1];
      // Add vital signs analysis here
      if (latestVitals.bloodPressure > 140) riskScore += 15;
      if (latestVitals.heartRate > 100 || latestVitals.heartRate < 60) riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Assess lifestyle risk
   */
  async assessLifestyleRisk(healthData) {
    const mentalHealthData = healthData.mentalHealth || [];
    let riskScore = 0;

    if (mentalHealthData.length === 0) return 50;

    const recent = mentalHealthData.slice(-14);

    // Sleep patterns
    const sleepHours = recent.map(e => e.sleepHours);
    const avgSleep = sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length;
    const sleepVariability = this.calculateVariability(sleepHours);

    if (avgSleep < 6 || avgSleep > 9) riskScore += 20;
    if (sleepVariability > 2) riskScore += 15; // Inconsistent sleep

    // Energy levels
    const energyLevels = recent.map(e => e.energyLevel || 5);
    const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
    if (avgEnergy <= 3) riskScore += 15;

    // Social interaction
    const socialLevels = recent.map(e => e.socialInteraction || 5);
    const avgSocial = socialLevels.reduce((a, b) => a + b, 0) / socialLevels.length;
    if (avgSocial <= 3) riskScore += 10;

    // Activity patterns (inferred from self-esteem and energy)
    const selfEsteem = recent.map(e => e.selfEsteem || 5);
    const avgSelfEsteem = selfEsteem.reduce((a, b) => a + b, 0) / selfEsteem.length;
    if (avgSelfEsteem <= 3) riskScore += 10;

    return Math.min(riskScore, 100);
  }

  /**
   * Assess medication risk
   */
  async assessMedicationRisk(healthData) {
    const medications = healthData.medications || [];
    let riskScore = 0;

    if (medications.length === 0) return 20; // Low risk if no medications

    // Medication complexity
    if (medications.length > 5) riskScore += 15;
    if (medications.length > 10) riskScore += 25;

    // Adherence analysis (simplified)
    const adherence = healthData.medicationAdherence || 90;
    if (adherence < this.criticalThresholds.medicationAdherence) {
      riskScore += 30;
    } else if (adherence < 80) {
      riskScore += 15;
    }

    // Critical medication analysis
    const criticalMeds = medications.filter(med => 
      this.isCriticalMedication(med.medicationName)
    );
    if (criticalMeds.length > 0 && adherence < 85) {
      riskScore += 20;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Assess social risk
   */
  async assessSocialRisk(healthData) {
    const mentalHealthData = healthData.mentalHealth || [];
    let riskScore = 0;

    if (mentalHealthData.length === 0) return 50;

    const recent = mentalHealthData.slice(-14);

    // Social interaction levels
    const socialLevels = recent.map(e => e.socialInteraction || 5);
    const avgSocial = socialLevels.reduce((a, b) => a + b, 0) / socialLevels.length;

    if (avgSocial <= 2) {
      riskScore += 25; // Very isolated
    } else if (avgSocial <= 3) {
      riskScore += 15; // Somewhat isolated
    }

    // Social trend
    const socialTrend = this.calculateTrend(socialLevels);
    if (socialTrend.direction === 'decreasing') {
      riskScore += 10;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Assess environmental risk
   */
  async assessEnvironmentalRisk(healthData) {
    // Simplified environmental risk assessment
    // This could be expanded with more data
    let riskScore = 20; // Default moderate risk

    // Stress patterns might indicate environmental factors
    const mentalHealthData = healthData.mentalHealth || [];
    if (mentalHealthData.length > 0) {
      const recent = mentalHealthData.slice(-7);
      const avgStress = recent.reduce((sum, entry) => sum + entry.stressLevel, 0) / recent.length;
      
      if (avgStress > 7) {
        riskScore += 15; // High stress might indicate environmental factors
      }
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Calculate overall risk score
   */
  calculateOverallRiskScore(categoryScores) {
    const weightedScore = 
      (categoryScores.mentalHealth * this.riskWeights.mental_health) +
      (categoryScores.physicalHealth * this.riskWeights.physical_health) +
      (categoryScores.lifestyle * this.riskWeights.lifestyle) +
      (categoryScores.medication * this.riskWeights.medication) +
      (categoryScores.social * this.riskWeights.social);

    return Math.round(weightedScore);
  }

  /**
   * Determine risk level from score
   */
  determineRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'moderate';
    return 'low';
  }

  /**
   * Identify specific risk factors
   */
  async identifyRiskFactors(healthData, categoryScores) {
    const riskFactors = [];

    // Mental health risk factors
    if (categoryScores.mentalHealth >= 60) {
      const mentalHealth = healthData.mentalHealth || [];
      const recent = mentalHealth.slice(-7);
      
      if (recent.length > 0) {
        const avgStress = recent.reduce((sum, e) => sum + e.stressLevel, 0) / recent.length;
        if (avgStress >= 8) {
          riskFactors.push({
            category: 'mental_health',
            name: 'High Stress Levels',
            value: avgStress,
            severity: 'high',
            trend: this.calculateTrend(recent.map(e => e.stressLevel)).direction,
            lastUpdated: new Date()
          });
        }

        const avgAnxiety = recent.reduce((sum, e) => sum + (e.anxiety || 0), 0) / recent.length;
        if (avgAnxiety >= 7) {
          riskFactors.push({
            category: 'mental_health',
            name: 'High Anxiety Levels',
            value: avgAnxiety,
            severity: 'high',
            trend: this.calculateTrend(recent.map(e => e.anxiety || 0)).direction,
            lastUpdated: new Date()
          });
        }

        const avgSleep = recent.reduce((sum, e) => sum + e.sleepHours, 0) / recent.length;
        if (avgSleep <= 5) {
          riskFactors.push({
            category: 'lifestyle',
            name: 'Insufficient Sleep',
            value: avgSleep,
            severity: avgSleep <= 4 ? 'critical' : 'high',
            trend: this.calculateTrend(recent.map(e => e.sleepHours)).direction,
            lastUpdated: new Date()
          });
        }
      }
    }

    // Physical health risk factors
    if (categoryScores.physicalHealth >= 60) {
      const symptoms = healthData.symptoms || [];
      const recentSymptoms = symptoms.filter(s => 
        new Date() - new Date(s.timestamp) <= 30 * 24 * 60 * 60 * 1000
      );

      if (recentSymptoms.length > 8) {
        riskFactors.push({
          category: 'physical_health',
          name: 'Frequent Symptom Reports',
          value: recentSymptoms.length,
          severity: 'high',
          trend: 'stable',
          lastUpdated: new Date()
        });
      }
    }

    // Medication risk factors
    if (categoryScores.medication >= 60) {
      const adherence = healthData.medicationAdherence || 90;
      if (adherence < 70) {
        riskFactors.push({
          category: 'medication',
          name: 'Poor Medication Adherence',
          value: adherence,
          severity: adherence < 50 ? 'critical' : 'high',
          trend: 'stable',
          lastUpdated: new Date()
        });
      }
    }

    return riskFactors;
  }

  /**
   * Generate alerts based on risk factors
   */
  generateAlerts(riskFactors, overallRiskScore) {
    const alerts = [];

    // Critical overall risk
    if (overallRiskScore >= 80) {
      alerts.push({
        type: 'immediate_attention',
        message: 'Critical health risk detected. Immediate medical attention recommended.',
        priority: 'critical',
        actionRequired: true,
        estimatedTimeframe: 'Immediate'
      });
    }

    // High stress alert
    const stressRisk = riskFactors.find(rf => rf.name === 'High Stress Levels');
    if (stressRisk && stressRisk.value >= 9) {
      alerts.push({
        type: 'monitor_closely',
        message: 'Critically high stress levels detected. Consider stress management intervention.',
        priority: 'high',
        actionRequired: true,
        estimatedTimeframe: '24-48 hours'
      });
    }

    // Poor sleep alert
    const sleepRisk = riskFactors.find(rf => rf.name === 'Insufficient Sleep');
    if (sleepRisk && sleepRisk.value <= 4) {
      alerts.push({
        type: 'immediate_attention',
        message: 'Severely insufficient sleep detected. Sleep intervention needed.',
        priority: 'high',
        actionRequired: true,
        estimatedTimeframe: 'Tonight'
      });
    }

    // Medication adherence alert
    const medRisk = riskFactors.find(rf => rf.name === 'Poor Medication Adherence');
    if (medRisk && medRisk.value < 60) {
      alerts.push({
        type: 'immediate_attention',
        message: 'Critical medication non-adherence. Review medication regimen immediately.',
        priority: 'critical',
        actionRequired: true,
        estimatedTimeframe: 'Today'
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations based on risk assessment
   */
  generateRecommendations(riskFactors, categoryScores) {
    const recommendations = [];

    // Mental health recommendations
    if (categoryScores.mentalHealth >= 60) {
      recommendations.push({
        category: 'Mental Health',
        title: 'Stress Management Program',
        description: 'Implement daily stress reduction techniques such as meditation, deep breathing, or progressive muscle relaxation.',
        priority: 'high',
        estimatedImpact: 30,
        timeToImpact: '1-2 weeks',
        actionType: 'immediate'
      });

      if (riskFactors.some(rf => rf.name === 'Insufficient Sleep')) {
        recommendations.push({
          category: 'Sleep Hygiene',
          title: 'Sleep Schedule Optimization',
          description: 'Establish consistent sleep/wake times, create bedtime routine, and optimize sleep environment.',
          priority: 'high',
          estimatedImpact: 25,
          timeToImpact: '1 week',
          actionType: 'immediate'
        });
      }
    }

    // Physical health recommendations
    if (categoryScores.physicalHealth >= 60) {
      recommendations.push({
        category: 'Physical Health',
        title: 'Medical Evaluation',
        description: 'Schedule comprehensive medical evaluation to address recurring symptoms.',
        priority: 'high',
        estimatedImpact: 35,
        timeToImpact: '1-2 weeks',
        actionType: 'short_term'
      });
    }

    // Medication recommendations
    if (categoryScores.medication >= 60) {
      recommendations.push({
        category: 'Medication Management',
        title: 'Adherence Support System',
        description: 'Implement medication reminder systems, pill organizers, and pharmacy consultation.',
        priority: 'critical',
        estimatedImpact: 40,
        timeToImpact: '1 week',
        actionType: 'immediate'
      });
    }

    // Lifestyle recommendations
    if (categoryScores.lifestyle >= 60) {
      recommendations.push({
        category: 'Lifestyle',
        title: 'Holistic Wellness Plan',
        description: 'Develop comprehensive plan addressing nutrition, exercise, sleep, and stress management.',
        priority: 'medium',
        estimatedImpact: 30,
        timeToImpact: '2-4 weeks',
        actionType: 'long_term'
      });
    }

    return recommendations;
  }

  /**
   * Gather all health data for assessment
   */
  async gatherHealthData(userId) {
    try {
      const [mentalHealth, medications, appointments] = await Promise.all([
        MentalHealth.find({ userId }).sort({ createdAt: -1 }).limit(30),
        // Add medication fetching logic here
        [],
        // Add appointment fetching logic here
        []
      ]);

      return {
        mentalHealth,
        medications,
        appointments,
        symptoms: [], // To be implemented
        vitals: [], // To be implemented
        analyses: [], // To be implemented
        medicationAdherence: 85 // Placeholder
      };
    } catch (error) {
      console.error('Error gathering health data:', error);
      return {};
    }
  }

  /**
   * Calculate confidence based on data completeness
   */
  calculateConfidence(healthData) {
    let dataPoints = 0;
    let totalPossible = 6; // 6 categories of data

    if ((healthData.mentalHealth || []).length > 0) dataPoints++;
    if ((healthData.symptoms || []).length > 0) dataPoints++;
    if ((healthData.medications || []).length > 0) dataPoints++;
    if ((healthData.appointments || []).length > 0) dataPoints++;
    if ((healthData.vitals || []).length > 0) dataPoints++;
    if ((healthData.analyses || []).length > 0) dataPoints++;

    return dataPoints / totalPossible;
  }

  /**
   * Compare with previous assessment
   */
  compareWithPrevious(previousAssessment, currentScore, currentFactors) {
    if (!previousAssessment) {
      return {
        scoreChange: 0,
        trend: 'stable',
        significantChanges: ['First assessment - no comparison available']
      };
    }

    const scoreChange = currentScore - previousAssessment.overallRiskScore;
    let trend = 'stable';
    
    if (scoreChange > 10) trend = 'worsening';
    else if (scoreChange < -10) trend = 'improving';

    const significantChanges = [];
    
    if (Math.abs(scoreChange) > 15) {
      significantChanges.push(`Risk score changed by ${scoreChange} points`);
    }

    return {
      scoreChange,
      trend,
      significantChanges
    };
  }

  /**
   * Calculate next assessment date
   */
  calculateNextAssessmentDate(riskLevel) {
    const now = new Date();
    const daysToAdd = {
      'critical': 3,
      'high': 7,
      'moderate': 14,
      'low': 30
    };

    const days = daysToAdd[riskLevel] || 14;
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Helper methods
   */
  calculateTrend(values) {
    if (values.length < 2) return { direction: 'stable', slope: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return {
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      slope: Math.abs(slope)
    };
  }

  calculateVariability(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  isCriticalMedication(medicationName) {
    const criticalMeds = [
      'insulin', 'warfarin', 'digoxin', 'phenytoin', 'lithium',
      'metformin', 'lisinopril', 'atorvastatin', 'levothyroxine'
    ];
    
    return criticalMeds.some(med => 
      medicationName.toLowerCase().includes(med.toLowerCase())
    );
  }
}

export default RiskAssessmentEngine;