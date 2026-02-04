import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AnalysisResult from '@/models/AnalysisResult';
// Removed Hugging Face import since we're using local models
// import { HfInference } from '@huggingface/inference';

// Removed global HfInference instance since we're using local models
// const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

export async function POST(req) {
  try {
    await connectDB();
    const form = await req.formData();
    const file = form.get('image');
    const userId = form.get('userId') || null;

    if (!file) return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    if (file.size && file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
    }
    
    // Using local models instead of Hugging Face API
    // const modelId = process.env.HF_SKIN_MODEL_ID;
    // if (!modelId || !process.env.HUGGING_FACE_API_KEY) {
    //   return NextResponse.json({ error: 'HF model/key not configured' }, { status: 500 });
    // }
    
    // Use Ollama for skin analysis since we're not using Hugging Face API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Try Ollama first
    if (process.env.OLLAMA_HOST) {
      try {
        const ollamaModel = process.env.OLLAMA_MODEL || 'llava:7b';
        const { result } = await analyzeWithOllama(buffer, 'skin', ollamaModel);
        const findings = result.findings || [];
        const top = findings[0];
        const summary = top ? `${top.label} (${Math.round(top.confidence * 100)}%)` : 'No clear finding';
        
        const saved = await AnalysisResult.create({
          userId: userId || undefined,
          type: 'skin',
          provider: 'ollama',
          modelIds: { image: ollamaModel },
          summary,
          conditions: findings
        });
        
        return NextResponse.json({
          id: saved._id.toString(),
          type: 'skin',
          provider: 'ollama',
          modelId: ollamaModel,
          summary,
          findings,
          timestamp: saved.createdAt
        });
      } catch (err) {
        console.error('Ollama skin analysis error:', err);
        return NextResponse.json({ error: 'Failed to analyze skin image with Ollama' }, { status: 500 });
      }
    }
    
    // Fallback if Ollama is not available
    return NextResponse.json({ error: 'No analysis provider available' }, { status: 500 });
  } catch (err) {
    console.error('analyze-skin error:', err);
    return NextResponse.json({ error: 'Failed to analyze skin image' }, { status: 500 });
  }
}

// Add the analyzeWithOllama function if it doesn't exist
async function analyzeWithOllama(buffer, modality, model) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const base64 = buffer.toString('base64');
  const labels = modality === 'skin'
    ? ['Melanoma','Nv','Bkl','Akiec','Bcc','Df','Vasc']
    : ['Pneumonia','Pleural Effusion','Cardiomegaly','Consolidation','Pneumothorax','Atelectasis','Fracture','No Finding'];
  const prompt = `Analyze this ${modality} image and return ONLY strict JSON with this schema:
{
  "summary": string,
  "findings": [ { "label": string, "confidence": number (0..1) } ],
  "risk": "low"|"moderate"|"high",
  "report": string
}
Labels to consider: ${labels.join(', ')}. If a label is not visible, set low confidence (<=0.1).`;
  const resp = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: 'You are a careful medical vision assistant. Follow JSON schema exactly.' },
        { role: 'user', content: prompt, images: [base64] }
      ]
    })
  });
  const data = await resp.json().catch(async () => ({ message: { content: await resp.text() } }));
  const content = (data && data.message && typeof data.message.content === 'string') ? data.message.content : String(data || '');
  const json = extractJson(content);
  const findings = (json?.findings || []).map(x => ({ label: String(x.label || ''), confidence: Math.max(0, Math.min(1, Number(x.confidence || 0))) }))
    .filter(x => x.label);
  const total = findings.reduce((a,b)=>a+b.confidence,0) || 1;
  const normFindings = findings.map(x => ({ label: x.label, confidence: x.confidence / total }));
  return { result: { summary: json?.summary || 'See report', findings: normFindings, report: json?.report || '' } };
}

function extractJson(text) {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```json[\s\S]*?```/i);
  if (fence) {
    const inner = fence[0].replace(/```json/i,'').replace(/```/,'');
    try { return JSON.parse(inner); } catch {}
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}