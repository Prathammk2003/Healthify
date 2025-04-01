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

    const diagnosis = await getSymptomDiagnosis(symptoms);

    return NextResponse.json({ diagnosis }, { status: 200 });
  } catch (error) {
    console.error('Error processing symptom checker request:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}