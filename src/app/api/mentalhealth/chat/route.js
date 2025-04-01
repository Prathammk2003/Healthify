import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

export async function POST(request) {
  try {
    const body = await request.json();
    await connectDB();

    // Validate input
    if (!body.message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Generate chat response
    let response;
    try {
      response = await generateChatResponse(body.message, body.userId);
      console.log('Chat response generated successfully');
    } catch (error) {
      console.error('Error generating chat response:', error);
      response = "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
    }

    return NextResponse.json({
      response: response,
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}

async function generateChatResponse(message, userId) {
  // Create a system prompt that explains the assistant's role
  const systemPrompt = `You are a compassionate mental health assistant designed to provide supportive guidance, coping strategies, and self-care recommendations. 
  
  IMPORTANT FORMATTING RULES:
  - Provide brief, structured responses using bullet points (•)
  - Keep each point to one short sentence
  - Group similar points together
  - Limit your response to 3-5 bullet points total
  - Start each bullet point with an action verb when giving advice
  - Do not use paragraphs or lengthy explanations
  - Only use bullet points for your entire response
  
  Example of good formatting:
  • I understand you're feeling anxious about your upcoming presentation.
  • Practice deep breathing for 5 minutes before the event.
  • Prepare note cards with key points to boost confidence.
  • Remember that occasional anxiety before presentations is normal.
  
  Never diagnose or replace professional medical advice. Always suggest seeking professional help for serious concerns.`;

  const userMessage = message.trim();
  
  try {
    // Using Hugging Face's text generation API with a suitable model
    const result = await hf.textGeneration({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
      inputs: `<s>[INST] ${systemPrompt}\n\nUser: ${userMessage} [/INST]</s>`,
      parameters: {
        max_new_tokens: 300,
        temperature: 0.7,
        top_p: 0.95,
        repetition_penalty: 1.15
      }
    });
    
    // Extract and clean the response
    let response = result.generated_text;
    
    // Remove the prompt from the response if it's included
    const promptParts = [
      `<s>[INST] ${systemPrompt}\n\nUser: ${userMessage} [/INST]`,
      `[INST] ${systemPrompt}\n\nUser: ${userMessage} [/INST]`
    ];
    
    promptParts.forEach(part => {
      if (response.includes(part)) {
        response = response.replace(part, '').trim();
      }
    });
    
    // Remove any residual system instructions that might be in the response
    if (response.includes('</s>')) {
      response = response.split('</s>')[1] || response.replace('</s>', '');
    }
    
    // Format the response if it's not already in bullet points
    if (!response.includes('•')) {
      // Split into sentences and convert to bullet points
      const sentences = response.split(/(?<=\.|\?|\!)\s+/);
      const bulletPoints = [];
      
      for (const sentence of sentences) {
        if (sentence.trim().length > 10) {  // Only include substantial sentences
          bulletPoints.push(`• ${sentence.trim()}`);
        }
      }
      
      // Limit to 5 bullet points maximum
      const limitedPoints = bulletPoints.slice(0, 5);
      response = limitedPoints.join('\n');
    } else {
      // Already has bullet points, just ensure proper formatting
      // Convert any numbered lists to bullet points
      response = response.replace(/^\s*\d+\.\s*/gm, '• ');
      
      // Ensure bullet points are on separate lines
      response = response.replace(/•\s*([^•\n]+)(?=\s+•)/g, '• $1\n');
      
      // Split by bullet points and limit to 5
      const points = response.split('•').filter(p => p.trim().length > 0);
      if (points.length > 5) {
        const limitedPoints = points.slice(0, 5).map(p => `• ${p.trim()}`);
        response = limitedPoints.join('\n');
      }
    }
    
    return response.trim();
  } catch (error) {
    console.error('Error generating chat response with Hugging Face:', error);
    throw error;
  }
} 