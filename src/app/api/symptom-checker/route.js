import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSymptomDiagnosis } from '@/lib/ai';

export async function POST(req) {
  try {
    await connectDB();
    const { symptoms } = await req.json();

    if (!symptoms) {
      return NextResponse.json({ error: 'Symptoms are required' }, { status: 400 });
    }

    // Log the request for monitoring (no personal data)
    console.log(`Symptom checker request received with ${symptoms.length} characters`);

    // Get the diagnosis from the AI module
    const diagnosis = await getSymptomDiagnosis(symptoms);

    // Save the query to the database for improving the system (optional)
    // This could be implemented with a model to track common symptoms

    return NextResponse.json({ 
      diagnosis, 
      timestamp: new Date().toISOString(),
      status: 'success'
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing symptom checker request:', error);
    return NextResponse.json({ 
      error: 'Server error processing your request. Please try again later.',
      status: 'error'
    }, { status: 500 });
  }
}