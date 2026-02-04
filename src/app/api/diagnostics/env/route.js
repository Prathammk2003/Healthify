import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  // Do not expose secret values; only presence booleans
  const envStatus = {
    // Removed Hugging Face API key since we're using local models
    // HUGGING_FACE_API_KEY: !!process.env.HUGGING_FACE_API_KEY,
    // HF_XRAY_MODEL_ID: !!process.env.HF_XRAY_MODEL_ID,
    // HF_SKIN_MODEL_ID: !!process.env.HF_SKIN_MODEL_ID,
    // HF_TEXT_EMBED_MODEL_ID: !!process.env.HF_TEXT_EMBED_MODEL_ID,
    // HF_EXPLAIN_MODEL_ID: !!process.env.HF_EXPLAIN_MODEL_ID,
    // HF_XRAY_REPORT_MODEL_ID: !!process.env.HF_XRAY_REPORT_MODEL_ID,
    OLLAMA_HOST: !!process.env.OLLAMA_HOST,
    OLLAMA_MODEL: !!process.env.OLLAMA_MODEL,
    OLLAMA_TEXT_MODEL: !!process.env.OLLAMA_TEXT_MODEL,
    MONGODB_URI: !!(process.env.MONGODB_URI || process.env.MONGO_URI)
  };

  let db = { connected: false };
  try {
    const conn = await connectDB();
    db.connected = !!conn && conn.readyState === 1;
  } catch (e) {
    db.connected = false;
  }

  return NextResponse.json({
    status: 'ok',
    env: envStatus,
    db
  });
}