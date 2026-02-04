import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { loadTraditionalModelAndPredict } from '../model-loader.js';
import { modelConfig } from './config.js';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get model configuration
const modelType = 'diabetes';
const config = modelConfig[modelType];

// Path to diabetes model and scaler
const modelPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'diabetes_model.joblib');
const scalerPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'diabetes_scaler.joblib');

// Load metadata
const metadataPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'diabetes_metadata.json');
let metadata = null;

try {
  const metadataContent = fs.readFileSync(metadataPath, 'utf8');
  metadata = JSON.parse(metadataContent);
  console.log('✅', metadata.model_type, 'model metadata loaded');
} catch (error) {
  console.error('❌ Error loading diabetes metadata:', error.message);
}

/**
 * Predict diabetes risk using the trained model
 * @param {Object} features - Input features for prediction
 * @returns {Object} - Prediction result
 */
export async function predictDiabetes(features) {
  try {
    // Validate input features
    const requiredFeatures = metadata?.features || config.features;

    // Check for missing features
    const missingFeatures = requiredFeatures.filter(feature => !(feature in features));
    if (missingFeatures.length > 0) {
      console.warn('⚠️ Missing features:', missingFeatures);
    }

    // Extract features
    const featureValues = requiredFeatures.map(feature => {
      const value = parseFloat(features[feature]);
      return isNaN(value) ? 0 : value;
    });

    // Make prediction using the new model loading function
    const result = await loadTraditionalModelAndPredict(modelPath, scalerPath, [featureValues]);

    // Extract prediction and probabilities
    const prediction = result.predictions[0];
    const probabilities = result.probabilities ? result.probabilities[0] : null;

    return {
      prediction: metadata?.classes?.[prediction] || prediction,
      predictionValue: prediction,
      probabilities: probabilities,
      confidence: probabilities ? probabilities[prediction] : null,
      modelInfo: {
        accuracy: metadata?.test_accuracy,
        trainedAt: metadata?.trained_at,
        modelType: metadata?.model_type,
        algorithm: metadata?.best_algorithm
      }
    };
  } catch (error) {
    console.error('❌ Diabetes prediction error:', error.message);
    return {
      error: error.message,
      modelInfo: {
        status: 'error',
        message: 'Failed to make diabetes prediction'
      }
    };
  }
}