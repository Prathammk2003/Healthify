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

async function generateAIRecommendation(data) {
  const { mood, stressLevel, sleepHours, anxiety, depression, energyLevel, concentration, socialInteraction, selfEsteem, thoughts } = data;
  
  const prompt = `As a mental health AI assistant, provide a structured, concise response based on the following user data:
  - Current mood: ${mood}
  - Stress level (0-10): ${stressLevel}
  - Sleep hours: ${sleepHours}
  - Anxiety level (0-10): ${anxiety || 'Not provided'}
  - Depression level (0-10): ${depression || 'Not provided'}
  - Energy level (0-10): ${energyLevel || 'Not provided'}
  - Concentration level (0-10): ${concentration || 'Not provided'}
  - Social interaction level (0-10): ${socialInteraction || 'Not provided'}
  - Self-esteem level (0-10): ${selfEsteem || 'Not provided'}
  - Additional thoughts: ${thoughts || 'None provided'}

  IMPORTANT: Your response MUST follow this exact format:

  **Analysis:**
  • Brief point about their current mental state
  • Second point if relevant
  
  **Recommendations:**
  • First specific action item (should be short and clear)
  • Second specific action item
  • Third specific action item
  • Fourth specific action item if needed
  
  **Support:**
  • Brief supportive message with encouragement
  
  Use bullet points exactly as shown above. Keep each point brief and direct, no longer than one sentence. Do not use paragraphs.`;

  try {
    // Using Hugging Face's text generation API
    const result = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      inputs: `<s>[INST] ${prompt} [/INST]</s>`,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.15
      }
    });
    
    // Extract and clean the response
    let response = result.generated_text;
    
    // Remove the prompt from the response if it's included
    if (response.includes(prompt)) {
      response = response.replace(prompt, '').trim();
    }
    
    if (response.includes('[/INST]')) {
      response = response.split('[/INST]')[1].trim();
    }
    
    // Remove any residual system instructions that might be in the response
    if (response.includes('</s>')) {
      response = response.split('</s>')[1] || response.replace('</s>', '');
    }
    
    // If the response doesn't follow the required format, force the format
    if (!response.includes('**Analysis:**') || !response.includes('**Recommendations:**') || !response.includes('**Support:**')) {
      // Extract what we can from the response
      const sections = response.split(/\n+/);
      const analysisParts = [];
      const recommendationParts = [];
      const supportParts = [];
      
      // Try to classify each section
      let currentSection = "Analysis";
      for (const section of sections) {
        const trimmedSection = section.trim();
        
        if (trimmedSection.toLowerCase().includes('analysis')) {
          currentSection = "Analysis";
          continue;
        } else if (trimmedSection.toLowerCase().includes('recommendation')) {
          currentSection = "Recommendations";
          continue;
        } else if (trimmedSection.toLowerCase().includes('support') || 
                  trimmedSection.toLowerCase().includes('closing') ||
                  trimmedSection.toLowerCase().includes('remember')) {
          currentSection = "Support";
          continue;
        }
        
        if (trimmedSection.length > 5) {
          // Remove any numbering or dashes at the beginning
          let point = trimmedSection.replace(/^[•\-\d\.\s]+/, '').trim();
          
          // Add bullet points if they don't exist
          if (!point.startsWith('•')) {
            point = '• ' + point;
          }
          
          if (currentSection === "Analysis") {
            analysisParts.push(point);
          } else if (currentSection === "Recommendations") {
            recommendationParts.push(point);
          } else if (currentSection === "Support") {
            supportParts.push(point);
          }
        }
      }
      
      // Ensure we have at least one point in each section
      if (analysisParts.length === 0) {
        if (mood === 'Happy' || mood === 'Content') {
          analysisParts.push("• Your mood is positive today, which is great to see!");
        } else if (mood === 'Neutral') {
          analysisParts.push("• You're feeling neutral today, which is a good baseline.");
        } else if (mood === 'Anxious' || mood === 'Stressed') {
          analysisParts.push("• You're experiencing anxiety or stress today, which is common.");
        } else if (mood === 'Sad') {
          analysisParts.push("• You're feeling sad today, it's important to acknowledge these emotions.");
        }
        
        if (stressLevel >= 7) {
          analysisParts.push("• Your stress level is high at " + stressLevel + "/10.");
        }
      }
      
      if (recommendationParts.length === 0) {
        recommendationParts.push("• Practice deep breathing exercises for 5 minutes.");
        recommendationParts.push("• Take short breaks throughout your day.");
        recommendationParts.push("• Engage in physical activity like walking or stretching.");
      }
      
      if (supportParts.length === 0) {
        supportParts.push("• Remember that it's okay to ask for help when needed, small steps make a big difference.");
      }
      
      // Rebuild the response with proper formatting
      response = `**Analysis:**
${analysisParts.join('\n')}

**Recommendations:**
${recommendationParts.join('\n')}

**Support:**
${supportParts.join('\n')}`;
    }
    
    // Ensure each part has bullet points
    response = response.replace(/\*\*Analysis:\*\*\s*\n(?!•)/g, '**Analysis:**\n• ')
                     .replace(/\*\*Recommendations:\*\*\s*\n(?!•)/g, '**Recommendations:**\n• ')
                     .replace(/\*\*Support:\*\*\s*\n(?!•)/g, '**Support:**\n• ');
    
    // Replace any number lists (1., 2., etc.) with bullet points
    response = response.replace(/^\s*\d+\.\s*/gm, '• ');
    
    // Join consecutive bullet points that may have been split across lines
    response = response.replace(/•\s*([^•\n]+)\n(?!•|\*\*|$)/g, '• $1 ');
    
    return response.trim();
  } catch (error) {
    console.error('Error generating AI recommendation with Hugging Face:', error);
    throw error;
  }
}

function generateFallbackRecommendation(data) {
  const { mood, stressLevel, sleepHours, anxiety, depression, energyLevel } = data;
  
  // Create array to store recommendations
  let analysis = [];
  let recommendations = [];
  
  // General analysis based on mood
  if (mood === 'Happy' || mood === 'Content') {
    analysis.push("Your mood is positive today, which is great to see!");
  } else if (mood === 'Neutral') {
    analysis.push("You're feeling neutral today. This is a good baseline.");
  } else if (mood === 'Anxious' || mood === 'Stressed') {
    analysis.push("You're experiencing some anxiety or stress today. This is common and there are ways to help manage these feelings.");
  } else if (mood === 'Sad') {
    analysis.push("You're feeling sad today. It's important to acknowledge these emotions and find healthy ways to process them.");
  }

  // Sleep recommendations
  if (sleepHours < 6) {
    analysis.push("Your sleep hours are below the recommended range.");
    recommendations.push("Try to establish a consistent sleep schedule. Aim for 7-9 hours per night.");
    recommendations.push("Create a relaxing bedtime routine without screens 1 hour before sleep.");
  } else if (sleepHours >= 6 && sleepHours <= 9) {
    analysis.push("Your sleep duration is within a healthy range.");
  } else if (sleepHours > 9) {
    analysis.push("You're sleeping more than average, which could indicate fatigue or other issues.");
    recommendations.push("While adequate sleep is important, excessive sleep can sometimes be linked to depression or other health concerns. Consider discussing this with a healthcare provider.");
  }

  // Stress level recommendations
  if (stressLevel >= 7) {
    analysis.push("Your stress level is high.");
    recommendations.push("Practice deep breathing exercises or meditation for 10 minutes each day.");
    recommendations.push("Consider taking short breaks throughout the day to reset your mind.");
    recommendations.push("Physical activity can help reduce stress - even a short walk can make a difference.");
  } else if (stressLevel >= 4 && stressLevel <= 6) {
    analysis.push("You're experiencing moderate stress levels.");
    recommendations.push("Practice mindfulness or relaxation techniques to help manage day-to-day stress.");
  }

  // Anxiety recommendations
  if (anxiety && anxiety >= 7) {
    analysis.push("Your anxiety level is elevated.");
    recommendations.push("Try grounding exercises when feeling anxious (5-4-3-2-1 technique: identify 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell, and 1 thing you taste).");
    recommendations.push("Consider limiting caffeine and alcohol which can worsen anxiety.");
  }

  // Depression recommendations
  if (depression && depression >= 7) {
    analysis.push("You're reporting significant feelings of depression.");
    recommendations.push("Try to engage in one small enjoyable activity each day.");
    recommendations.push("Reaching out to a friend or family member can provide important social connection.");
    recommendations.push("Consider speaking with a mental health professional who can provide appropriate support.");
  }

  // If no specific recommendations were generated
  if (recommendations.length === 0) {
    recommendations.push("Continue monitoring your mental health and practicing self-care routines.");
    recommendations.push("Engage in activities that bring you joy and fulfillment.");
    recommendations.push("Maintain social connections and don't hesitate to reach out to others.");
  }

  // Format the response
  const analysisText = analysis.join(" ");
  const recommendationsText = recommendations.map(rec => `• ${rec}`).join("\n");
  
  const supportMessage = "Remember that your mental health is important, and it's okay to seek professional help if you're struggling. Small, consistent steps can make a significant difference in your wellbeing.";

  return `**Analysis:**
${analysisText}

**Recommendations:**
${recommendationsText}

**Support:**
${supportMessage}`;
}
