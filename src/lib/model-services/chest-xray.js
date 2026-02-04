import { loadTraditionalModelAndPredict } from '../model-loader.js';
import fs from 'fs';
import path from 'path';
import { modelConfig } from './config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get model configuration
const modelType = 'chest-xray';
const config = modelConfig[modelType];

// Path to chest x-ray model
const modelPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'chest_xray_model.joblib');

// Load metadata
const metadataPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'chest_xray_metadata.json');
let metadata = null;

try {
  const metadataContent = fs.readFileSync(metadataPath, 'utf8');
  metadata = JSON.parse(metadataContent);
  console.log('✅', metadata.model_type, 'model metadata loaded');
} catch (error) {
  console.error('❌ Error loading chest x-ray metadata:', error.message);
}

/**
 * Analyze chest x-ray image using the trained model
 * @param {Array} features - Input features for prediction (in a real implementation, this would be image data)
 * @returns {Object} - Analysis result
 */
export async function analyzeChestXray(features) {
  try {
    // For chest x-ray analysis, we'll need to extract features from the image
    // For now, we'll assume features are already extracted
    // In a real implementation, this would involve image preprocessing
    
    // Make prediction using the new model loading function
    const result = await loadTraditionalModelAndPredict(modelPath, null, [features]);

    // Extract prediction and probabilities
    const prediction = result.predictions[0];
    const probabilities = result.probabilities ? result.probabilities[0] : null;

    return {
      prediction: prediction,
      predictionLabel: metadata?.classes?.[prediction] || config.classes[prediction],
      confidence: probabilities ? probabilities[prediction] : null,
      modelInfo: {
        accuracy: metadata?.test_accuracy,
        trainedAt: metadata?.trained_at,
        modelType: metadata?.model_type,
        algorithm: metadata?.algorithm
      }
    };
  } catch (error) {
    console.error('❌ Chest x-ray analysis error:', error.message);
    return {
      error: error.message,
      modelInfo: {
        status: 'error',
        message: 'Failed to analyze chest x-ray'
      }
    };
  }
}