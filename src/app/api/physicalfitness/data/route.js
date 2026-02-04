import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PhysicalFitness from '@/models/PhysicalFitness';
import axios from 'axios';

// Using Ollama instead of Hugging Face API
const OLLAMA_API_URL = process.env.OLLAMA_HOST || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_TEXT_MODEL || 'llama3.2:3b';

export async function POST(request) {
  try {
    const body = await request.json();
    await connectDB();

    const newRecord = new PhysicalFitness(body);
    await newRecord.save();

    // Generate AI recommendation using Ollama
    const prompt = `The user has exercised for ${body.exerciseHours} hours, consumed ${body.calories} calories, and slept for ${body.sleepHours} hours. Provide a recommendation.`;

    const aiResponse = await axios.post(OLLAMA_API_URL, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const recommendation = aiResponse.data.response?.trim() || 'No recommendation available';

    return NextResponse.json({
      message: 'Data saved successfully',
      recommendation,
    });
  } catch (error) {
    console.error('Error processing POST request:', error.response ? error.response.data : error.message);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}