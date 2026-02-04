import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const modelCache = {};

// Model path mapping
const modelPaths = {
  'brain-scan': 'models/brain_model.onnx',
  'ecg': 'models/ecg_model.onnx',
  'breast-cancer': 'models/breast_model.onnx',
  'diabetes': 'models/diabetes_model.onnx',
  'stroke': 'models/stroke_model.onnx'
};

/**
 * Load an ONNX model (cached in memory for performance).
 * @param {string} modality - which dataset/model to load (e.g., "brain-scan", "ecg", "diabetes")
 */
export async function loadModel(modality) {
  // Return cached model if already loaded
  if (modelCache[modality]) {
    return modelCache[modality];
  }

  // Check if model path exists
  const modelPath = modelPaths[modality];
  if (!modelPath) {
    throw new Error(`Unknown modality: ${modality}`);
  }

  // Resolve absolute path
  const absoluteModelPath = path.resolve(process.cwd(), modelPath);
  
  // Check if model file exists
  if (!fs.existsSync(absoluteModelPath)) {
    throw new Error(`Model file not found for ${modality} at ${absoluteModelPath}`);
  }

  try {
    console.log(`Loading ONNX model for ${modality} from ${absoluteModelPath}`);
    const session = await ort.InferenceSession.create(absoluteModelPath);
    modelCache[modality] = session;
    console.log(`Successfully loaded ONNX model for ${modality}`);
    return session;
  } catch (error) {
    console.error(`Failed to load ONNX model for ${modality}:`, error);
    throw new Error(`Failed to load model for ${modality}: ${error.message}`);
  }
}

/**
 * Preprocess image for brain scans and breast cancer detection
 * @param {Buffer} fileBuffer - Raw image file buffer
 * @param {number} size - Target size for resizing (default: 224)
 */
export async function preprocessImage(fileBuffer, size = 224) {
  try {
    const img = await sharp(fileBuffer)
      .resize(size, size)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Normalize pixel values 0-255 → 0-1
    const float32Data = new Float32Array(img.data.length);
    for (let i = 0; i < img.data.length; i++) {
      float32Data[i] = img.data[i] / 255.0;
    }

    // Shape: [1, channels, height, width] for most CNN ONNX models
    // Note: This assumes channels-first format, which is common for ONNX models
    // If your model expects channels-last, you'll need to reshape accordingly
    return new ort.Tensor('float32', float32Data, [1, 3, size, size]);
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    throw new Error(`Failed to preprocess image: ${error.message}`);
  }
}

/**
 * Preprocess ECG signal data
 * @param {number[]} signal - Array of ECG signal values
 * @param {number} length - Target length for padding/truncating (default: 5000)
 */
export function preprocessECG(signal, length = 5000) {
  try {
    let arr = signal.slice(0, length);
    if (arr.length < length) {
      arr = arr.concat(Array(length - arr.length).fill(0)); // padding
    }

    // Normalize to [-1, 1]
    const max = Math.max(...arr.map(Math.abs)) || 1;
    const normalized = arr.map(v => v / max);

    return new ort.Tensor('float32', Float32Array.from(normalized), [1, length, 1]);
  } catch (error) {
    console.error('ECG preprocessing failed:', error);
    throw new Error(`Failed to preprocess ECG signal: ${error.message}`);
  }
}

/**
 * Preprocess tabular data for diabetes and stroke prediction
 * @param {number[]} features - Array of feature values
 */
export function preprocessTabular(features) {
  try {
    return new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
  } catch (error) {
    console.error('Tabular data preprocessing failed:', error);
    throw new Error(`Failed to preprocess tabular data: ${error.message}`);
  }
}

/**
 * Parse CSV data into numeric array
 * @param {string} csvString - Raw CSV string
 */
export function parseCSV(csvString) {
  try {
    const lines = csvString.trim().split('\n');
    const data = [];
    
    for (const line of lines) {
      const values = line.split(',').map(val => {
        const num = parseFloat(val.trim());
        return isNaN(num) ? 0 : num;
      });
      data.push(values);
    }
    
    return data;
  } catch (error) {
    console.error('CSV parsing failed:', error);
    throw new Error(`Failed to parse CSV data: ${error.message}`);
  }
}

/**
 * Run inference on the specified model with preprocessed input
 * @param {string} modality - Model type
 * @param {ort.Tensor} inputTensor - Preprocessed input tensor
 */
export async function runInference(modality, inputTensor) {
  try {
    const session = await loadModel(modality);
    
    // Get input name from the model
    const inputName = session.inputNames[0];
    const feeds = {};
    feeds[inputName] = inputTensor;
    
    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    const prediction = results[outputName].data;
    
    return prediction;
  } catch (error) {
    console.error(`Inference failed for ${modality}:`, error);
    throw new Error(`Inference failed for ${modality}: ${error.message}`);
  }
}