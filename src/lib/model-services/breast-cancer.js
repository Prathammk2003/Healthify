import { loadDLModelAndPredict } from '../model-loader.js';
import fs from 'fs';
import path from 'path';
import { modelConfig } from './config.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get model configuration
const modelType = 'breast-cancer';
const config = modelConfig[modelType];

// Path to breast cancer model and scaler
const modelPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'breast_cancer_nn.h5');
const scalerPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'breast_cancer_scaler.pkl');

// Load metadata
const metadataPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'breast_cancer_metadata.json');
let metadata = null;

try {
  const metadataContent = fs.readFileSync(metadataPath, 'utf8');
  metadata = JSON.parse(metadataContent);
  console.log('✅', metadata.model_type, 'model metadata loaded');
} catch (error) {
  console.error('❌ Error loading breast cancer metadata:', error.message);
}

/**
 * Classify breast cancer using the trained model
 * @param {Object} features - Input features for prediction
 * @returns {Object} - Prediction result
 */
export async function classifyBreastCancer(features) {
  try {
    // Validate input features
    const requiredFeatures = metadata?.feature_names || config.features;

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
    const result = await loadDLModelAndPredict(modelPath, scalerPath, [featureValues]);

    // Extract prediction and probabilities
    const probabilities = result.predictions[0];
    const predictedClass = probabilities[0] > 0.5 ? 1 : 0;

    return {
      prediction: predictedClass,
      predictionLabel: metadata?.classes?.[predictedClass] || config.classes[predictedClass],
      confidence: probabilities[0],
      modelInfo: {
        accuracy: metadata?.test_accuracy,
        trainedAt: metadata?.trained_at,
        modelType: metadata?.model_type,
        algorithm: metadata?.algorithm
      }
    };
  } catch (error) {
    console.error('❌ Breast cancer classification error:', error.message);
    return {
      error: error.message,
      modelInfo: {
        status: 'error',
        message: 'Failed to make breast cancer classification'
      }
    };
  }
}