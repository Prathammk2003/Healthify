import axios from 'axios';

// Enhanced AI models configuration
const AI_MODELS = {
  // Text generation models (free)
  text: {
    primary: 'microsoft/DialoGPT-medium',
    fallback: 'distilbert-base-uncased',
    medical: 'emilyalsentzer/Bio_ClinicalBERT'
  },
  // Image analysis models
  image: {
    xray: 'nickmccomb/vit-finetuned-chest-xray-pneumonia',
    skin: 'nateraw/vit-base-beans', // Can be replaced with medical skin model
    general: 'google/vit-base-patch16-224'
  },
  // Embedding models
  embeddings: {
    medical: 'emilyalsentzer/Bio_ClinicalBERT',
    general: 'sentence-transformers/all-MiniLM-L6-v2',
    clinical: 'medicalai/ClinicalBERT'
  }
};

// Medical knowledge base for enhanced symptom analysis
const MEDICAL_CONDITIONS = [
  { name: 'Upper respiratory infection', keywords: ['cough', 'runny nose', 'sore throat', 'congestion'], severity: 'mild' },
  { name: 'Influenza', keywords: ['fever', 'body aches', 'fatigue', 'chills'], severity: 'moderate' },
  { name: 'COVID-19', keywords: ['loss of taste', 'loss of smell', 'dry cough', 'fever'], severity: 'moderate' },
  { name: 'Migraine', keywords: ['severe headache', 'light sensitivity', 'nausea', 'visual disturbances'], severity: 'moderate' },
  { name: 'Tension headache', keywords: ['head pressure', 'stress', 'neck tension', 'band-like pain'], severity: 'mild' },
  { name: 'Gastroenteritis', keywords: ['nausea', 'vomiting', 'diarrhea', 'stomach cramps'], severity: 'moderate' },
  { name: 'Urinary tract infection', keywords: ['burning urination', 'frequent urination', 'pelvic pain'], severity: 'moderate' },
  { name: 'Allergic rhinitis', keywords: ['sneezing', 'itchy eyes', 'runny nose', 'seasonal'], severity: 'mild' },
  { name: 'Pneumonia', keywords: ['chest pain', 'productive cough', 'fever', 'difficulty breathing'], severity: 'severe' },
  { name: 'Anxiety disorder', keywords: ['worry', 'panic', 'restlessness', 'rapid heartbeat'], severity: 'moderate' },
  { name: 'Depression', keywords: ['sadness', 'hopelessness', 'fatigue', 'loss of interest'], severity: 'moderate' },
  { name: 'Hypertension', keywords: ['high blood pressure', 'headaches', 'dizziness'], severity: 'moderate' },
  { name: 'Diabetes symptoms', keywords: ['excessive thirst', 'frequent urination', 'fatigue', 'blurred vision'], severity: 'moderate' },
  { name: 'Asthma', keywords: ['wheezing', 'shortness of breath', 'chest tightness', 'cough'], severity: 'moderate' },
  { name: 'Sinusitis', keywords: ['facial pressure', 'nasal congestion', 'thick nasal discharge'], severity: 'mild' }
];

// Use local models for enhanced symptom diagnosis
export async function getSymptomDiagnosis(symptoms) {
  try {
    // Prefer Ollama locally if available or explicitly requested
    const preferOllama = (process.env.TEXT_ANALYSIS_PROVIDER || '').toLowerCase() === 'ollama' || !!process.env.OLLAMA_HOST;
    if (preferOllama) {
      const ollamaDiagnosis = await tryOllamaAPI(symptoms);
      if (ollamaDiagnosis) return ollamaDiagnosis;
    }

    // Enhanced BERT-based analysis with medical knowledge using local models
    const bertDiagnosis = await tryEnhancedBERTAnalysis(symptoms);
    if (bertDiagnosis) return bertDiagnosis;

    // Lightweight NLP: zero-shot clinical condition ranking via BioClinicalBERT embeddings using local models
    const nlpZS = await tryNLPZeroShot(symptoms);
    if (nlpZS) return nlpZS;
    
    // Try OpenAI API as fallback
    const openaiDiagnosis = await tryOpenAIAPI(symptoms);
    if (openaiDiagnosis) return openaiDiagnosis;
    
    // Try Gemini API as another fallback
    const geminiDiagnosis = await tryGeminiAPI(symptoms);
    if (geminiDiagnosis) return geminiDiagnosis;
    
    // Only use fallback as last resort if all APIs fail
    console.warn('All AI APIs failed, using enhanced fallback diagnosis');
    return generateEnhancedFallbackDiagnosis(symptoms);
  } catch (error) {
    console.error('Error in symptom diagnosis:', error);
    return generateEnhancedFallbackDiagnosis(symptoms);
  }
}

// Enhanced BERT-based analysis using medical knowledge with local models
async function tryEnhancedBERTAnalysis(symptoms) {
  try {
    // Using local models instead of Hugging Face API
    // This function would need to be reimplemented to use local model loading
    console.log('Enhanced BERT analysis would use local models');
    return null;
  } catch (error) {
    console.error('Enhanced BERT analysis failed:', error);
    return null;
  }
}

// Analyze symptoms against medical conditions database
async function analyzeAgainstConditions(symptoms, symptomsVector, hf, model) {
  try {
    const conditionScores = [];
    
    // Analyze each condition
    for (const condition of MEDICAL_CONDITIONS) {
      // Create condition description
      const conditionText = `Patient with ${condition.name}: ${condition.keywords.join(', ')}`;
      
      // Get condition embedding
      const conditionEmbedding = await hf.featureExtraction({
        model,
        inputs: conditionText,
        parameters: { wait_for_model: true }
      });
      
      const conditionVector = normalizeEmbedding(conditionEmbedding);
      
      // Calculate similarity
      const similarity = cosineSimilarity(symptomsVector, conditionVector);
      
      // Calculate keyword match score
      const keywordScore = calculateKeywordMatch(symptoms.toLowerCase(), condition.keywords);
      
      // Combined score (60% semantic similarity + 40% keyword match)
      const combinedScore = (similarity * 0.6) + (keywordScore * 0.4);
      
      conditionScores.push({
        condition: condition.name,
        similarity,
        keywordScore,
        combinedScore,
        severity: condition.severity,
        keywords: condition.keywords
      });
    }
    
    // Sort by combined score
    return conditionScores.sort((a, b) => b.combinedScore - a.combinedScore);
    
  } catch (error) {
    console.error('Condition analysis failed:', error);
    return [];
  }
}

// Calculate keyword match score
function calculateKeywordMatch(symptoms, keywords) {
  const matchedKeywords = keywords.filter(keyword => 
    symptoms.includes(keyword.toLowerCase())
  );
  return matchedKeywords.length / keywords.length;
}

// Normalize embedding vector
function normalizeEmbedding(embedding) {
  let vector = embedding;
  
  // Handle different embedding formats
  if (Array.isArray(embedding[0])) {
    // If it's a 2D array, take the mean
    vector = embedding[0];
    if (embedding.length > 1) {
      // Calculate mean across all token embeddings
      const dims = embedding[0].length;
      const sum = new Array(dims).fill(0);
      
      for (let i = 0; i < embedding.length; i++) {
        for (let j = 0; j < dims; j++) {
          sum[j] += embedding[i][j];
        }
      }
      
      vector = sum.map(val => val / embedding.length);
    }
  }
  
  // L2 normalization
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
  const minLength = Math.min(vec1.length, vec2.length);
  let dotProduct = 0;
  
  for (let i = 0; i < minLength; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  
  return Math.max(0, Math.min(1, dotProduct)); // Clamp between 0 and 1
}

// Generate BERT-based diagnosis
function generateBERTDiagnosis(symptoms, conditionAnalysis) {
  if (conditionAnalysis.length === 0) {
    return generateEnhancedFallbackDiagnosis(symptoms);
  }
  
  const topConditions = conditionAnalysis.slice(0, 5);
  const bestMatch = topConditions[0];
  const confidenceLevel = bestMatch.combinedScore > 0.7 ? 'high' : 
                         bestMatch.combinedScore > 0.5 ? 'moderate' : 'low';
  
  return `**Advanced AI Symptom Analysis**

**Analysis Method:**
• Medical-grade BERT embeddings (BioClinicalBERT)
• Semantic similarity analysis against medical knowledge base
• Keyword pattern matching with clinical conditions
• Combined scoring algorithm for accuracy

**Initial Assessment:**
• Confidence Level: ${confidenceLevel.toUpperCase()} (${Math.round(bestMatch.combinedScore * 100)}% match)
• Analysis processed against ${MEDICAL_CONDITIONS.length} medical conditions
• Semantic similarity: ${Math.round(bestMatch.similarity * 100)}%
• Keyword match: ${Math.round(bestMatch.keywordScore * 100)}%

**Most Likely Conditions:**
${topConditions.slice(0, 3).map((cond, index) => 
  `${index + 1}. **${cond.condition}** (${Math.round(cond.combinedScore * 100)}% match)
   • Severity: ${cond.severity}
   • Key indicators: ${cond.keywords.slice(0, 3).join(', ')}`
).join('\n\n')}

**Detailed Analysis:**
• Your symptoms show strongest correlation with **${bestMatch.condition}**
• This condition typically presents with: ${bestMatch.keywords.join(', ')}
• Severity classification: **${bestMatch.severity}**
• AI confidence in this assessment: ${Math.round(bestMatch.combinedScore * 100)}%

**Clinical Recommendations:**
${generateRecommendationsByCondition(bestMatch)}

**When to Seek Medical Attention:**
${generateWarningSignsByCondition(bestMatch)}

**Next Steps:**
• Monitor your symptoms and track any changes
• Keep a detailed symptom diary for healthcare providers
• Consider the severity level: **${bestMatch.severity}**
${bestMatch.severity === 'severe' ? '• **IMPORTANT**: Seek medical attention promptly for severe conditions'
 : bestMatch.severity === 'moderate' ? '• Consider consulting a healthcare provider within 24-48 hours'
 : '• Rest and self-care may be appropriate, but monitor for worsening'}

**AI Technology Used:**
• Model: ${AI_MODELS.embeddings.medical}
• Analysis type: Transformer-based medical language model
• Knowledge base: ${MEDICAL_CONDITIONS.length} clinical conditions
• Accuracy method: Semantic + keyword hybrid scoring

**Medical Disclaimer:**
This analysis uses advanced AI trained on medical literature but is not a substitute for professional medical diagnosis. Always consult healthcare providers for proper medical care.`;
}

// Generate recommendations based on condition
function generateRecommendationsByCondition(condition) {
  const recommendations = {
    'mild': [
      '• Rest and monitor symptoms closely',
      '• Stay hydrated and maintain good nutrition',
      '• Use over-the-counter remedies as appropriate',
      '• Apply comfort measures (heat/cold, positioning)'
    ],
    'moderate': [
      '• Rest and avoid strenuous activities',
      '• Monitor symptoms for changes or worsening',
      '• Consider appropriate over-the-counter medications',
      '• Maintain hydration and nutrition',
      '• Prepare to contact healthcare provider if needed'
    ],
    'severe': [
      '• Seek medical evaluation promptly',
      '• Monitor vital signs if possible',
      '• Avoid delaying medical care',
      '• Prepare list of symptoms for healthcare provider',
      '• Consider emergency care if symptoms worsen rapidly'
    ]
  };
  
  return recommendations[condition.severity] || recommendations['moderate'];
}

// Generate warning signs based on condition
function generateWarningSignsByCondition(condition) {
  const warnings = {
    'mild': [
      '• Symptoms persist beyond 7-10 days',
      '• Development of fever or severe pain',
      '• Significant worsening of any symptoms',
      '• New concerning symptoms develop'
    ],
    'moderate': [
      '• Symptoms worsen despite self-care',
      '• High fever or severe pain develops',
      '• Difficulty with daily activities',
      '• Symptoms persist beyond 3-5 days',
      '• Any concerning changes in condition'
    ],
    'severe': [
      '• Immediate medical attention recommended',
      '• Any worsening of current symptoms',
      '• Development of emergency warning signs',
      '• Difficulty breathing or chest pain',
      '• Severe pain or neurological symptoms'
    ]
  };
  
  return warnings[condition.severity] || warnings['moderate'];
}

// Enhanced fallback diagnosis with medical knowledge
function generateEnhancedFallbackDiagnosis(symptoms) {
  const symptomsLower = symptoms.toLowerCase();
  
  // Special handling for diabetes - check if we have both frequent urination and increased thirst
  const diabetesKeywords = [
    { 
      keywords: ['frequent urination', 'urination', 'pee', 'urinate', 'polyuria'], 
      condition: 'potential diabetes mellitus'
    },
    { 
      keywords: ['increased thirst', 'thirsty', 'polydipsia', 'excessive thirst'], 
      condition: 'potential diabetes mellitus'
    }
  ];
  
  const hasFrequentUrination = diabetesKeywords[0].keywords.some(keyword => symptomsLower.includes(keyword));
  const hasIncreasedThirst = diabetesKeywords[1].keywords.some(keyword => symptomsLower.includes(keyword));
  
  if (hasFrequentUrination && hasIncreasedThirst) {
    // Strong indication of diabetes
    const diabetesCondition = {
      name: 'Diabetes Mellitus',
      severity: 'high',
      keywords: ['frequent urination', 'increased thirst', 'fatigue', 'blurred vision']
    };
    
    return `**Basic Symptom Analysis**

**Pattern Recognition Results:**
• Identified potential matches based on keyword analysis
• Primary consideration: **${diabetesCondition.name}** (HIGH SUSPICION)
• Additional possibilities: Urinary tract infection, Depression

**General Assessment:**
• Your symptoms show a classic pattern consistent with diabetes mellitus
• Severity estimate: **${diabetesCondition.severity}**
• Key symptom indicators detected: frequent urination, increased thirst, fatigue

**General Recommendations:**
• Monitor blood glucose levels and consult healthcare provider immediately
• Maintain optimal fluid balance but avoid sugary drinks
• Record symptom patterns for medical consultation

**When to Seek Medical Attention:**
• Seek immediate care if blood glucose is very high or you develop nausea/vomiting
• Consult healthcare provider within 24 hours for proper evaluation
• Watch for emergency indicators: difficulty breathing, confusion, or severe abdominal pain

**Important Note:**
This is a basic pattern analysis showing HIGH SUSPICION for diabetes mellitus. For accurate diagnosis and appropriate treatment, please consult with a qualified healthcare professional immediately.`;
  }
  
  // Simple keyword-based analysis as fallback
  const matchedConditions = MEDICAL_CONDITIONS.filter(condition => 
    condition.keywords.some(keyword => 
      symptoms.toLowerCase().includes(keyword.toLowerCase())
    )
  ).slice(0, 3);
  
  if (matchedConditions.length > 0) {
    const primaryCondition = matchedConditions[0];
    
    return `**Basic Symptom Analysis**

**Pattern Recognition Results:**
• Identified potential matches based on keyword analysis
• Primary consideration: **${primaryCondition.name}**
• Additional possibilities: ${matchedConditions.slice(1).map(c => c.name).join(', ') || 'None identified'}

**General Assessment:**
• Your symptoms suggest patterns consistent with common conditions
• Severity estimate: **${primaryCondition.severity}**
• Key symptom indicators detected: ${primaryCondition.keywords.join(', ')}

**General Recommendations:**
${generateRecommendationsByCondition(primaryCondition).join('\n')}

**When to Seek Medical Attention:**
${generateWarningSignsByCondition(primaryCondition).join('\n')}

**Important Note:**
This is a basic pattern analysis. For accurate diagnosis and appropriate treatment, please consult with a qualified healthcare professional.`;
  }
  
  return generateFallbackDiagnosis(symptoms);
}

// Zero-shot condition ranking using BioClinicalBERT embeddings against a small condition set
async function tryNLPZeroShot(symptoms) {
  try {
    // Using local models instead of Hugging Face API
    console.log('Zero-shot NLP would use local models');
    return null;
  } catch (e) {
    console.warn('Zero-shot NLP failed:', e?.message || e);
    return null;
  }
}

// Try to get diagnosis from local Ollama server
async function tryOllamaAPI(symptoms) {
  try {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const model = process.env.OLLAMA_TEXT_MODEL || 'llama3.2:3b';
    const prompt = `You are a medical AI assistant providing a preliminary analysis of patient symptoms.\n\n` +
      `Provide a concise, clinically careful assessment with clear headings and bullet points. Avoid speculation. If uncertain, say so.\n\n` +
      `Patient's symptoms: \n"""\n${symptoms}\n"""\n\n` +
      `Respond with the following sections: \n` +
      `1. Initial Assessment\n2. Possible Conditions (2-4, most to least likely)\n3. Recommendations\n4. When to Seek Medical Attention\n5. Next Steps\n` +
      `Keep it under 300-400 words.`;

    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: 'You are a cautious medical assistant. Never give definitive diagnoses. Use clear headings and bullets.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(()=>'');
      console.warn('Ollama text analyze failed:', res.status, text?.slice(0,300));
      return null;
    }

    const data = await res.json();
    const content = data?.message?.content || '';
    if (!content) return null;
    return formatDiagnosisResponse(content);
  } catch (error) {
    console.error('Error with Ollama API:', error);
    return null;
  }
}

// Try to get diagnosis from Hugging Face API with enhanced models

// BERT-based analysis for embedding models
async function tryBertBasedAnalysis(symptoms, hf, modelName) {
  try {
    // Use the model for feature extraction (embeddings)
    const embedding = await hf.featureExtraction({
      model: modelName,
      inputs: symptoms,
      parameters: { wait_for_model: true }
    });
    
    // Analyze against medical conditions
    const conditions = [
      'respiratory infection', 'influenza', 'migraine', 'gastroenteritis',
      'urinary tract infection', 'anxiety', 'depression', 'hypertension'
    ];
    
    const conditionEmbeddings = await Promise.all(
      conditions.map(condition => 
        hf.featureExtraction({
          model: modelName,
          inputs: `Patient with ${condition} symptoms`,
          parameters: { wait_for_model: true }
        })
      )
    );
    
    // Calculate similarities
    const symptomsVec = normalizeEmbedding(embedding);
    const similarities = conditionEmbeddings.map((condEmb, index) => {
      const condVec = normalizeEmbedding(condEmb);
      const similarity = cosineSimilarity(symptomsVec, condVec);
      return {
        condition: conditions[index],
        similarity,
        confidence: Math.round(similarity * 100)
      };
    });
    
    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return generateEmbeddingBasedDiagnosis(symptoms, similarities.slice(0, 3));
    
  } catch (error) {
    console.error('BERT analysis failed:', error);
    return null;
  }
}

// Zero-shot classification approach
async function tryZeroShotClassification(symptoms, hf) {
  try {
    const candidateLabels = [
      'respiratory infection',
      'gastrointestinal issue',
      'neurological symptoms',
      'cardiovascular concern',
      'musculoskeletal problem',
      'mental health concern',
      'skin condition',
      'allergic reaction'
    ];
    
    const result = await hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: symptoms,
      parameters: {
        candidate_labels: candidateLabels,
        wait_for_model: true
      }
    });
    
    if (result && result.labels && result.scores) {
      const topCategories = result.labels.slice(0, 3).map((label, index) => ({
        category: label,
        confidence: Math.round(result.scores[index] * 100)
      }));
      
      return generateCategoryBasedDiagnosis(symptoms, topCategories);
    }
    
    return null;
  } catch (error) {
    console.error('Zero-shot classification failed:', error);
    return null;
  }
}

// Generate diagnosis based on embeddings
function generateEmbeddingBasedDiagnosis(symptoms, similarities) {
  const topMatch = similarities[0];
  
  return `**AI Embedding Analysis Results**

**Analysis Method:**
• BERT-based semantic embeddings
• Medical concept similarity matching
• Cosine similarity scoring

**Top Condition Matches:**
${similarities.map((sim, index) => 
  `${index + 1}. ${sim.condition.charAt(0).toUpperCase() + sim.condition.slice(1)} (${sim.confidence}% similarity)`
).join('\n')}

**Primary Assessment:**
• Strongest match: **${topMatch.condition}**
• Semantic similarity: ${topMatch.confidence}%
• Analysis confidence: ${topMatch.confidence > 70 ? 'High' : topMatch.confidence > 50 ? 'Moderate' : 'Low'}

**Recommendations:**
• Monitor symptoms and note any changes
• Consider appropriate self-care measures
• Seek medical advice if symptoms persist or worsen

**Important:**
This analysis uses AI embeddings but should not replace professional medical evaluation.`;
}

// Generate diagnosis based on categories
function generateCategoryBasedDiagnosis(symptoms, categories) {
  const topCategory = categories[0];
  
  return `**AI Classification Analysis**

**Symptom Classification:**
${categories.map((cat, index) => 
  `${index + 1}. ${cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}: ${cat.confidence}%`
).join('\n')}

**Primary Category:** ${topCategory.category}
**Confidence Level:** ${topCategory.confidence}%

**General Guidance:**
• Your symptoms appear to be in the **${topCategory.category}** category
• Consider consulting appropriate healthcare specialists
• Monitor symptoms for changes or progression

**Next Steps:**
• Document symptom patterns and triggers
• Seek professional medical evaluation for proper diagnosis
• Follow up if symptoms persist or worsen

**Note:**
This is a general classification and should not replace professional medical assessment.`;
}

// Try to get diagnosis from OpenAI API
async function tryOpenAIAPI(symptoms) {
  try {
    // Check if we have the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not found');
      return null;
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant providing preliminary analysis of patient symptoms.'
          },
          {
            role: 'user',
            content: `Based on the following symptoms, provide a detailed assessment with possible conditions, recommendations, and when to seek medical attention.
            
Patient's symptoms: "${symptoms}"

Please respond with a structured analysis including:
1. Initial Assessment: Summarize the key symptoms and their potential significance
2. Possible Conditions: List 2-3 potential conditions that might explain these symptoms, from most to least likely
3. Recommendations: Provide specific self-care measures that might help
4. When to Seek Medical Attention: Describe specific warning signs that would warrant immediate professional care
5. Next Steps: Suggest appropriate next actions (e.g., rest and monitor, consult with primary care, seek emergency care)

Format the response with clear headings and bullet points for readability. Be thorough but concise.`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return formatDiagnosisResponse(response.data.choices[0].message.content);
    }
    
    return null;
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    return null;
  }
}

// Try to get diagnosis from Gemini API
async function tryGeminiAPI(symptoms) {
  try {
    // Check if we have the Gemini API key
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found');
      return null;
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a medical AI assistant providing a preliminary analysis of patient symptoms. 
Based on the following symptoms, provide a detailed assessment with possible conditions, recommendations, and when to seek medical attention.

Patient's symptoms: "${symptoms}"

Please respond with a structured analysis including:
1. Initial Assessment: Summarize the key symptoms and their potential significance
2. Possible Conditions: List 2-3 potential conditions that might explain these symptoms, from most to least likely
3. Recommendations: Provide specific self-care measures that might help
4. When to Seek Medical Attention: Describe specific warning signs that would warrant immediate professional care
5. Next Steps: Suggest appropriate next actions (e.g., rest and monitor, consult with primary care, seek emergency care)

Format the response with clear headings and bullet points for readability. Be thorough but concise.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          topP: 0.95
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const text = response.data.candidates[0].content.parts[0].text;
      return formatDiagnosisResponse(text);
    }
    
    return null;
  } catch (error) {
    console.error('Error with Gemini API:', error);
    return null;
  }
}

// Format the response for better readability
function formatDiagnosisResponse(text) {
  // Clean up any model artifacts or headers
  let cleanedText = text.replace(/^As a medical AI assistant|^I'll provide a preliminary analysis/i, '');
  
  // Ensure headings are properly formatted
  const headings = ['Initial Assessment', 'Possible Conditions', 'Recommendations', 'When to Seek Medical Attention', 'Next Steps'];
  
  headings.forEach(heading => {
    // Replace variations of the heading format with a consistent one
    cleanedText = cleanedText.replace(
      new RegExp(`(^|\\n)${heading}[:\\s-]*`, 'i'),
      `\n\n**${heading}:**\n`
    );
  });
  
  // Improve bullet point formatting
  cleanedText = cleanedText.replace(/^[-*•]\s*/gm, '• ');
  
  // Add a disclaimer at the end
  const disclaimer = `\n\n**Disclaimer:** This analysis is based on the information provided and is not a definitive medical diagnosis. Always consult with a healthcare professional for proper medical advice and treatment.`;
  
  return cleanedText + disclaimer;
}

// Expanded fallback function for when all APIs are unavailable
function generateFallbackDiagnosis(symptoms) {
  // Convert symptoms to lowercase for easier matching
  const symptomText = symptoms.toLowerCase();
  
  // Define more comprehensive symptom patterns with detailed responses
  const symptomPatterns = [
    {
      keywords: ['headache', 'head pain', 'migraine', 'head hurts'],
      diagnosis: `**Initial Assessment:**
• You're experiencing head pain which could range from tension-type headaches to migraines.
• The nature, location, and triggers of your headache are important diagnostic factors.

**Possible Conditions:**
• Tension Headache: Often feels like pressure or tightness around the head, commonly triggered by stress or poor posture.
• Migraine: Typically involves throbbing pain, often on one side, sometimes with nausea, vomiting, or sensitivity to light and sound.
• Sinus Headache: Usually accompanied by nasal congestion, pressure around the eyes, cheeks, and forehead.

**Recommendations:**
• Rest in a quiet, dark room to reduce sensory stimulation
• Apply a cold or warm compress to your forehead or neck
• Stay hydrated and maintain regular meals
• Consider over-the-counter pain relievers like acetaminophen or ibuprofen if appropriate
• Practice stress-reduction techniques such as deep breathing or meditation

**When to Seek Medical Attention:**
• If your headache is sudden and severe ("thunderclap" headache)
• If it's accompanied by fever, stiff neck, confusion, seizures, double vision, weakness, or numbness
• If it occurs after a head injury
• If it's the "worst headache of your life"
• If headaches are increasing in frequency or severity

**Next Steps:**
• Monitor your symptoms and keep a headache diary noting triggers
• If headaches persist for more than a few days or recur frequently, consult your primary care physician
• Consider lifestyle modifications to address potential triggers (sleep hygiene, stress management, diet)`
    },
    {
      keywords: ['fever', 'high temperature', 'chills', 'body aches', 'sweating'],
      diagnosis: `**Initial Assessment:**
• You're experiencing elevated body temperature which is your body's response to infection or inflammation.
• Accompanying symptoms like chills and body aches suggest a systemic response.

**Possible Conditions:**
• Viral Infection: Common cold, influenza, or COVID-19 often present with fever and body aches.
• Bacterial Infection: Such as strep throat, urinary tract infection, or pneumonia.
• Inflammatory Condition: Various inflammatory conditions can cause fever.

**Recommendations:**
• Rest and stay hydrated with water, clear broths, or electrolyte solutions
• Take acetaminophen or ibuprofen to reduce fever and discomfort if appropriate
• Dress in lightweight clothing and use light bedding
• Take lukewarm (not cold) baths or apply cool compresses
• Monitor your temperature regularly

**When to Seek Medical Attention:**
• If your temperature exceeds 103°F (39.4°C)
• If fever persists more than 3 days
• If you have a serious medical condition or are immunocompromised
• If fever is accompanied by severe headache, unusual skin rash, neck stiffness, or persistent vomiting
• For infants, children, and elderly individuals with any significant fever

**Next Steps:**
• Continue monitoring your temperature and other symptoms
• If symptoms worsen or don't improve within 48-72 hours, contact your healthcare provider
• Consider COVID-19 testing if that's a concern in your situation`
    },
    {
      keywords: ['cough', 'sore throat', 'congestion', 'runny nose', 'sneezing', 'stuffy'],
      diagnosis: `**Initial Assessment:**
• Your symptoms indicate an upper respiratory tract infection affecting your nose, throat, and airways.
• The combination of symptoms suggests inflammation and irritation of the respiratory mucosa.

**Possible Conditions:**
• Common Cold: Typically includes runny/stuffy nose, sneezing, mild cough, and sometimes sore throat.
• Seasonal Allergies: Similar to cold symptoms but often with itchy eyes, seasonal patterns, and no fever.
• Acute Sinusitis: Features facial pressure/pain, thick nasal discharge, and possible reduction in smell.

**Recommendations:**
• Rest and stay hydrated
• Use saline nasal sprays or rinses to relieve congestion
• Consider over-the-counter decongestants, antihistamines, or pain relievers as appropriate
• Use a humidifier to add moisture to the air
• Gargle with warm salt water for sore throat relief
• Honey and lemon in warm water may soothe throat irritation (not for children under 1 year)

**When to Seek Medical Attention:**
• If symptoms last more than 10 days without improvement
• If you experience high fever (above 102°F/38.9°C)
• If you develop severe headache, facial or sinus pain
• If you have shortness of breath or difficulty breathing
• If you have underlying lung conditions like asthma or COPD

**Next Steps:**
• Monitor your symptoms for the next few days
• If it's a typical cold, expect symptoms to peak around days 3-5 and gradually improve
• Consider consulting your healthcare provider if symptoms worsen or if you have concerns about COVID-19`
    },
    {
      keywords: ['stomach', 'nausea', 'vomiting', 'diarrhea', 'abdominal pain', 'belly', 'gut'],
      diagnosis: `**Initial Assessment:**
• You're experiencing gastrointestinal symptoms that indicate irritation or inflammation in your digestive system.
• These symptoms can result from various causes ranging from mild foodborne illness to more serious conditions.

**Possible Conditions:**
• Gastroenteritis (Stomach Flu): Viral or bacterial infection causing inflammation of the stomach and intestines.
• Food Poisoning: Symptoms typically appear within hours of consuming contaminated food.
• Irritable Bowel Syndrome: Chronic condition with recurring abdominal pain and altered bowel habits.

**Recommendations:**
• Stay hydrated with small, frequent sips of clear fluids
• Try the BRAT diet (bananas, rice, applesauce, toast) once able to tolerate food
• Avoid dairy, fatty, spicy, or high-fiber foods temporarily
• Rest and allow your body to recover
• Consider over-the-counter medications like Pepto-Bismol for specific symptoms if appropriate

**When to Seek Medical Attention:**
• If you have severe abdominal pain, especially if localized to one area
• If you see blood in vomit or stool
• If you have signs of dehydration (extreme thirst, dry mouth, little or no urination, severe weakness)
• If symptoms persist beyond 2-3 days
• If you have a fever above 102°F (38.9°C)

**Next Steps:**
• Monitor symptoms and stay hydrated
• Gradually return to normal diet as symptoms improve
• If no improvement in 48 hours or if symptoms worsen, contact your healthcare provider`
    },
    {
      keywords: ['tired', 'fatigue', 'exhaustion', 'low energy', 'weakness', 'lethargic'],
      diagnosis: `**Initial Assessment:**
• You're experiencing fatigue which is a common symptom that can be caused by many factors ranging from lifestyle to medical conditions.
• Fatigue can be physical, mental, or both, and can significantly impact daily functioning.

**Possible Conditions:**
• Lifestyle Factors: Inadequate sleep, poor nutrition, dehydration, stress, or overexertion.
• Medical Conditions: Anemia, thyroid disorders, depression, sleep apnea, or chronic fatigue syndrome.
• Medication Side Effects: Many medications can cause fatigue as a side effect.

**Recommendations:**
• Prioritize sleep hygiene with consistent sleep/wake times and a comfortable sleep environment
• Stay hydrated and maintain a balanced diet rich in fruits, vegetables, and lean proteins
• Engage in regular physical activity (start gently if you're very fatigued)
• Manage stress through mindfulness, meditation, or other relaxation techniques
• Consider a gradual reduction in caffeine and alcohol

**When to Seek Medical Attention:**
• If fatigue is severe or comes on suddenly
• If it persists for more than two weeks despite adequate rest
• If accompanied by unexplained weight loss, fever, pain, or shortness of breath
• If you suspect it might be related to a medication you're taking
• If it significantly interferes with daily activities

**Next Steps:**
• Keep a journal tracking your energy levels, sleep, diet, and activities to identify patterns
• Consider a general check-up with your healthcare provider, including bloodwork to rule out common medical causes
• Evaluate your daily routine for potential lifestyle modifications that could improve energy`
    },
    {
      keywords: ['rash', 'itchy skin', 'hives', 'skin irritation', 'bumps', 'skin', 'eczema'],
      diagnosis: `**Initial Assessment:**
• You're experiencing skin changes or irritation which could indicate various skin conditions.
• The appearance, location, duration, and any accompanying symptoms are important factors in determining the cause.

**Possible Conditions:**
• Contact Dermatitis: Skin reaction from direct contact with an irritant or allergen (plants, chemicals, fabrics).
• Allergic Reaction: Hives or widespread rash triggered by medications, foods, or environmental factors.
• Eczema/Atopic Dermatitis: Chronic condition causing dry, itchy, inflamed skin patches.

**Recommendations:**
• Avoid scratching to prevent skin damage and infection
• Apply cool compresses to relieve itching
• Consider over-the-counter hydrocortisone cream for temporary relief
• Use gentle, fragrance-free soap and moisturize with hypoallergenic products
• Take an oral antihistamine like Benadryl if appropriate to reduce itching
• Identify and avoid potential triggers or irritants

**When to Seek Medical Attention:**
• If the rash covers a large portion of your body
• If it appears suddenly and spreads rapidly
• If accompanied by fever, difficulty breathing, swelling of face/lips, or blistering
• If the rash is painful, infected (warm, swollen, pus-filled), or near the eyes
• If it doesn't improve with home treatment after a few days

**Next Steps:**
• Document the appearance and progression of the rash with photos
• Try to identify potential triggers by reviewing recent changes in products, foods, or environments
• If symptoms persist or worsen, consult with a healthcare provider or dermatologist`
    },
    {
      keywords: ['dizzy', 'dizziness', 'lightheaded', 'vertigo', 'balance', 'spinning', 'faint'],
      diagnosis: `**Initial Assessment:**
• You're experiencing dizziness, which can manifest as lightheadedness, a spinning sensation (vertigo), or feeling unsteady.
• This symptom can result from various causes affecting your brain, inner ear, or cardiovascular system.

**Possible Conditions:**
• Inner Ear Issues: Such as benign paroxysmal positional vertigo (BPPV), Ménière's disease, or vestibular neuritis.
• Cardiovascular Causes: Including low blood pressure, poor circulation, or heart rhythm abnormalities.
• Other Medical Conditions: Anemia, dehydration, low blood sugar, anxiety, or medication side effects.

**Recommendations:**
• Sit or lie down immediately when feeling dizzy to prevent falls
• Move slowly when changing positions, especially when getting up
• Stay well hydrated and ensure adequate food intake
• Avoid triggers such as sudden head movements or certain positions if they worsen symptoms
• Ensure adequate rest and stress management

**When to Seek Medical Attention:**
• If dizziness is severe or persistent
• If accompanied by severe headache, chest pain, shortness of breath, or neurological symptoms (speech changes, weakness, numbness)
• If associated with fainting or near-fainting
• If you experience hearing loss, ringing in ears, or persistent ear pain
• If you're at risk for heart disease or stroke

**Next Steps:**
• Maintain a diary of episodes, noting triggers, duration, and accompanying symptoms
• Consider checking blood pressure at home if possible
• Consult with your healthcare provider, who may recommend evaluation by a specialist (ENT, neurologist, or cardiologist)`
    }
  ];
  
  // Check for matching patterns
  for (const pattern of symptomPatterns) {
    if (pattern.keywords.some(keyword => symptomText.includes(keyword))) {
      return pattern.diagnosis;
    }
  }
  
  // Default response if no patterns match
  return `**Initial Assessment:**
• Based on the symptoms you've described, I can't provide a specific diagnosis as they could relate to various conditions.
• It's important to monitor your symptoms and observe any changes or additional symptoms that develop.

**Possible Conditions:**
• Your symptoms could be related to a number of different conditions.
• Without more specific information, it's difficult to narrow down potential causes.
• Both minor self-limiting conditions and more serious issues can present with these symptoms.

**Recommendations:**
• Monitor your symptoms and keep a symptom journal noting severity, timing, and any triggers
• Ensure you're getting adequate rest, staying hydrated, and maintaining good nutrition
• Practice general wellness measures like stress management and moderate activity as tolerated
• Avoid self-diagnosis or self-medication beyond basic over-the-counter remedies

**When to Seek Medical Attention:**
• If symptoms persist beyond 7 days or worsen
• If you develop fever, severe pain, or difficulty with daily activities
• If you notice any unusual changes in your bodily functions
• If you have underlying health conditions that might be affected by these symptoms
• If you feel concerned or uncertain about your condition

**Next Steps:**
• Consider consulting with a healthcare provider for proper evaluation
• Be prepared to describe your symptoms in detail, including when they started and any patterns you've noticed
• If symptoms change significantly before your appointment, contact your provider for updated guidance

**Disclaimer:** This analysis is based on the information provided and is not a definitive medical diagnosis. Always consult with a healthcare professional for proper medical advice and treatment.`;
}