/**
 * Model Loader - Load and run ONNX models for medical inference
 * Supports brain scans, ECG, breast cancer, diabetes, stroke, etc.
 */

import fs from 'fs';
import path from 'path';
import { InferenceSession, Tensor } from 'onnxruntime-node';

class MedicalModelLoader {
  constructor() {
    this.models = new Map();
    this.modelPath = path.join(process.cwd(), 'trained_models_onnx');
    this.isLoaded = false;
    
    console.log('🏥 Medical Model Loader initialized');
  }

  /**
   * Load all ONNX models at startup
   */
  async loadAllModels() {
    try {
      // Check if models directory exists
      if (!fs.existsSync(this.modelPath)) {
        console.log(`📁 ONNX models path does not exist: ${this.modelPath}`);
        console.log('Creating models path...');
        fs.mkdirSync(this.modelPath, { recursive: true });
        return false;
      }

      // Load each model type
      const modelFiles = fs.readdirSync(this.modelPath);
      // Filter out the ECG model for now as it's causing loading issues
      const onnxModels = modelFiles.filter(file => file.endsWith('.onnx') && !file.includes('ecg_heartbeat'));
      
      console.log(`📁 Found ${onnxModels.length} ONNX models to load (excluding ECG model)`);
      
      for (const modelFile of onnxModels) {
        try {
          const modelName = path.parse(modelFile).name;
          const fullPath = path.join(this.modelPath, modelFile);
          
          console.log(`🔄 Loading ONNX model: ${modelName}`);
          const session = await InferenceSession.create(fullPath);
          this.models.set(modelName, session);
          console.log(`✅ Loaded ONNX model: ${modelName}`);
        } catch (error) {
          console.error(`❌ Failed to load model ${modelFile}:`, error.message);
        }
      }
      
      this.isLoaded = true;
      console.log(`✅ All ONNX models loaded successfully: ${this.models.size} models`);
      
      return true;
    } catch (error) {
      console.error('❌ Model loading failed:', error);
      this.isLoaded = false;
      return false;
    }
  }

  /**
   * Check if a specific model is loaded
   */
  isModelLoaded(modelName) {
    return this.models.has(modelName);
  }

  /**
   * Get loaded model session
   */
  getModel(modelName) {
    return this.models.get(modelName);
  }

  /**
   * Run inference on a model with input data
   */
  async runInference(modelName, inputData, inputShape = null) {
    try {
      if (!this.isLoaded || !this.models.has(modelName)) {
        throw new Error(`Model ${modelName} not loaded`);
      }
      
      const session = this.models.get(modelName);
      
      // Convert input data to tensor
      let tensor;
      if (inputData instanceof Tensor) {
        tensor = inputData;
      } else if (Array.isArray(inputData)) {
        // Assume 1D array for structured data
        const shape = inputShape || [1, inputData.length];
        tensor = new Tensor('float32', new Float32Array(inputData), shape);
      } else if (inputData instanceof Float32Array) {
        const shape = inputShape || [1, inputData.length];
        tensor = new Tensor('float32', inputData, shape);
      } else {
        throw new Error('Unsupported input data type');
      }
      
      // Run inference
      const feeds = { [session.inputNames[0]]: tensor };
      const results = await session.run(feeds);
      
      // Return output data
      const outputName = session.outputNames[0];
      const outputData = results[outputName].data;
      
      return {
        success: true,
        modelName,
        output: Array.isArray(outputData) ? [...outputData] : outputData,
        shape: results[outputName].dims
      };
      
    } catch (error) {
      console.error(`❌ Inference failed for model ${modelName}:`, error.message);
      return {
        success: false,
        modelName,
        error: error.message
      };
    }
  }

  /**
   * Get model information
   */
  getModelInfo() {
    const info = {};
    for (const [name, session] of this.models) {
      info[name] = {
        inputs: session.inputNames,
        outputs: session.outputNames,
        // Note: ONNX Runtime doesn't have getInputType/getOutputType methods
        // We'll provide basic information without type details
        inputShapes: [],
        outputShapes: []
      };
    }
    return info;
  }

  /**
   * Map medical modality to model name
   */
  getModalityModelName(modality) {
    const modelMap = {
      'brain_scan': 'brain_tumor_classifier',
      'brain-scan': 'brain_tumor_classifier',
      'ecg': 'ecg_heartbeat_classifier',
      'breast_cancer': 'breast_cancer_classifier',
      'breast-cancer': 'breast_cancer_classifier',
      'diabetes': 'diabetes_predictor',
      'stroke': 'stroke_risk_assessment',
      'heart_disease': 'heart_disease_predictor',
      'skin_cancer': 'skin_cancer_classifier',
      'skin-cancer': 'skin_cancer_classifier',
      'medical_report': 'medical_text_analyzer',
      'medical-report': 'medical_text_analyzer'
    };
    
    return modelMap[modality] || modality;
  }
}

// Create singleton instance
const modelLoader = new MedicalModelLoader();

export { MedicalModelLoader, modelLoader };