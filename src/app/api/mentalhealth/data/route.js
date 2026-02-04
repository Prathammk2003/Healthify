import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MentalHealth from '@/models/MentalHealth';

export async function POST(request) {
  try {
    const body = await request.json();
    await connectDB();

    // Validate input data
    if (!body.userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!body.mood) {
      return NextResponse.json({ error: 'Mood is required' }, { status: 400 });
    }

    // All numeric fields should be converted to numbers
    const numericFields = [
      'stressLevel', 'sleepHours', 'anxiety', 'depression', 
      'energyLevel', 'concentration', 'socialInteraction', 'selfEsteem'
    ];
    
    numericFields.forEach(field => {
      if (body[field] !== undefined) {
        body[field] = Number(body[field]);
      }
    });

    // Save the data
    try {
      const newRecord = new MentalHealth(body);
      await newRecord.save();
      console.log('Mental health data saved successfully');
      
      // Update health trends
      await updateHealthTrends(body);
      
    } catch (error) {
      console.error('Error saving mental health data:', error);
      return NextResponse.json({ 
        error: `Failed to save data: ${error.message}` 
      }, { status: 500 });
    }

    // Generate AI recommendation
    let recommendation;
    try {
      recommendation = await generateAIRecommendation(body);
      console.log('AI recommendation generated successfully');
    } catch (error) {
      console.error('Error generating AI recommendation:', error);
      recommendation = generateFallbackRecommendation(body);
      console.log('Using fallback recommendation');
    }

    return NextResponse.json({
      message: 'Data saved successfully',
      recommendation: recommendation,
    });

  } catch (error) {
    console.error('Error processing POST request:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

async function generateAIRecommendation(userData) {
  try {
    // Special case for happy mood with low stress
    if (userData.mood === 'Happy' && userData.stressLevel <= 3) {
      return `• You're in a positive state with low stress levels - this is wonderful!
• Your happiness combined with low stress creates an optimal mental state.
• This is a good time to engage in activities that bring you joy and fulfillment.
• Consider journaling about what's going well to reference during more difficult times.
• Maintain your self-care routines that are working effectively for you.
• Share your positive energy with others who might benefit from your support.`;
    }

    // Using local models instead of Hugging Face API
    // This function would need to be reimplemented to use local model loading
    console.log('AI recommendation would use local models');
    
    // Return fallback recommendation since we're not using Hugging Face API
    return generateFallbackRecommendation(userData);
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
    return generateFallbackRecommendation(userData);
  }
}

function generateFallbackRecommendation(userData) {
  const recommendations = {
    'Happy': `• It's great that you're feeling happy today!
• Your positive mood is a wonderful foundation for well-being.
• Try to note what contributed to this positive state.
• Consider activities that maintain this mood, like connecting with loved ones.
• Remember these feelings during more challenging times.
• Your happiness can positively impact those around you.`,

    'Content': `• Being content is a wonderful state of balance and satisfaction.
• This equilibrium helps build resilience for more challenging times.
• Consider journaling about what's contributing to your contentment.
• Gentle exercise like walking can help maintain this peaceful state.
• Practice gratitude to reinforce these positive feelings.
• Your contentment creates space for deeper reflection and growth.`,

    'Neutral': `• A neutral mood provides a balanced foundation for your day.
• This emotional state allows for clear thinking and decision-making.
• Consider gentle movement or nature time to potentially elevate your mood.
• Mindfulness practices can help you connect more deeply with your emotions.
• This is a good time for productive work requiring focus.
• Remember that all emotional states, including neutral ones, are valid.`,

    'Anxious': `• I notice you're feeling anxious today - thank you for sharing this.
• Anxiety is often our body's response to perceived threats or uncertainties.
• Try some deep breathing exercises - inhale for 4 counts, hold for 2, exhale for 6.
• Grounding techniques like naming 5 things you can see, 4 you can touch, etc. may help.
• Consider limiting caffeine and prioritizing rest today.
• Remember that anxiety, while uncomfortable, is temporary and will pass.`,

    'Sad': `• I'm sorry to hear you're feeling sad today - your feelings are valid.
• Sadness is a natural emotion that helps us process difficult experiences.
• Be gentle with yourself today and prioritize self-compassion.
• Small acts of self-care like a warm shower or favorite tea can provide comfort.
• Consider reaching out to a trusted friend or family member for support.
• Remember that emotions fluctuate, and this feeling will not last forever.`,

    'Stressed': `• I see you're feeling stressed - acknowledging this is an important first step.
• Stress often signals we're carrying too much or need different resources.
• Try progressive muscle relaxation by tensing and releasing each muscle group.
• Breaking tasks into smaller steps can make challenges feel more manageable.
• Prioritize at least 10 minutes of uninterrupted relaxation today.
• Your body and mind deserve care, especially during stressful periods.`
  };

  return recommendations[userData.mood] || `• Thank you for checking in about your mental health today.
• Tracking your emotional state is an important part of self-care.
• Consider taking some time for a relaxing activity you enjoy.
• Gentle movement like stretching can help release tension in your body.
• Staying hydrated and well-nourished supports emotional wellbeing.
• Remember that all emotions provide valuable information and will evolve over time.`;
}

/**
 * Update health trends with new mental health data
 */
async function updateHealthTrends(userData) {
  try {
    // Import HealthTrend model
    const HealthTrend = (await import('@/models/HealthTrend')).default;
    
    const trendUpdates = [
      {
        metricName: 'stress_level',
        category: 'mental_health',
        value: userData.stressLevel,
        source: 'mental_health'
      },
      {
        metricName: 'anxiety_level', 
        category: 'mental_health',
        value: userData.anxiety || 0,
        source: 'mental_health'
      },
      {
        metricName: 'sleep_quality',
        category: 'lifestyle',
        value: userData.sleepHours,
        source: 'mental_health'
      },
      {
        metricName: 'energy_level',
        category: 'lifestyle', 
        value: userData.energyLevel || 5,
        source: 'mental_health'
      },
      {
        metricName: 'mood_score',
        category: 'mental_health',
        value: convertMoodToScore(userData.mood),
        source: 'mental_health'
      },
      {
        metricName: 'social_interaction',
        category: 'social',
        value: userData.socialInteraction || 5,
        source: 'mental_health'
      },
      {
        metricName: 'self_esteem',
        category: 'mental_health',
        value: userData.selfEsteem || 5,
        source: 'mental_health'
      },
      {
        metricName: 'concentration_level',
        category: 'mental_health',
        value: userData.concentration || 5,
        source: 'mental_health'
      }
    ];

    // Update each trend
    for (const trendData of trendUpdates) {
      let trend = await HealthTrend.findOne({
        userId: userData.userId,
        metricName: trendData.metricName,
        isActive: true
      });

      if (!trend) {
        trend = new HealthTrend({
          userId: userData.userId,
          metricName: trendData.metricName,
          category: trendData.category,
          timeframe: 'daily',
          dataPoints: [],
          analytics: {},
          targets: getDefaultTargetsForMetric(trendData.metricName)
        });
      }

      // Add data point
      await trend.addDataPoint(trendData.value, trendData.source, {
        mood: userData.mood,
        timestamp: new Date().toISOString()
      });

      // Recalculate analytics
      trend.calculateAnalytics();
      await trend.save();
    }

    console.log('Health trends updated successfully');
  } catch (error) {
    console.error('Error updating health trends:', error);
    // Don't throw error to prevent mental health save from failing
  }
}

/**
 * Convert mood string to numeric score
 */
function convertMoodToScore(mood) {
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
function getDefaultTargetsForMetric(metricName) {
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
