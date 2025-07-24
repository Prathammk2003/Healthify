import axios from 'axios';
import { HfInference } from '@huggingface/inference';

// Use Hugging Face API for symptom diagnosis
export async function getSymptomDiagnosis(symptoms) {
  try {
    // Try Hugging Face API first
    const hfDiagnosis = await tryHuggingFaceAPI(symptoms);
    if (hfDiagnosis) return hfDiagnosis;
    
    // Try OpenAI API as second option
    const openaiDiagnosis = await tryOpenAIAPI(symptoms);
    if (openaiDiagnosis) return openaiDiagnosis;
    
    // Try Gemini API as third option
    const geminiDiagnosis = await tryGeminiAPI(symptoms);
    if (geminiDiagnosis) return geminiDiagnosis;
    
    // Only use fallback as last resort if all APIs fail
    console.warn('All AI APIs failed, using fallback diagnosis');
    return generateFallbackDiagnosis(symptoms);
  } catch (error) {
    console.error('Error in symptom diagnosis:', error);
    return generateFallbackDiagnosis(symptoms);
  }
}

// Try to get diagnosis from Hugging Face API
async function tryHuggingFaceAPI(symptoms) {
  try {
    // Check if we have the Hugging Face API key
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('HUGGINGFACE_API_KEY not found');
      return null;
    }

    // Create Hugging Face inference client
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

    // Create a detailed medical prompt that guides the model
    const prompt = `You are a medical AI assistant providing a preliminary analysis of patient symptoms. 
Based on the symptoms described, provide a detailed assessment with possible conditions, recommendations, and when to seek medical attention.

Patient's symptoms: "${symptoms}"

Please respond with a structured analysis including:
1. Initial Assessment: Summarize the key symptoms and their potential significance
2. Possible Conditions: List 2-3 potential conditions that might explain these symptoms, from most to least likely
3. Recommendations: Provide specific self-care measures that might help
4. When to Seek Medical Attention: Describe specific warning signs that would warrant immediate professional care
5. Next Steps: Suggest appropriate next actions (e.g., rest and monitor, consult with primary care, seek emergency care)

Important: Format the response with clear headings and bullet points for readability. Be thorough but concise.`;

    // Try primary model
    try {
      const response = await hf.textGeneration({
        model: 'google/gemma-7b-it',
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.7,
          top_p: 0.95,
          repetition_penalty: 1.15
        }
      });
      
      if (response && response.generated_text) {
        return formatDiagnosisResponse(response.generated_text);
      }
    } catch (primaryError) {
      console.error('Error with primary HF model:', primaryError);
      
      // Try with a different model if the first one fails
      try {
        const response = await hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          inputs: prompt,
          parameters: {
            max_new_tokens: 800,
            temperature: 0.7,
            top_p: 0.95,
            repetition_penalty: 1.15
          }
        });
        
        if (response && response.generated_text) {
          return formatDiagnosisResponse(response.generated_text);
        }
      } catch (fallbackError) {
        console.error('Error with fallback HF model:', fallbackError);
      }
    }
    
    // Return null if both models failed
    return null;
  } catch (error) {
    console.error('Error with Hugging Face API:', error);
    return null;
  }
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