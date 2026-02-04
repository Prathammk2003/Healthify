import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AnalysisResult from '@/models/AnalysisResult';

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const type = searchParams.get('type') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100);

    const filter = {};
    if (userId) filter.userId = userId;
    if (type) filter.type = type;

    const items = await AnalysisResult.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ items });
  } catch (err) {
    console.error('analysis-history error:', err);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}


