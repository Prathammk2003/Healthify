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
const modelType = 'ecg-analysis';
const config = modelConfig[modelType];

// Path to ECG model and scaler
const modelPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'ecg_heartbeat_model.joblib');
const scalerPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'ecg_heartbeat_scaler.joblib');

// Load metadata
const metadataPath = path.join(__dirname, '..', '..', '..', 'trained_models', 'ecg_heartbeat_metadata.json');
let metadata = null;

try {
  const metadataContent = fs.readFileSync(metadataPath, 'utf8');
  metadata = JSON.parse(metadataContent);
  console.log('✅', metadata.model_type, 'model metadata loaded');
} catch (error) {
  console.error('❌ Error loading ECG metadata:', error.message);
}

/**
 * Analyze ECG heartbeat using the trained model
 * @param {Array} heartbeatData - Array of heartbeat data points
 * @returns {Object} - Analysis result
 */
export async function analyzeECG(heartbeatData) {
  try {
    // Validate input data
    if (!Array.isArray(heartbeatData) || heartbeatData.length === 0) {
      throw new Error('Valid heartbeat data array is required');
    }

    // Make prediction using the new model loading function
    const result = await loadTraditionalModelAndPredict(modelPath, scalerPath, [heartbeatData]);

    // Extract prediction and probabilities
    const prediction = result.predictions[0];
    const probabilities = result.probabilities ? result.probabilities[0] : null;

    return {
      prediction: prediction,
      predictionLabel: config.classes[prediction],
      confidence: probabilities ? probabilities[prediction] : null,
      modelInfo: {
        accuracy: metadata?.test_accuracy,
        trainedAt: metadata?.trained_at,
        modelType: metadata?.model_type,
        algorithm: metadata?.algorithm
      }
    };
  } catch (error) {
    console.error('❌ ECG analysis error:', error.message);
    return {
      error: error.message,
      modelInfo: {
        status: 'error',
        message: 'Failed to analyze ECG'
      }
    };
  }
}