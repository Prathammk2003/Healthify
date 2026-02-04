// Removed Hugging Face import since we're using local models
// import { HfInference } from '@huggingface/inference';
// Removed global HfInference instance since we're using local models
// const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

const XRAY_LABELS = [
  'Pneumonia','Pleural Effusion','Cardiomegaly','Consolidation','Pneumothorax','Atelectasis','Fracture','No Finding'
];
const SKIN_LABELS = [
  'Melanoma','Nv','Bkl','Akiec','Bcc','Df','Vasc'
];

let protoCache = { textModel: null, xray: null, skin: null };

export async function getConditionPrototypes(kind, embedFn) {
  const key = kind === 'xray' ? 'xray' : 'skin';
  const labels = key === 'xray' ? XRAY_LABELS : SKIN_LABELS;
  if (protoCache[key] && protoCache.textModel === (process.env.OLLAMA_TEXT_MODEL || 'llama3.2:3b')) return protoCache[key];
  const desc = labels.map(l => `${l} condition in a patient`);
  const embs = await Promise.all(desc.map(d => embedFn(d)));
  protoCache[key] = labels.map((label,i)=>({ label, emb: embs[i] }));
  protoCache.textModel = process.env.OLLAMA_TEXT_MODEL || 'llama3.2:3b';
  return protoCache[key];
}

export function cosine(a,b){ let s=0; const n=Math.min(a?.length||0,b?.length||0); for(let i=0;i<n;i++) s+=a[i]*b[i]; return s; }

export async function fuseScores({ kind, textEmb, imageScores }) {
  const { getTextEmbedding } = await import('./mm-stage1.js');
  const protos = await getConditionPrototypes(kind, (t)=>getTextEmbedding(t));

  const textSims = protos.map(p => ({ label: p.label, score: cosine(textEmb || [], p.emb || []) }));
  const min = Math.min(...textSims.map(x=>x.score)); const max = Math.max(...textSims.map(x=>x.score)) || 1;
  const textProbs = textSims.map(x => ({ label: x.label, p: (x.score-min)/(max-min || 1) }));
  const textSum = textProbs.reduce((a,b)=>a+b.p,0) || 1;
  const textNorm = textProbs.map(x => ({ label: x.label, p: x.p/textSum }));

  const normalizeLabel = (l)=> l.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase()).trim();
  const imgMap = Object.fromEntries((imageScores||[]).map(x => [normalizeLabel(x.label), x.confidence]));
  const labels = protos.map(p => p.label);
  const imgNormSum = labels.reduce((a,l)=>a+(imgMap[l]||0),0) || 1;
  const imgNorm = labels.map(l => ({ label: l, p: (imgMap[l]||0)/imgNormSum }));

  const wt = 0.5, wi = 0.5;
  const fused = labels.map((l,idx)=>({ label: l, confidence: wt*(textNorm[idx]?.p || 0) + wi*(imgNorm[idx]?.p || 0) }));
  const exps = fused.map(x => Math.exp(x.confidence));
  const Z = exps.reduce((a,b)=>a+b,0) || 1;
  const probs = fused.map((x,i)=>({ label: x.label, confidence: exps[i]/Z })).sort((a,b)=>b.confidence-a.confidence);

  const top = probs.slice(0,3);
  const risk = assessRisk(kind, top);
  return { top, probs, risk };
}

function assessRisk(kind, top){
  const high = ['Pneumothorax','Pneumonia','Cardiomegaly','Melanoma'];
  if (top.some(x => high.includes(x.label) && x.confidence > 0.5)) return 'high';
  if (top[0]?.confidence > 0.6) return 'moderate';
  return 'low';
}

export async function explainForPatient({ symptoms, kind, top, risk }) {
  // Using local models instead of Hugging Face API
  console.log('Explanation would use local models');
  
  // Generate a simple explanation based on the inputs
  let explanation = `Based on the ${kind} analysis and symptoms provided, here are the findings:\n\n`;
  
  explanation += `Top conditions identified:\n`;
  top.forEach((condition, index) => {
    explanation += `${index + 1}. ${condition.label} (confidence: ${(condition.confidence * 100).toFixed(1)}%)\n`;
  });
  
  explanation += `\nRisk level: ${risk}\n\n`;
  
  explanation += `Recommended next steps:\n`;
  explanation += `- Consult with a healthcare professional for accurate diagnosis\n`;
  explanation += `- Provide these results to your doctor for further evaluation\n`;
  explanation += `- If experiencing severe symptoms, seek immediate medical attention\n\n`;
  
  explanation += `Disclaimer: This analysis is for informational purposes only and should not be considered medical advice. Always consult with a qualified healthcare professional for proper diagnosis and treatment.`;
  
  return explanation;
}