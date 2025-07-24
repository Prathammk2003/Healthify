import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MentalHealth from '@/models/MentalHealth';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

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

    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    const sleepAssessment = userData.sleepHours < 6 
      ? "significantly below recommended levels" 
      : userData.sleepHours < 8 
        ? "slightly below optimal levels" 
        : "at healthy levels";

    // Create a more detailed prompt
    const prompt = `You are a mental health expert providing personalized insights based on a user's mental health check-in data.

User's check-in data:
- Mood: ${userData.mood}
- Stress level (0-10): ${userData.stressLevel}
- Hours of sleep: ${userData.sleepHours} (${sleepAssessment})
- Anxiety level (0-10): ${userData.anxiety}
${userData.thoughts ? `- Additional thoughts: ${userData.thoughts}` : ''}

Based on this data, provide a brief, empathetic response with insights and practical recommendations.
Your response should have 4-6 bullet points, each starting with a bullet point character "•".
Do not include any section headings like "Analysis" or "Recommendations" - just provide the bullet points directly.

Format each point to be concise, compassionate, and actionable. The first 1-2 points should acknowledge their current state,
the next 2-3 points should provide practical suggestions, and the final point should be encouraging.`;

    const result = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.1
      }
    });
    
    let response = result.generated_text || '';
    
    // Extract just the bullet points from the response
    const bulletPoints = response.split('\n')
      .filter(line => line.trim().startsWith('•'))
      .join('\n');
    
    return bulletPoints || generateFallbackRecommendation(userData);
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
