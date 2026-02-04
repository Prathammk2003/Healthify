import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AnalysisResult from '@/models/AnalysisResult';
import { getTextEmbedding, classifyXray, classifySkin } from '@/lib/mm-stage1';
import { fuseScores, explainForPatient } from '@/lib/mm-stage2';

export async function POST(req) {
  try {
    await connectDB();
    const ctype = req.headers.get('content-type') || '';
    let symptoms = ''; let modality = 'xray'; let buffer = null; let userId = null; let provider = (process.env.IMAGE_ANALYSIS_PROVIDER || 'ollama').toLowerCase();

    if (ctype.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('image');
      if (file) buffer = Buffer.from(await file.arrayBuffer());
      symptoms = (form.get('symptoms') || '').toString();
      modality = (form.get('modality') || 'xray').toString();
      userId = form.get('userId') || null;
      if (form.get('provider')) provider = form.get('provider').toString().toLowerCase();
    } else {
      const body = await req.json();
      symptoms = body.symptoms || '';
      modality = body.modality || 'xray';
      if (body.imageBase64) buffer = Buffer.from(body.imageBase64, 'base64');
      userId = body.userId || null;
      if (body.provider) provider = String(body.provider).toLowerCase();
    }

    if (!buffer && !symptoms) {
      return NextResponse.json({ error: 'Provide symptoms and/or an image' }, { status: 400 });
    }
    if (buffer && (buffer.length > 10*1024*1024)) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
    }

    const textEmb = symptoms ? await getTextEmbedding(symptoms) : null;
    let imageTop = [];
    if (buffer) {
      if (provider === 'ollama') {
        const model = process.env.OLLAMA_MODEL || 'llava:7b';
        const { result } = await analyzeWithOllama(buffer, modality, model);
        imageTop = result.findings || [];
      } else {
        // Use Ollama as the default since we're not using Hugging Face API
        const model = process.env.OLLAMA_MODEL || 'llava:7b';
        const { result } = await analyzeWithOllama(buffer, modality, model);
        imageTop = result.findings || [];
      }
    }

    const { top, probs, risk } = await fuseScores({
      kind: modality,
      textEmb: textEmb || new Array(768).fill(0),
      imageScores: imageTop
    });

    // Build an expanded explanation including BERT cosine similarities and image findings
    const bertDetails = textEmb ? await buildBertDetails(symptoms, modality, textEmb) : '';
    const explanationCore = await explainForPatient({ symptoms, kind: modality, top, risk });
    const imageLines = (imageTop || []).slice(0,5).map(f => `- ${f.label}: ${(f.confidence*100|0)}%`).join('\n');
    const explanation = `${explanationCore}\n\nAdditional details:\n${bertDetails}${imageLines ? `\nImage findings:\n${imageLines}` : ''}`;

    const saved = await AnalysisResult.create({
      userId: userId || undefined,
      type: 'multimodal',
      inputs: { hasText: !!symptoms, hasImage: !!buffer },
      summary: explanation?.slice(0, 480),
      risk,
      conditions: probs.slice(0, 10),
      stage1: { textTop: [], imageTop },
      provider: 'ollama', // Changed from 'hf' to 'ollama'
      modelIds: {
        text: process.env.OLLAMA_TEXT_MODEL || 'llama3.2:3b', // Changed to Ollama text model
        image: process.env.OLLAMA_MODEL || 'llava:7b', // Changed to Ollama image model
        explainer: process.env.OLLAMA_TEXT_MODEL || 'llama3.2:3b' // Changed to Ollama text model
      }
    });

    return NextResponse.json({
      analysisId: saved._id.toString(),
      type: modality,
      risk,
      conditions: probs.slice(0,5),
      imageFindings: imageTop.slice(0,5),
      explanation,
      timestamp: saved.createdAt
    });
  } catch (err) {
    console.error('multimodal analyze error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

async function buildBertDetails(symptoms, modality, textEmb) {
  try {
    // Using local models instead of Hugging Face API
    console.log('BERT details would use local models');
    return '';
  } catch (e) {
    return '';
  }
}

async function analyzeWithOllama(buffer, modality, model) {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const base64 = buffer.toString('base64');
  const labels = modality === 'skin'
    ? ['Melanoma','Nv','Bkl','Akiec','Bcc','Df','Vasc']
    : ['Pneumonia','Pleural Effusion','Cardiomegaly','Consolidation','Pneumothorax','Atelectasis','Fracture','No Finding'];
  const prompt = `Analyze this ${modality} image and return ONLY strict JSON with this schema:\n{\n  "summary": string,\n  "findings": [ { "label": string, "confidence": number (0..1) } ],\n  "risk": "low"|"moderate"|"high",\n  "report": string\n}\nLabels to consider: ${labels.join(', ')}. If a label is not visible, set low confidence (<=0.1).`;
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


