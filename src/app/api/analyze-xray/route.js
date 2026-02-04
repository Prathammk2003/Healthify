import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AnalysisResult from '@/models/AnalysisResult';

export async function POST(req) {
  try {
    await connectDB();
    const form = await req.formData();
    const file = form.get('image');
    const userId = form.get('userId') || null;
    const requestedProvider = (form.get('provider') || '').toString();
    const provider = (requestedProvider || process.env.IMAGE_ANALYSIS_PROVIDER || 'ollama').toLowerCase();

    if (!file) return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    if (file.size && file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
    }
    // If provider is explicitly ollama, short-circuit to ollama first
    if (provider === 'ollama') {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ollamaModel = process.env.OLLAMA_MODEL || 'llava:7b';
      const { result, debug } = await analyzeWithOllama(buffer, 'xray', ollamaModel);
      const saved = await AnalysisResult.create({
        userId: userId || undefined,
        type: 'xray',
        provider: 'ollama',
        modelIds: { image: ollamaModel },
        summary: result.summary,
        report: result.report || undefined,
        conditions: result.findings
      });
      return NextResponse.json({
        id: saved._id.toString(),
        type: 'xray',
        provider: 'ollama',
        modelId: ollamaModel,
        summary: result.summary,
        findings: result.findings,
        report: result.report || undefined,
        source: 'ollama',
        diagnostics: debug,
        timestamp: saved.createdAt
      });
    }

    // Support comma-separated list and per-request override for easier testing/fallback

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try Ollama as the primary method since we're not using Hugging Face API
    if (process.env.OLLAMA_HOST) {
      try {
        const ollamaModel = process.env.OLLAMA_MODEL || 'llava:7b';
        const { result, debug } = await analyzeWithOllama(buffer, 'xray', ollamaModel);
        const findings = result.findings || [];
        const top = findings[0];
        const summary = top ? `${top.label} (${Math.round(top.confidence * 100)}%)` : 'No clear finding';
        
        const saved = await AnalysisResult.create({
          userId: userId || undefined,
          type: 'xray',
          provider: 'ollama',
          modelIds: { image: ollamaModel },
          summary,
          report: result.report || undefined,
          conditions: findings
        });
        
        return NextResponse.json({
          id: saved._id.toString(),
          type: 'xray',
          provider: 'ollama',
          modelId: ollamaModel,
          summary,
          findings,
          report: result.report || undefined,
          source: 'ollama',
          timestamp: saved.createdAt
        });
      } catch (err) {
        console.error('Ollama x-ray analysis error:', err);
        return NextResponse.json({ error: 'Failed to analyze x-ray image with Ollama' }, { status: 500 });
      }
    }
    
    // Fallback if no provider is available
    return NextResponse.json({ error: 'No analysis provider available' }, { status: 500 });
  } catch (err) {
    console.error('analyze-xray error:', err);
    return NextResponse.json({ error: 'Failed to analyze x-ray image' }, { status: 500 });
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
