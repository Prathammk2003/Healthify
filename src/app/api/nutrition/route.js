/*
 * Nutrition API - AI-Powered Diet Recommendations
 * 
 * This API generates personalized nutrition plans based on user data.
 * 
 * To use AI-generated responses, you need to set up one of these API keys:
 * 1. HUGGINGFACE_API_KEY in .env.local (preferred)
 * 2. OPENAI_API_KEY in .env.local (alternative)
 * 3. GEMINI_API_KEY in .env.local (alternative)
 * 
 * If no API keys are available, the API will fall back to the built-in recommendation engine.
 */

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';
import axios from 'axios';
import { getRegionalCuisine } from './nutrition-helper';

// Debug API key availability
const debugApiKeys = () => {
  // Load environment variables directly from process.env
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const hfKey = process.env.HUGGINGFACE_API_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';
  
  // Safe logging - show partial key for debugging without exposing full key
  const safeLogKey = (key) => {
    if (!key) return 'Not available';
    if (key.length <= 8) return 'Available but possibly invalid (too short)';
    return `Available: ${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };
  
  console.log('API Key Status:');
  console.log('- Gemini API Key:', safeLogKey(geminiKey));
  console.log('- HuggingFace API Key:', safeLogKey(hfKey));
  console.log('- OpenAI API Key:', safeLogKey(openaiKey));
  
  return {
    hasGeminiKey: !!geminiKey && geminiKey.length > 10,
    hasHfKey: !!hfKey && hfKey.length > 10,
    hasOpenaiKey: !!openaiKey && openaiKey.length > 10
  };
};

// For Gemini integration - adding a try/catch for import to prevent crashes
let GoogleGenerativeAI;
try {
  const module = require('@google/generative-ai');
  GoogleGenerativeAI = module.GoogleGenerativeAI;
} catch (error) {
  console.warn('Google Generative AI module could not be loaded:', error.message);
  // Creating a placeholder class to prevent crashes
  GoogleGenerativeAI = class MockGoogleGenerativeAI {
    constructor() {
      console.warn('Using mock GoogleGenerativeAI - Gemini API will not be available');
    }
    getGenerativeModel() {
      return {
        generateContent: async () => {
          throw new Error('Google Generative AI is not available');
        }
      };
    }
  };
}

export async function POST(req) {
  try {
    await connectDB();
    const userData = await req.json();

    if (!userData || !userData.height || !userData.weight || !userData.age) {
      return NextResponse.json({ error: 'Missing required user data' }, { status: 400 });
    }

    // Explicitly load and check environment variables
    console.log('Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Has .env.local variables:', !!process.env.DATABASE_URI);
    
    // Debug available API keys
    const apiKeyStatus = debugApiKeys();
    console.log('API Key Status Summary:', JSON.stringify(apiKeyStatus));

    // Track API errors for diagnostic purposes
    const apiErrors = {
      gemini: null,
      openai: null,
      huggingface: null
    };

    // Log request (no personal data)
    console.log(`Nutrition plan request received for user with age ${userData.age}`);

    // Generate nutrition plan using AI
    const nutritionPlan = await generateAINutritionPlan(userData, apiKeyStatus, apiErrors);

    // Include API key availability and source info in response
    const aiSource = nutritionPlan.source === 'ai' ? 'AI-generated' : 
                    (nutritionPlan.source === 'fallback' ? 'Template-based' : 'Emergency fallback');

    // Create diagnostic message if using fallback
    let diagnosticMessage = '';
    if (nutritionPlan.source !== 'ai') {
      diagnosticMessage = 'Using template-based generation because AI generation failed. ';
      
      // Add specific reasons for each API failure
      if (apiErrors.gemini) {
        diagnosticMessage += `Gemini API failed: ${apiErrors.gemini}. `;
      }
      
      if (apiErrors.openai) {
        diagnosticMessage += `OpenAI API failed: ${apiErrors.openai}. `;
      }
      
      if (apiErrors.huggingface) {
        diagnosticMessage += `Hugging Face API failed: ${apiErrors.huggingface}. `;
      }
      
      if (!apiKeyStatus.hasGeminiKey && !apiKeyStatus.hasOpenaiKey && !apiKeyStatus.hasHfKey) {
        diagnosticMessage += 'No valid API keys available. ';
      }
      
      diagnosticMessage += 'Check server logs for detailed error information.';
    }

    return NextResponse.json({ 
      nutritionPlan: {
        ...nutritionPlan,
        _debug: {
          apiKeysAvailable: apiKeyStatus,
          diagnosticMessage: diagnosticMessage
        }
      },
      aiGenerated: nutritionPlan.source === 'ai',
      generationSource: aiSource,
      timestamp: new Date().toISOString(),
      status: 'success',
      _debug: {
        apiKeysAvailable: apiKeyStatus,
        environmentInfo: {
          nodeEnv: process.env.NODE_ENV,
          hasEnvVars: !!process.env.DATABASE_URI
        },
        diagnosticMessage: diagnosticMessage
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error processing nutrition plan request:', error);
    return NextResponse.json({ 
      error: 'Server error processing your request. Please try again later.',
      status: 'error',
      timestamp: new Date().toISOString(),
      _debug: {
        errorMessage: error.message
      }
    }, { status: 500 });
  }
}

// Generate nutrition plan with AI, with fallback to template-based generation
async function generateAINutritionPlan(userData, apiKeyStatus, apiErrors = {}) {
  try {
    // Initialize metrics used across all approaches
    const metrics = calculateMetrics(userData);
    
    console.log('API Key Status for Nutrition Plan:');
    console.log(`- Gemini: ${apiKeyStatus.hasGeminiKey ? 'Available' : 'Not available'}`);
    console.log(`- HuggingFace: ${apiKeyStatus.hasHfKey ? 'Available' : 'Not available'}`);
    console.log(`- OpenAI: ${apiKeyStatus.hasOpenaiKey ? 'Available' : 'Not available'}`);

    // Try Gemini API first if a key is available
    if (apiKeyStatus.hasGeminiKey) {
      try {
        console.log('Attempting to generate nutrition plan with Gemini API');
        const geminiResponse = await generateWithGemini(userData, metrics);
        if (geminiResponse) {
          console.log('Successfully generated nutrition plan with Gemini API');
          // Format the text response first
          const formattedText = formatNutritionResponseText(geminiResponse, metrics);
          // Then convert to the object structure
          return formatNutritionResponseObject(formattedText, metrics);
        } else {
          console.log('Gemini API returned null response, trying next API');
          if (apiErrors) apiErrors.gemini = "Returned null response";
        }
      } catch (error) {
        console.error('Error with Gemini API:', error.message);
        if (apiErrors) apiErrors.gemini = error.message;
        // Enhanced error logging
        if (error.response) {
          const status = error.response.status;
          console.error(`Gemini API HTTP Status: ${status}`);
          console.error('Gemini API error details:', JSON.stringify(error.response.data));
          
          if (status === 429) {
            console.error('QUOTA EXCEEDED: Gemini API quota or rate limit reached');
          } else if (status === 403) {
            console.error('AUTHENTICATION ERROR: Gemini API key may be invalid or expired');
          } else if (status === 400) {
            console.error('BAD REQUEST: Gemini API request format issue');
          }
        } else if (error.request) {
          console.error('Gemini API request failed with no response (network issue)');
        }
      }
    } else {
      console.log('Skipping Gemini API - no valid key available');
      if (apiErrors) apiErrors.gemini = "No valid API key";
    }

    // Try OpenAI API next if a key is available (changing order to prioritize OpenAI over HuggingFace)
    if (apiKeyStatus.hasOpenaiKey) {
      try {
        console.log('Attempting to generate nutrition plan with OpenAI API');
        const openaiResponse = await generateWithOpenAI(userData, metrics);
        if (openaiResponse) {
          console.log('Successfully generated nutrition plan with OpenAI API');
          // Format the text response first
          const formattedText = formatNutritionResponseText(openaiResponse, metrics);
          // Then convert to the object structure
          return formatNutritionResponseObject(formattedText, metrics);
        } else {
          console.log('OpenAI API returned null response, trying next API');
          if (apiErrors) apiErrors.openai = "Returned null response";
        }
      } catch (error) {
        console.error('Error with OpenAI API:', error.message);
        if (apiErrors) apiErrors.openai = error.message;
        // Enhanced error logging
        if (error.response) {
          const status = error.response.status;
          console.error(`OpenAI API HTTP Status: ${status}`);
          console.error('OpenAI API error details:', JSON.stringify(error.response.data));
          
          if (status === 429) {
            console.error('QUOTA EXCEEDED: OpenAI API quota or rate limit reached');
          } else if (status === 401) {
            console.error('AUTHENTICATION ERROR: OpenAI API key may be invalid or expired');
          } else if (status === 400) {
            console.error('BAD REQUEST: OpenAI API request format issue');
          }
        } else if (error.request) {
          console.error('OpenAI API request failed with no response (network issue)');
        }
      }
    } else {
      console.log('Skipping OpenAI API - no valid key available');
      if (apiErrors) apiErrors.openai = "No valid API key";
    }

    // Try Hugging Face API last if a key is available
    if (apiKeyStatus.hasHfKey) {
      try {
        console.log('Attempting to generate nutrition plan with Hugging Face API');
        const hfResponse = await generateWithHuggingFace(userData, metrics);
        if (hfResponse) {
          console.log('Successfully generated nutrition plan with Hugging Face API');
          // Format the text response first
          const formattedText = formatNutritionResponseText(hfResponse, metrics);
          // Then convert to the object structure
          return formatNutritionResponseObject(formattedText, metrics);
        } else {
          console.log('Hugging Face API returned null response');
          if (apiErrors) apiErrors.huggingface = "Returned null response";
        }
      } catch (error) {
        console.error('Error with Hugging Face API:', error.message);
        if (apiErrors) apiErrors.huggingface = error.message;
        // Enhanced error logging
        if (error.response) {
          const status = error.response.status;
          console.error(`Hugging Face API HTTP Status: ${status}`);
          console.error('Hugging Face API error details:', JSON.stringify(error.response.data));
          
          if (status === 429) {
            console.error('QUOTA EXCEEDED: Hugging Face API quota or rate limit reached');
          } else if (status === 401) {
            console.error('AUTHENTICATION ERROR: Hugging Face API key may be invalid or expired');
          } else if (status === 400) {
            console.error('BAD REQUEST: Hugging Face API request format issue');
          }
        } else if (error.request) {
          console.error('Hugging Face API request failed with no response (network issue)');
        }
      }
    } else {
      console.log('Skipping Hugging Face API - no valid key available');
      if (apiErrors) apiErrors.huggingface = "No valid API key";
    }

    // Fall back to template-based generation if all AI options fail
    console.log('All AI options failed or no API keys available, falling back to template generation');
    return generateFallbackNutritionPlan(userData);
  } catch (error) {
    console.error('Error in generateAINutritionPlan:', error);
    return generateFallbackNutritionPlan(userData);
  }
}

// Format the text content of the nutrition plan
function formatNutritionResponseText(text, metrics) {
  // Clean up any model artifacts or headers
  let cleanedText = text.replace(/^As a professional nutritionist|^I'll provide a comprehensive|^Here is your personalized/i, '');
  
  // Ensure headings are properly formatted
  const headings = ['Macronutrient Distribution', 'Meal Planning', 'Food Recommendations', 'Hydration', 'Supplement Recommendations'];
  
  headings.forEach(heading => {
    // Replace variations of the heading format with a consistent one
    cleanedText = cleanedText.replace(
      new RegExp(`(^|\\n)${heading}[:\\s-]*`, 'i'),
      `\n\n**${heading}:**\n`
    );
  });
  
  // Improve bullet point formatting
  cleanedText = cleanedText.replace(/^[-*•]\s*/gm, '• ');
  
  // Add metrics summary at the beginning
  const metricsSummary = `**Nutrition Plan Summary:**\n• BMI: ${metrics.bmi} (${metrics.bmiCategory})\n• Daily Calorie Target: ${metrics.dailyCalories} calories\n`;
  
  // Add a disclaimer at the end
  const disclaimer = `\n\n**Disclaimer:** This nutrition plan is generated based on the information provided and general nutritional principles. It is not a substitute for professional medical or dietetic advice. Always consult with a healthcare professional before making significant changes to your diet, especially if you have health conditions.`;
  
  return metricsSummary + cleanedText + disclaimer;
}

// Format the nutrition response with object structure
function formatNutritionResponseObject(text, metrics) {
  try {
    // Create a structured response
    const structuredResponse = {
      metrics: {
        bmi: metrics.bmi,
        bmiCategory: metrics.bmiCategory,
        dailyCalories: metrics.dailyCalories,
        proteinPercentage: 0,
        carbPercentage: 0,
        fatPercentage: 0,
        proteinGrams: 0,
        carbGrams: 0,
        fatGrams: 0
      },
      plan: {
        title: 'AI-Generated Nutrition Plan',
        description: 'Personalized nutrition guidance based on your profile and goals.',
        meals: {
          breakfast: 'Balanced breakfast with protein, whole grains, and fruit',
          lunch: 'Mixed vegetables, lean protein, and complex carbohydrates',
          dinner: 'Lean protein with vegetables and whole grains',
          snacks: ['Fruit with nuts', 'Greek yogurt']
        },
        recommendations: [
          'Focus on whole, unprocessed foods',
          'Stay hydrated throughout the day',
          'Control portion sizes',
          'Include a variety of colorful vegetables daily',
          'Limit added sugars and processed foods'
        ]
      },
      workout: {
        routine: 'Balanced exercise routine appropriate for your fitness level',
        exercises: [
          'Include both cardiovascular and strength training exercises',
          'Focus on proper form and technique',
          'Allow adequate recovery between workouts',
          'Stay consistent with your routine',
          'Gradually increase intensity over time'
        ]
      },
      supplements: {
        protein: 'Choose supplements based on your dietary preferences and needs',
        creatine: 'Consider if aligned with your fitness goals',
        other: [
          'Multivitamin for nutritional insurance',
          'Omega-3 fatty acids for heart health',
          'Vitamin D if sun exposure is limited'
        ]
      },
      source: 'ai',
      generatedAt: new Date().toISOString(),
      rawText: text
    };

    // Parse the text to extract structured data
    const sections = text.split(/\n\s*\*\*[^*]+\*\*\s*:\s*\n/);
    
    // First section is usually the summary with metrics
    if (sections[0] && sections[0].includes('BMI:')) {
      // Try to extract macro percentages and grams if available in the text
      const proteinMatch = text.match(/protein[^\d]+(\d+)%[^\d]*(\d+)\s*g/i);
      const carbMatch = text.match(/carb[^\d]+(\d+)%[^\d]*(\d+)\s*g/i);
      const fatMatch = text.match(/fat[^\d]+(\d+)%[^\d]*(\d+)\s*g/i);
      
      if (proteinMatch) {
        structuredResponse.metrics.proteinPercentage = parseInt(proteinMatch[1], 10) || 0;
        structuredResponse.metrics.proteinGrams = parseInt(proteinMatch[2], 10) || 0;
      }
      
      if (carbMatch) {
        structuredResponse.metrics.carbPercentage = parseInt(carbMatch[1], 10) || 0;
        structuredResponse.metrics.carbGrams = parseInt(carbMatch[2], 10) || 0;
      }
      
      if (fatMatch) {
        structuredResponse.metrics.fatPercentage = parseInt(fatMatch[1], 10) || 0;
        structuredResponse.metrics.fatGrams = parseInt(fatMatch[2], 10) || 0;
      }
    }

    // Extract general description and plan title
    if (text.includes('Weight Loss Plan')) {
      structuredResponse.plan.title = 'Weight Loss Nutrition Plan';
      structuredResponse.plan.description = 'A balanced approach to create a caloric deficit and promote gradual, sustainable weight loss.';
    } else if (text.includes('Weight Gain Plan') || text.includes('Muscle Building Plan')) {
      structuredResponse.plan.title = 'Weight Gain & Muscle Building Plan';
      structuredResponse.plan.description = 'A nutrient-dense plan designed to support muscle growth and healthy weight gain.';
    } else if (text.includes('Maintenance Plan')) {
      structuredResponse.plan.title = 'Weight Maintenance Plan';
      structuredResponse.plan.description = 'A balanced nutrition plan to maintain your current weight while supporting overall health.';
    } else {
      // Extract title from text if none of the standard ones match
      const titleMatch = text.match(/\*\*(.*?(?:Plan|Diet|Nutrition).*?)\*\*/);
      if (titleMatch && titleMatch[1]) {
        structuredResponse.plan.title = titleMatch[1].trim();
      }
      
      // Try to extract a description
      const descriptionMatch = text.match(/\*\*(?:Overview|Description|Introduction)\*\*:?\s*(.*?)(?=\n\s*\*\*|$)/i);
      if (descriptionMatch && descriptionMatch[1]) {
        structuredResponse.plan.description = descriptionMatch[1].trim();
      }
    }

    // For each meal type, check for multiple bullet points and take more if available
    function extractMealItems(mealType, mealText) {
      const regex = new RegExp(`${mealType}[^:]*:?(.*?)(?=breakfast|lunch|dinner|snack|$)`, 'is');
      const match = mealText.match(regex);
      
      if (match && match[1]) {
        const lines = match[1].trim().split('\n').filter(line => line.trim()).map(line => line.replace(/^[•\-*]\s*/, ''));
        
        if (lines.length === 1) {
          return lines[0]; // Return as string for single item
        } else if (lines.length > 1) {
          return lines.slice(0, 3); // Return array for multiple items (up to 3)
        }
      }
      return null;
    }
    
    // Extract meal information with improved pattern matching
    const mealPlanSection = text.match(/\*\*Meal(?: Planning| Plan| Structure|s)[^*]*\*\*:?\s*\n([\s\S]*?)(?=\n\s*\*\*|$)/i);
    if (mealPlanSection && mealPlanSection[1]) {
      const mealText = mealPlanSection[1];
      
      // Extract meals with improved handling
      const breakfast = extractMealItems('breakfast', mealText);
      if (breakfast) {
        structuredResponse.plan.meals.breakfast = breakfast;
      }
      
      const lunch = extractMealItems('lunch', mealText);
      if (lunch) {
        structuredResponse.plan.meals.lunch = lunch;
      }
      
      const dinner = extractMealItems('dinner', mealText);
      if (dinner) {
        structuredResponse.plan.meals.dinner = dinner;
      }
      
      const snacks = extractMealItems('snack', mealText);
      if (snacks) {
        structuredResponse.plan.meals.snacks = Array.isArray(snacks) ? snacks : [snacks];
      }
    }

    // Function to extract multiple items from sections
    function extractListItems(text) {
      if (!text) return [];
      
      const lines = text.trim().split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[•\-*]\s*/, '').trim());
      
      return lines.slice(0, 5); // Return up to 5 items
    }

    // Extract food recommendations with improved pattern matching
    const foodRecsSection = text.match(/\*\*(Food|Dietary|Nutrition) Recommendations[^*]*\*\*:?\s*\n([\s\S]*?)(?=\n\s*\*\*|$)/i);
    if (foodRecsSection && foodRecsSection[2]) {
      structuredResponse.plan.recommendations = extractListItems(foodRecsSection[2]);
    }

    // Extract workout recommendations with improved pattern matching
    const workoutSection = text.match(/\*\*(Workout|Exercise|Training|Physical Activity|Fitness)[^*]*\*\*:?\s*\n([\s\S]*?)(?=\n\s*\*\*|$)/i);
    if (workoutSection && workoutSection[2]) {
      structuredResponse.plan.workout = extractListItems(workoutSection[2]);
    }

    // Extract supplement recommendations with improved pattern matching
    const supplementSection = text.match(/\*\*(Supplement|Vitamin|Mineral)[^*]*\*\*:?\s*\n([\s\S]*?)(?=\n\s*\*\*|$)/i);
    if (supplementSection && supplementSection[2]) {
      structuredResponse.plan.supplements = extractListItems(supplementSection[2]);
    }

    return structuredResponse;
  } catch (error) {
    console.error('Error formatting nutrition response object:', error);
    // Return a more comprehensive object with original text as fallback
    return {
      metrics: {
        bmi: metrics.bmi,
        bmiCategory: metrics.bmiCategory,
        dailyCalories: metrics.dailyCalories,
        proteinPercentage: 20,
        carbPercentage: 55,
        fatPercentage: 25,
        proteinGrams: Math.round((metrics.dailyCalories * 0.20) / 4),
        carbGrams: Math.round((metrics.dailyCalories * 0.55) / 4),
        fatGrams: Math.round((metrics.dailyCalories * 0.25) / 9)
      },
      plan: {
        title: 'AI-Generated Nutrition Plan',
        description: 'Personalized nutrition guidance based on your profile and goals.',
        meals: {
          breakfast: 'Balanced breakfast with protein, whole grains, and fruit',
          lunch: 'Mixed vegetables, lean protein, and complex carbohydrates',
          dinner: 'Lean protein with vegetables and whole grains',
          snacks: ['Fruit with nuts', 'Greek yogurt']
        },
        recommendations: [
          'Focus on whole, unprocessed foods',
          'Stay hydrated throughout the day',
          'Control portion sizes',
          'Include a variety of colorful vegetables daily',
          'Limit added sugars and processed foods'
        ]
      },
      workout: {
        routine: 'Balanced exercise routine appropriate for your fitness level',
        exercises: [
          'Include both cardiovascular and strength training exercises',
          'Focus on proper form and technique',
          'Allow adequate recovery between workouts',
          'Stay consistent with your routine',
          'Gradually increase intensity over time'
        ]
      },
      supplements: {
        protein: 'Choose supplements based on your dietary preferences and needs',
        creatine: 'Consider if aligned with your fitness goals',
        other: [
          'Multivitamin for nutritional insurance',
          'Omega-3 fatty acids for heart health',
          'Vitamin D if sun exposure is limited'
        ]
      },
      source: 'ai',
      generatedAt: new Date().toISOString(),
      rawText: text
    };
  }
}

// Fallback function for when API is unavailable
function generateFallbackNutritionPlan(userData) {
  try {
    // Calculate and gather metrics
    const metrics = calculateMetrics(userData);
    const { bmi, bmiCategory, bmiSubCategory, dailyCalories, proteinPercentage, carbPercentage, fatPercentage, proteinGrams, carbGrams, fatGrams } = metrics;
    
    // Determine recommended weight goal based on health
    let weightGoalRecommendation = '';
    if (bmiCategory === 'severely underweight' || bmiCategory === 'underweight') {
      weightGoalRecommendation = 'gain';
    } else if (bmiCategory === 'normal') {
      weightGoalRecommendation = 'maintain';
    } else if (bmiCategory === 'overweight' || bmiCategory === 'obese') {
      weightGoalRecommendation = 'lose';
    }
    
    // Determine if the chosen goal conflicts with health needs
    const goalConflict = userData.weightGoal !== weightGoalRecommendation;
    
    // Get regional cuisine
    const cuisine = getRegionalCuisine(userData.regionalPreference);
    
    // Create a personalized meal plan based on BMI and goals
    let mealPlanTitle = 'Balanced Nutrition Plan';
    let mealPlanDescription = 'A balanced approach to nutrition with a mix of all food groups.';
    
    if (bmiCategory === 'severely underweight' || bmiCategory === 'underweight') {
      mealPlanTitle = 'Weight Gain Nutrition Plan';
      mealPlanDescription = 'Focus on nutrient-dense, calorie-rich foods to achieve healthy weight gain.';
    } else if (bmiCategory === 'overweight' && userData.weightGoal === 'lose') {
      mealPlanTitle = 'Moderate Weight Loss Plan';
      mealPlanDescription = 'A sustainable approach to gradual weight loss with balanced nutrition.';
    } else if (bmiCategory === 'obese' && userData.weightGoal === 'lose') {
      mealPlanTitle = 'Comprehensive Weight Management Plan';
      mealPlanDescription = 'A structured approach to significant weight loss with emphasis on protein and fiber.';
    } else if (bmiCategory === 'normal' && userData.weightGoal === 'maintain') {
      mealPlanTitle = 'Healthy Weight Maintenance Plan';
      mealPlanDescription = 'Maintain your healthy weight with balanced nutrition and proper portion sizes.';
    } else if (bmiCategory === 'normal' && userData.weightGoal === 'gain') {
      mealPlanTitle = 'Lean Muscle Building Plan';
      mealPlanDescription = 'Focus on building lean muscle mass while maintaining a healthy body fat percentage.';
    }
    
    // Generate a sample day meal plan
    const breakfastOption = cuisine.breakfast[Math.floor(Math.random() * cuisine.breakfast.length)];
    const lunchOption = cuisine.lunch[Math.floor(Math.random() * cuisine.lunch.length)];
    const dinnerOption = cuisine.dinner[Math.floor(Math.random() * cuisine.dinner.length)];
    
    // Choose 2 random snacks
    const snackOptions = [...cuisine.snacks];
    const selectedSnacks = [];
    for (let i = 0; i < 2; i++) {
      if (snackOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * snackOptions.length);
        selectedSnacks.push(snackOptions[randomIndex]);
        snackOptions.splice(randomIndex, 1);
      }
    }
    
    // Generate health tips based on user's conditions
    const healthTips = [];
    
    if (userData.healthConditions) {
      if (userData.healthConditions.includes('diabetes')) {
        healthTips.push('Monitor the glycemic load of your meals, not just carbohydrate content');
        healthTips.push('Consider a continuous eating pattern of smaller, more frequent meals to help stabilize blood sugar');
      }
      
      if (userData.healthConditions.includes('hypertension')) {
        healthTips.push('Limit sodium to 1,500-2,300 mg daily and increase potassium-rich foods like bananas and sweet potatoes');
        healthTips.push('Consider the DASH diet approach which has been specifically designed for blood pressure management');
      }
      
      if (userData.healthConditions.includes('heartDisease')) {
        healthTips.push('Focus on omega-3 rich foods like fatty fish, walnuts, and flaxseeds for heart health');
        healthTips.push('Limit saturated fat and avoid trans fats completely for cardiovascular health');
      }
      
      if (userData.healthConditions.includes('highCholesterol')) {
        healthTips.push('Increase soluble fiber from sources like oats, barley, beans, and psyllium to help lower cholesterol');
        healthTips.push('Include foods with natural statins like red yeast rice and plenty of antioxidant-rich fruits and vegetables');
      }
    }
    
    // Add general tips based on BMI and goals
    if (userData.weightGoal === 'lose') {
      healthTips.push('Focus on portion control and mindful eating to create a sustainable calorie deficit');
      healthTips.push('Prioritize protein and fiber-rich foods to increase satiety and preserve muscle mass');
    } else if (userData.weightGoal === 'gain') {
      healthTips.push('Eat calorie-dense foods and consider adding healthy fats like nuts, avocados, and olive oil to meals');
      healthTips.push('Consume a protein-rich meal or shake shortly after workouts to support muscle growth');
    } else {
      healthTips.push('Maintain a consistent eating schedule to support metabolic health and energy levels');
      healthTips.push('Focus on nutrient density rather than calorie counting for overall health and wellbeing');
    }
    
    // Generate workout and supplement recommendations based on gym routine
    let workoutRecommendation = '';
    const exerciseRecommendations = [];
    
    if (userData.gymRoutine !== 'none') {
      if (userData.gymRoutine === 'strength') {
        workoutRecommendation = 'Your strength training routine should focus on compound movements with progressive overload, training each muscle group 2-3 times per week.';
        exerciseRecommendations.push('Squat variations (back squat, front squat, goblet squat)');
        exerciseRecommendations.push('Deadlift variations (conventional, sumo, Romanian)');
        exerciseRecommendations.push('Bench press and overhead press variations');
        exerciseRecommendations.push('Row variations and pull-ups/chin-ups');
        exerciseRecommendations.push('Core stabilization exercises');
      } else if (userData.gymRoutine === 'hypertrophy') {
        workoutRecommendation = 'For hypertrophy/bodybuilding, focus on moderate weights with higher volume (8-12 reps), training each muscle group 2 times per week with proper recovery.';
        exerciseRecommendations.push('Upper/lower or push/pull/legs split routine');
        exerciseRecommendations.push('Include both compound and isolation exercises');
        exerciseRecommendations.push('Vary rep ranges between 6-15 reps for optimal hypertrophy');
        exerciseRecommendations.push('Focus on mind-muscle connection and proper form');
        exerciseRecommendations.push('Progressive overload through increased weight, reps, or sets');
      } else if (userData.gymRoutine === 'endurance') {
        workoutRecommendation = 'Endurance training should include higher rep ranges (15+) with shorter rest periods, alongside cardio activities for optimal cardiovascular health.';
        exerciseRecommendations.push('Circuit training with minimal rest between exercises');
        exerciseRecommendations.push('Combination of resistance training and cardio intervals');
        exerciseRecommendations.push('Higher rep ranges (15-20) with moderate weights');
        exerciseRecommendations.push('Include steady-state cardio 2-3 times per week');
        exerciseRecommendations.push('Focus on full-body movements and functional exercises');
      } else if (userData.gymRoutine === 'functional') {
        workoutRecommendation = 'Functional fitness training should emphasize movement patterns that translate to daily activities, with a focus on mobility, stability, and core strength.';
        exerciseRecommendations.push('Movement patterns: push, pull, hinge, squat, rotate, carry');
        exerciseRecommendations.push('Include unilateral exercises for balance and stability');
        exerciseRecommendations.push('Core exercises focusing on anti-rotation and stability');
        exerciseRecommendations.push('Incorporate objects of odd shapes and sizes for grip training');
        exerciseRecommendations.push('Include mobility work at the beginning and end of workouts');
      } else if (userData.gymRoutine === 'crossfit') {
        workoutRecommendation = 'CrossFit combines elements of HIIT, Olympic weightlifting, plyometrics, and gymnastics in varied workouts (WODs) that change daily.';
        exerciseRecommendations.push('Focus on mastering fundamental movements before adding intensity');
        exerciseRecommendations.push('Include Olympic lifts: clean, jerk, and snatch variations');
        exerciseRecommendations.push('Gymnastics elements: pull-ups, muscle-ups, handstands');
        exerciseRecommendations.push('Metabolic conditioning with varied time domains');
        exerciseRecommendations.push('Ensure proper recovery between high-intensity sessions');
      } else if (userData.gymRoutine === 'powerlifting') {
        workoutRecommendation = 'Powerlifting training should focus on the three competition lifts (squat, bench press, deadlift) with an emphasis on maximal strength development.';
        exerciseRecommendations.push('Focus on the three main lifts: squat, bench press, and deadlift');
        exerciseRecommendations.push('Include accessory exercises to address weak points');
        exerciseRecommendations.push('Train with periodization, cycling between volume and intensity phases');
        exerciseRecommendations.push('Focus on proper technique and form for injury prevention');
        exerciseRecommendations.push('Include deload weeks every 4-6 weeks to facilitate recovery');
      }
    } else {
      workoutRecommendation = 'Consider adding regular physical activity to your routine. Even light activities like walking, yoga, or swimming can provide significant health benefits.';
      exerciseRecommendations.push('Aim for 150 minutes of moderate-intensity activity per week');
      exerciseRecommendations.push('Include both cardiovascular and strength training exercises');
      exerciseRecommendations.push('Find activities you enjoy to make exercise sustainable');
      exerciseRecommendations.push('Start with walking, swimming, or bodyweight exercises if you\'re new to fitness');
    }
    
    // Generate supplement recommendations
    let proteinRecommendation = '';
    let creatineRecommendation = '';
    const otherSupplements = [];
    
    if (userData.proteinPreference !== 'none') {
      if (userData.proteinPreference === 'whey') {
        proteinRecommendation = 'Whey protein is quickly digested and ideal for post-workout recovery. Consume 20-30g within 30 minutes after training for optimal muscle protein synthesis.';
      } else if (userData.proteinPreference === 'casein') {
        proteinRecommendation = 'Casein protein is slow-digesting and provides a steady release of amino acids. It\'s ideal before bed or during longer periods without food to help with muscle preservation.';
      } else if (userData.proteinPreference === 'plant') {
        proteinRecommendation = 'Plant-based proteins (like pea, rice, or hemp) work best when combined to provide a complete amino acid profile. Consider a blend and aim for slightly higher total protein intake.';
      } else if (userData.proteinPreference === 'egg') {
        proteinRecommendation = 'Egg protein has an excellent amino acid profile and digestibility. It\'s a great option for those with milk allergies or lactose intolerance who want an animal-based protein.';
      } else if (userData.proteinPreference === 'collagen') {
        proteinRecommendation = 'Collagen protein supports joint, skin, and connective tissue health. While not a complete protein for muscle building, it works well as a supplement to your overall protein intake.';
      }
    } else {
      proteinRecommendation = 'While you\'ve indicated no protein supplement preference, consider adding whole-food protein sources to your diet, especially around workout times if you\'re training regularly.';
    }
    
    if (userData.creatineUse === 'yes') {
      creatineRecommendation = 'Continue with your current creatine supplementation of 3-5g daily. Consistency is key with creatine - it works through saturation of muscle stores over time.';
    } else if (userData.creatineUse === 'considering') {
      creatineRecommendation = 'Creatine monohydrate is the most researched and effective form. Start with 3-5g daily without a loading phase. Take it consistently with water, pre or post-workout, or any time of day.';
    } else {
      creatineRecommendation = 'While you\'re not currently interested in creatine, it\'s worth noting it\'s one of the safest and most well-researched supplements for improving strength and power output.';
    }
    
    // Add other supplement recommendations based on goals and conditions
    if (userData.gymRoutine !== 'none' && userData.workoutFrequency !== '0') {
      otherSupplements.push('Consider caffeine (200-400mg) pre-workout for improved performance, focus and reduced perceived exertion');
    }
    
    if (userData.healthConditions && userData.healthConditions.includes('highCholesterol')) {
      otherSupplements.push('Plant sterols/stanols (2g daily) can help lower LDL cholesterol in conjunction with a heart-healthy diet');
    }
    
    if (userData.healthConditions && userData.healthConditions.includes('heartDisease')) {
      otherSupplements.push('Omega-3 fatty acids (1-3g EPA+DHA daily) for cardiovascular health and reducing inflammation');
    }
    
    // Create the structured response object
    return {
      metrics: {
        bmi,
        bmiCategory,
        dailyCalories,
        proteinPercentage,
        carbPercentage,
        fatPercentage,
        proteinGrams,
        carbGrams,
        fatGrams
      },
      plan: {
        title: mealPlanTitle,
        description: mealPlanDescription,
        meals: {
          breakfast: breakfastOption,
          lunch: lunchOption,
          dinner: dinnerOption,
          snacks: selectedSnacks
        },
        recommendations: healthTips
      },
      workout: {
        routine: workoutRecommendation,
        exercises: exerciseRecommendations
      },
      supplements: {
        protein: proteinRecommendation,
        creatine: creatineRecommendation,
        other: otherSupplements
      },
      source: 'fallback',
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in generateFallbackNutritionPlan:', error);
    
    // Return minimal fallback response in case of error
    return {
      metrics: {
        bmi: +(userData.weight / ((userData.height / 100) ** 2)).toFixed(2),
        bmiCategory: 'unknown',
        dailyCalories: 2000
      },
      plan: {
        title: 'Basic Nutrition Plan',
        description: 'A balanced diet with whole foods is recommended. Due to a system error, only basic information is available.',
        meals: {
          breakfast: 'Balanced breakfast with protein, whole grains, and fruit',
          lunch: 'Mixed vegetables, lean protein, and complex carbohydrates',
          dinner: 'Lean protein with vegetables and whole grains',
          snacks: ['Fruit with nuts', 'Greek yogurt']
        },
        recommendations: ['Focus on whole unprocessed foods', 'Stay hydrated throughout the day']
      },
      source: 'emergency-fallback',
      generatedAt: new Date().toISOString()
    };
  }
}

function generateSupplementRecommendations(userData) {
  const recommendations = [];
  
  // Age-based recommendations
  if (userData.age > 50) {
    recommendations.push('• Vitamin D3 (1000-2000 IU daily)');
    recommendations.push('• Calcium (1000-1200 mg daily)');
    recommendations.push('• Vitamin B12 (2.4 mcg daily)');
  }
  
  // Diet-based recommendations
  if (userData.dietaryPreference === 'vegan') {
    recommendations.push('• Vitamin B12 (25-100 mcg daily)');
    recommendations.push('• Omega-3 fatty acids from algae oil (250-500 mg DHA daily)');
    recommendations.push('• Vitamin D3 (1000-2000 IU daily if limited sun exposure)');
    recommendations.push('• Iron (18 mg daily for women, 8 mg for men)');
  } else if (userData.dietaryPreference === 'vegetarian') {
    recommendations.push('• Vitamin B12 if dairy and egg intake is limited');
    recommendations.push('• Vitamin D3 (1000 IU daily if limited sun exposure)');
    recommendations.push('• Omega-3 supplements if not consuming fish');
  }
  
  // Health condition recommendations
  if (userData.healthConditions) {
    if (userData.healthConditions.includes('diabetes')) {
      recommendations.push('• Chromium (200-1000 mcg daily)');
      recommendations.push('• Alpha-lipoic acid (600-1200 mg daily)');
    }
    
    if (userData.healthConditions.includes('hypertension')) {
      recommendations.push('• Magnesium (300-400 mg daily)');
      recommendations.push('• CoQ10 (100-200 mg daily)');
    }
  }
  
  // BMI-based recommendations
  const heightInMeters = userData.height / 100;
  const bmi = userData.weight / (heightInMeters * heightInMeters);
  
  if (bmi < 18.5) {
    recommendations.push('• Protein powder (20-25g per serving, 1-2 servings daily)');
    recommendations.push('• Multivitamin with minerals (1 daily)');
  } else if (bmi > 30) {
    recommendations.push('• Fiber supplement (5-10g daily)');
  }
  
  // If no specific recommendations were made
  if (recommendations.length === 0) {
    recommendations.push('• A high-quality multivitamin appropriate for your age and gender');
    recommendations.push('• Omega-3 fatty acids (1000 mg daily) for heart and brain health');
  }
  
  return recommendations.join('\n');
}

// Calculate metrics for nutrition plan
function calculateMetrics(userData) {
  // Calculate BMI
  const heightInMeters = userData.height / 100;
  const bmi = +(userData.weight / (heightInMeters * heightInMeters)).toFixed(2);
  
  // Calculate estimated calorie needs using Mifflin-St Jeor Equation
  let bmr;
  if (userData.gender === 'male') {
    bmr = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age) + 5;
  } else {
    bmr = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age) - 161;
  }
  
  // Activity multipliers
  const activityMultipliers = {
    'sedentary': 1.2,
    'moderate': 1.55,
    'active': 1.725,
    'veryActive': 1.9,
    'extraActive': 2.1
  };
  
  const multiplier = activityMultipliers[userData.activityLevel] || 1.55;
  const tdee = Math.round(bmr * multiplier);
  
  // Determine BMI category
  let bmiCategory = '';
  let bmiSubCategory = '';
  if (bmi < 16.5) {
    bmiCategory = 'severely underweight';
    bmiSubCategory = 'severe';
  } else if (bmi >= 16.5 && bmi < 18.5) {
    bmiCategory = 'underweight';
    bmiSubCategory = 'mild';
  } else if (bmi >= 18.5 && bmi < 22) {
    bmiCategory = 'normal';
    bmiSubCategory = 'lower normal';
  } else if (bmi >= 22 && bmi < 25) {
    bmiCategory = 'normal';
    bmiSubCategory = 'upper normal';
  } else if (bmi >= 25 && bmi < 27.5) {
    bmiCategory = 'overweight';
    bmiSubCategory = 'mild';
  } else if (bmi >= 27.5 && bmi < 30) {
    bmiCategory = 'overweight';
    bmiSubCategory = 'moderate';
  } else if (bmi >= 30 && bmi < 35) {
    bmiCategory = 'obese';
    bmiSubCategory = 'class I';
  } else if (bmi >= 35 && bmi < 40) {
    bmiCategory = 'obese';
    bmiSubCategory = 'class II';
  } else {
    bmiCategory = 'obese';
    bmiSubCategory = 'class III';
  }
  
  // Adjust calories based on weight goal
  let calorieAdjustment = 0;
  
  // Adjust calories based on BMI category and weight goal
  if (userData.weightGoal === 'lose') {
    if (bmiCategory === 'severely underweight') {
      calorieAdjustment = 250; // Even if they want to lose, don't go into deficit
    } else if (bmiCategory === 'underweight') {
      calorieAdjustment = 0; // Maintain calories at minimum
    } else if (bmiCategory === 'normal' && bmiSubCategory === 'lower normal') {
      calorieAdjustment = -250; // Minor deficit only
    } else if (bmiCategory === 'normal' && bmiSubCategory === 'upper normal') {
      calorieAdjustment = -350; // Moderate deficit
    } else if (bmiCategory === 'overweight' && bmiSubCategory === 'mild') {
      calorieAdjustment = -500; // Standard deficit
    } else if (bmiCategory === 'overweight' && bmiSubCategory === 'moderate') {
      calorieAdjustment = -600; // Higher deficit
    } else if (bmiCategory === 'obese' && bmiSubCategory === 'class I') {
      calorieAdjustment = -750; // Higher deficit
    } else if (bmiCategory === 'obese' && bmiSubCategory === 'class II') {
      calorieAdjustment = -850; // Significant deficit
    } else if (bmiCategory === 'obese' && bmiSubCategory === 'class III') {
      calorieAdjustment = -1000; // Maximum recommended deficit
    }
  } else if (userData.weightGoal === 'gain') {
    if (bmiCategory === 'severely underweight') {
      calorieAdjustment = 700; // High surplus for rapid weight gain
    } else if (bmiCategory === 'underweight') {
      calorieAdjustment = 500; // Standard surplus
    } else if (bmiCategory === 'normal' && bmiSubCategory === 'lower normal') {
      calorieAdjustment = 350; // Moderate surplus
    } else if (bmiCategory === 'normal' && bmiSubCategory === 'upper normal') {
      calorieAdjustment = 250; // Small surplus
    } else if (bmiCategory === 'overweight') {
      calorieAdjustment = 100; // Minimal surplus focused on muscle gain
    } else if (bmiCategory === 'obese') {
      calorieAdjustment = 0; // No surplus, focus on body recomposition
    }
  } else { // maintain
    if (bmiCategory === 'severely underweight') {
      calorieAdjustment = 500; // Increase calories despite "maintain" goal
    } else if (bmiCategory === 'underweight') {
      calorieAdjustment = 300; // Increase calories despite "maintain" goal
    } else if (bmiCategory === 'overweight' && bmiSubCategory === 'moderate') {
      calorieAdjustment = -200; // Slight deficit despite "maintain" goal
    } else if (bmiCategory === 'obese') {
      calorieAdjustment = -350; // Moderate deficit despite "maintain" goal
    }
  }
  
  const dailyCalories = tdee + calorieAdjustment;

  // Determine macronutrient distribution based on BMI and dietary preferences
  let proteinPercentage, carbPercentage, fatPercentage;
  
  // Start with baseline distribution based on BMI category
  if (bmiCategory === 'severely underweight' || bmiCategory === 'underweight') {
    proteinPercentage = 25; // Higher protein for muscle building
    carbPercentage = 55; // Higher carbs for energy
    fatPercentage = 20;
  } else if (bmiCategory === 'normal') {
    proteinPercentage = 20;
    carbPercentage = 50;
    fatPercentage = 30;
  } else if (bmiCategory === 'overweight') {
    proteinPercentage = 30;
    carbPercentage = 40;
    fatPercentage = 30;
  } else if (bmiCategory === 'obese') {
    proteinPercentage = 35; // Higher protein for satiety
    carbPercentage = 35; // Lower carbs 
    fatPercentage = 30;
  }

  // Then adjust for health conditions 
  if (userData.healthConditions) {
    if (userData.healthConditions.includes('diabetes')) {
      carbPercentage = Math.max(carbPercentage - 10, 35); // Reduce carbs
      proteinPercentage = Math.min(proteinPercentage + 5, 35); // Increase protein slightly
      fatPercentage = Math.min(fatPercentage + 5, 40); // Increase fat slightly
    }
    
    if (userData.healthConditions.includes('hypertension')) {
      fatPercentage = Math.max(fatPercentage - 5, 20); // Reduce fat
      proteinPercentage = Math.min(proteinPercentage + 5, 35); // Increase protein
    }
    
    if (userData.healthConditions.includes('heartDisease')) {
      fatPercentage = Math.max(fatPercentage - 5, 20); // Reduce fat
      carbPercentage = Math.min(carbPercentage + 5, 55); // Increase carbs
    }
    
    if (userData.healthConditions.includes('highCholesterol')) {
      fatPercentage = Math.max(fatPercentage - 7, 20); // Reduce fat further
      carbPercentage = Math.min(carbPercentage + 7, 60); // Increase carbs further
    }
  }
  
  // Finally adjust for dietary preference
  if (userData.dietaryPreference === 'keto') {
    proteinPercentage = 25;
    carbPercentage = 5;
    fatPercentage = 70;
  } else if (userData.dietaryPreference === 'paleo') {
    proteinPercentage = 30;
    carbPercentage = 35;
    fatPercentage = 35;
  } else if (userData.dietaryPreference === 'mediterranean') {
    proteinPercentage = 15;
    carbPercentage = 55;
    fatPercentage = 30;
  } else if (userData.dietaryPreference === 'vegan') {
    proteinPercentage = Math.max(proteinPercentage - 3, 15); // Slightly lower protein
    carbPercentage = Math.min(carbPercentage + 5, 60); // Higher carbs
    fatPercentage = Math.min(fatPercentage - 2, 20); // Slightly lower fat
  }
  
  // Calculate grams for each macronutrient
  const proteinGrams = Math.round((dailyCalories * (proteinPercentage/100)) / 4);
  const carbGrams = Math.round((dailyCalories * (carbPercentage/100)) / 4);
  const fatGrams = Math.round((dailyCalories * (fatPercentage/100)) / 9);
  
  return {
    bmi,
    bmiCategory,
    bmiSubCategory,
    tdee,
    dailyCalories,
    proteinPercentage,
    carbPercentage,
    fatPercentage,
    proteinGrams,
    carbGrams,
    fatGrams
  };
}

// Create the nutrition prompt for AI models
function createNutritionPrompt(userData, metrics) {
  // Create BMI-specific instructions
  let bmiSpecificInstructions = '';
  
  if (metrics.bmiCategory === 'obese' || metrics.bmiCategory === 'overweight') {
    bmiSpecificInstructions = `IMPORTANT: This user's BMI of ${metrics.bmi} indicates they are ${metrics.bmiCategory}. 
Provide a weight loss focused nutrition plan with:
- A moderate calorie deficit (500-1000 calories below maintenance)
- Higher protein intake (30-35% of calories) to preserve muscle mass
- Emphasis on high-fiber, nutrient-dense, whole foods to promote satiety
- Portion control strategies
- Specific meal timing recommendations to manage hunger
- Low-calorie, high-volume foods that help the user feel full
- Limited refined carbohydrates and added sugars`;
  } else if (metrics.bmiCategory === 'underweight' || metrics.bmiCategory === 'severely underweight') {
    bmiSpecificInstructions = `IMPORTANT: This user's BMI of ${metrics.bmi} indicates they are ${metrics.bmiCategory}.
Provide a muscle-building bulking nutrition plan with:
- A moderate calorie surplus (300-500 calories above maintenance)
- High protein intake (25-30% of calories) to support muscle growth
- Increased healthy fats for calorie density (35-40% of calories)
- Nutrient-dense, calorie-rich foods
- Frequent meals and snacks (5-6 per day)
- Specific post-workout nutrition for maximum muscle protein synthesis
- Calorie-dense food options like nuts, avocados, olive oil, and whole fat dairy`;
  } else if (userData.weightGoal === 'lose' && metrics.bmiCategory === 'normal') {
    bmiSpecificInstructions = `NOTE: While this user has a normal BMI of ${metrics.bmi}, they have indicated a weight loss goal.
Provide a moderate weight loss nutrition plan with:
- A small calorie deficit (250-300 calories below maintenance)
- Focus on body composition improvement rather than significant weight loss
- Higher protein intake to preserve muscle mass
- Emphasis on whole foods and nutrition quality
- Guidelines for maintaining adequate nutrients while in a deficit`;
  } else if (userData.weightGoal === 'gain' && metrics.bmiCategory === 'normal') {
    bmiSpecificInstructions = `NOTE: While this user has a normal BMI of ${metrics.bmi}, they have indicated a weight gain goal.
Provide a lean muscle-building nutrition plan with:
- A small calorie surplus (200-300 calories above maintenance)
- Focus on clean bulking and minimizing fat gain
- Strategic nutrient timing around workouts
- Emphasis on protein quality and distribution throughout the day
- Guidelines for progressive increases in calories as needed`;
  }

  return `You are a professional nutritionist and dietitian creating a personalized nutrition plan. 
Based on the following user data, provide a comprehensive and practical nutrition plan:

User Profile:
- Age: ${userData.age}
- Gender: ${userData.gender}
- Height: ${userData.height} cm
- Weight: ${userData.weight} kg
- BMI: ${metrics.bmi} (Category: ${metrics.bmiCategory})
- Activity Level: ${userData.activityLevel}
- Dietary Preference: ${userData.dietaryPreference || 'No specific preference'}
- Regional Preference: ${userData.regionalPreference || 'No specific preference'} 
- Health Conditions: ${userData.healthConditions ? userData.healthConditions.join(', ') : 'None reported'}
- Weight Goal: ${userData.weightGoal || 'maintain'}
- Estimated Daily Calorie Needs: ${metrics.dailyCalories} calories
- Gym Routine: ${userData.gymRoutine || 'None'}
- Workout Frequency: ${userData.workoutFrequency || '0'} days per week
- Protein Supplement Preference: ${userData.proteinPreference || 'None'}
- Creatine Use: ${userData.creatineUse || 'No'}

${bmiSpecificInstructions}

Please provide a detailed nutrition plan including:
1. Macronutrient Distribution: Recommended protein, carbohydrates, and fat percentages and grams based on calorie needs
2. Meal Planning: Suggested meal structure with specific food recommendations for breakfast, lunch, dinner, and snacks, tailored to their regional and dietary preferences
3. Food Recommendations: List of recommended foods to include and foods to limit
4. Hydration: Daily water intake recommendations
5. Supplement Recommendations: Based on their gym routine, protein preference, and creatine usage
6. Workout Nutrition: Pre and post-workout nutrition strategies if they have an active gym routine

If the user has a gym routine, please include a specific section on:
- Protein timing and intake recommendations based on their workout schedule
- Optimal creatine supplementation if applicable (loading phase, maintenance phase, timing)
- Recommended protein types and timing based on their preferences
- Pre and post-workout meal suggestions
- Nutrient timing strategies for their specific type of training

Format the response with clear headings and bullet points for readability. Be specific with portion sizes and food choices.`;
}

// Generate plan using Google Gemini API
async function generateWithGemini(userData, metrics) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.error('No Gemini API key available');
      return null;
    }
    
    console.log('Initializing Gemini API with key:', geminiApiKey.substring(0, 4) + '...' + geminiApiKey.substring(geminiApiKey.length - 4));
    
    // Create prompt
    const prompt = createNutritionPrompt(userData, metrics);
    console.log('Sending request to Gemini API with prompt length:', prompt.length);
    
    // Make direct REST API call to Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4000,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // Add 30-second timeout
      }
    );
    
    console.log('Received response from Gemini API');
    
    // Check for error conditions in the response itself
    if (response.data && response.data.error) {
      console.error('Gemini API returned an error object:', JSON.stringify(response.data.error));
      
      if (response.data.error.code === 429) {
        console.error('QUOTA EXCEEDED: Gemini API quota or rate limit reached');
      } else if (response.data.error.code === 403) {
        console.error('AUTHENTICATION ERROR: Gemini API key issue');
      }
      
      return null;
    }
    
    // Extract text from response
    let responseText = '';
    if (response.data && 
        response.data.candidates && 
        response.data.candidates.length > 0 && 
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts.length > 0) {
      responseText = response.data.candidates[0].content.parts[0].text;
    }
    
    if (responseText) {
      console.log('Successfully extracted text from Gemini response:', responseText.substring(0, 100) + '...');
      return responseText;
    } else {
      console.error('Failed to extract text from Gemini response:', JSON.stringify(response.data).substring(0, 200));
      console.error('Gemini API response structure is not as expected');
      return null;
    }
  } catch (error) {
    console.error('Error in generateWithGemini:', error.message);
    
    // More detailed error reporting
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Gemini API HTTP Status: ${error.response.status}`);
      console.error('Gemini API response headers:', JSON.stringify(error.response.headers));
      console.error('Gemini API error data:', JSON.stringify(error.response.data));
      
      if (error.response.status === 429) {
        console.error('QUOTA EXCEEDED: Gemini API quota or rate limit reached. Consider upgrading your API plan or waiting before making more requests.');
      } else if (error.response.status === 403) {
        console.error('AUTHENTICATION ERROR: Gemini API key may be invalid, expired, or lacks required permissions.');
      } else if (error.response.status === 400) {
        console.error('BAD REQUEST: Gemini API request format is incorrect. Check the prompt and parameters.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Gemini API network error: No response received from server');
      console.error('Request details:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Gemini API error during request setup:', error.message);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Gemini API request timed out. The server took too long to respond.');
    }
    
    console.error('Error stack:', error.stack);
    return null;
  }
}

// Generate plan using Hugging Face API
async function generateWithHuggingFace(userData, metrics) {
  try {
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    
    if (!hfApiKey) {
      console.error('No Hugging Face API key available');
      return null;
    }
    
    console.log('Initializing Hugging Face API with key:', hfApiKey.substring(0, 4) + '...' + hfApiKey.substring(hfApiKey.length - 4));
    
    // Create prompt
    const prompt = createNutritionPrompt(userData, metrics);
    console.log('Sending request to Hugging Face API with prompt length:', prompt.length);
    
    // Configure HuggingFace client with timeout
    const hf = new HfInference(hfApiKey);
    
    // Set request options
    const options = {
      use_cache: true,
      wait_for_model: true
    };
    
    // Set timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
    
    try {
      const response = await hf.textGeneration({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        inputs: `<s>[INST] ${prompt} [/INST]`,
        parameters: {
          max_new_tokens: 2048,
          temperature: 0.7,
          top_p: 0.95,
          repetition_penalty: 1.15
        },
        options: {
          ...options,
          signal: controller.signal
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log('Received response from Hugging Face API');
      
      if (response && response.generated_text) {
        // Clean up the response - extract everything after the instruction tag if present
        const cleanText = response.generated_text.replace(/^.*?\[\/INST\]\s*/s, '');
        console.log('Successfully extracted text from Hugging Face response:', cleanText.substring(0, 100) + '...');
        return cleanText;
      } else {
        console.error('Hugging Face API response missing generated_text:', JSON.stringify(response));
        console.error('Hugging Face API response structure is not as expected');
        return null;
      }
    } catch (innerError) {
      clearTimeout(timeoutId);
      throw innerError; // Re-throw to be caught by outer try/catch
    }
  } catch (error) {
    console.error('Error in generateWithHuggingFace:', error.message);
    
    // More detailed error reporting
    if (error.name === 'AbortError') {
      console.error('TIMEOUT: Hugging Face API request timed out after 30 seconds');
    } else if (error.status === 429) {
      console.error('QUOTA EXCEEDED: Hugging Face API rate limit reached or insufficient quota');
      console.error('Consider upgrading your plan or waiting before making more requests');
    } else if (error.status === 401 || error.status === 403) {
      console.error('AUTHENTICATION ERROR: Hugging Face API key is invalid, expired, or unauthorized for this model');
    } else if (error.status === 503) {
      console.error('SERVICE UNAVAILABLE: Hugging Face model server may be overloaded or down');
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('NETWORK ERROR: Unable to connect to Hugging Face API - check internet connection');
    } else {
      console.error('UNKNOWN HUGGING FACE ERROR:', error);
      if (error.status) console.error('Status code:', error.status);
      if (error.response) console.error('Response:', JSON.stringify(error.response));
    }
    
    console.error('Error stack:', error.stack);
    return null;
  }
}

// Generate plan using OpenAI API
async function generateWithOpenAI(userData, metrics) {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('No OpenAI API key available');
      return null;
    }
    
    console.log('Initializing OpenAI API with key:', openaiApiKey.substring(0, 4) + '...' + openaiApiKey.substring(openaiApiKey.length - 4));
    
    // Create prompt
    const prompt = createNutritionPrompt(userData, metrics);
    console.log('Sending request to OpenAI API with prompt length:', prompt.length);
    
    // Make direct REST API call to OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You are a professional nutritionist and dietitian. Provide detailed, practical nutrition advice tailored to the user's profile."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.95
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        timeout: 30000 // Add 30-second timeout
      }
    );
    
    console.log('Received response from OpenAI API');
    
    // Check for error conditions in the response itself
    if (response.data && response.data.error) {
      console.error('OpenAI API returned an error object:', JSON.stringify(response.data.error));
      
      // Check for specific OpenAI error types
      if (response.data.error.type === 'insufficient_quota') {
        console.error('QUOTA EXCEEDED: OpenAI API quota or credits depleted');
      } else if (response.data.error.type === 'invalid_request_error') {
        console.error('INVALID REQUEST: OpenAI API request format is incorrect');
      } else if (response.data.error.type === 'authentication_error') {
        console.error('AUTHENTICATION ERROR: OpenAI API key is invalid or expired');
      }
      
      return null;
    }
    
    // Extract text from response
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0 && 
        response.data.choices[0].message &&
        response.data.choices[0].message.content) {
      const responseText = response.data.choices[0].message.content;
      console.log('Successfully extracted text from OpenAI response:', responseText.substring(0, 100) + '...');
      return responseText;
    } else {
      console.error('Failed to extract text from OpenAI response:', JSON.stringify(response.data).substring(0, 200));
      console.error('OpenAI API response structure is not as expected');
      return null;
    }
  } catch (error) {
    console.error('Error in generateWithOpenAI:', error.message);
    
    // More detailed error reporting
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`OpenAI API HTTP Status: ${error.response.status}`);
      console.error('OpenAI API response headers:', JSON.stringify(error.response.headers));
      console.error('OpenAI API error data:', JSON.stringify(error.response.data));
      
      if (error.response.status === 429) {
        console.error('QUOTA EXCEEDED: OpenAI API rate limit reached or insufficient quota. Consider upgrading your plan or waiting before making more requests.');
      } else if (error.response.status === 401) {
        console.error('AUTHENTICATION ERROR: OpenAI API key is invalid, expired, or unauthorized for this request.');
      } else if (error.response.status === 400) {
        console.error('BAD REQUEST: OpenAI API request format is incorrect. Check the prompt and parameters.');
      } else if (error.response.status === 404) {
        console.error('NOT FOUND: The requested model or endpoint may no longer be available.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('OpenAI API network error: No response received from server');
      console.error('Request details:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('OpenAI API error during request setup:', error.message);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('OpenAI API request timed out. The server took too long to respond.');
    }
    
    console.error('Error stack:', error.stack);
    return null;
  }
} 