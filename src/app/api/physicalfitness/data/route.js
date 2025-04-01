import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PhysicalFitness from '@/models/PhysicalFitness';
import axios from 'axios';

const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/gpt2'; // Replace with your model ID
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    await connectDB();

    const newRecord = new PhysicalFitness(body);
    await newRecord.save();

    // Generate AI recommendation
    const prompt = `The user has exercised for ${body.exerciseHours} hours, consumed ${body.calories} calories, and slept for ${body.sleepHours} hours. Provide a recommendation.`;

    const aiResponse = await axios.post(HUGGING_FACE_API_URL, {
      inputs: prompt,
    }, {
      headers: {
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const recommendation = aiResponse.data[0].generated_text.trim();

    return NextResponse.json({
      message: 'Data saved successfully',
      recommendation,
    });
  } catch (error) {
    console.error('Error processing POST request:', error.response ? error.response.data : error.message);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}