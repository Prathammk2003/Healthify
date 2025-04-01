import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MentalHealth from '@/models/MentalHealth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'Missing or invalid userId' }, { status: 400 });
    }

    await connectDB();
    const records = await MentalHealth.find({ userId }).sort({ timestamp: -1 }).limit(10);
    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}