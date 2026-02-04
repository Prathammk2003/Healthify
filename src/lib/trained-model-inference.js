/**
 * Trained Model Inference System
 * Uses custom trained models for enhanced symptom checking
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class TrainedModelInference {
  constructor() {
    this.modelsDir = path.join(process.cwd(), 'trained_models');
    this.modelMetadata = {};
    this.loadModelMetadata();
  }

  // Load metadata for all trained models
  loadModelMetadata() {
    try {
      const metadataFiles = [
        'ecg_heartbeat_metadata.json',
        'enhanced_ecg_metadata.json',
        'diabetes_metadata.json',
        'medical_text_metadata.json',
        'brain_classification_metadata.json'
      ];

      for (const file of metadataFiles) {
        const filePath = path.join(this.modelsDir, file);
        if (fs.existsSync(filePath)) {
          const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.modelMetadata[metadata.model_type] = metadata;
        }
      }

      console.log(`📊 Loaded metadata for ${Object.keys(this.modelMetadata).length} trained models`);
    } catch (error) {
      console.error('Error loading model metadata:', error);
    }
  }

  // Check if models are available
  areModelsAvailable() {
    return Object.keys(this.modelMetadata).length > 0;
  }

  // Get available model types
  getAvailableModels() {
    return Object.keys(this.modelMetadata);
  }

  // Predict ECG heartbeat classification
  async predictECGHeartbeat(ecgData) {
    if (!this.modelMetadata['ecg_heartbeat']) {
      throw new Error('ECG heartbeat model not available');
    }

    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'src', 'lib', 'inference-ecg.py');
      const pythonProcess = spawn('python', [
        pythonScript,
        JSON.stringify(ecgData)
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const prediction = JSON.parse(result);
            resolve(prediction);
          } catch (e) {
            reject(new Error('Failed to parse ECG prediction result'));
          }
        } else {
          reject(new Error(`ECG prediction failed: ${error}`));
        }
      });
    });
  }

  // Predict diabetes risk
  async predictDiabetesRisk(patientData) {
    if (!this.modelMetadata['diabetes_prediction']) {
      throw new Error('Diabetes prediction model not available');
    }

    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'src', 'lib', 'inference-diabetes.py');
      const pythonProcess = spawn('python', [
        pythonScript,
        JSON.stringify(patientData)
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const prediction = JSON.parse(result);
            resolve(prediction);
          } catch (e) {
            reject(new Error('Failed to parse diabetes prediction result'));
          }
        } else {
          reject(new Error(`Diabetes prediction failed: ${error}`));
        }
      });
    });
  }

  // Classify medical text
  async classifyMedicalText(text) {
    if (!this.modelMetadata['medical_text_classification']) {
      throw new Error('Medical text classification model not available');
    }

    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'src', 'lib', 'inference-text.py');
      const pythonProcess = spawn('python', [
        pythonScript,
        JSON.stringify({ text })
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const prediction = JSON.parse(result);
            resolve(prediction);
          } catch (e) {
            reject(new Error('Failed to parse text classification result'));
          }
        } else {
          reject(new Error(`Text classification failed: ${error}`));
        }
      });
    });
  }

  // Predict brain tumor from MRI image
  async predictBrainTumor(imageData) {
    if (!this.modelMetadata['brain_tumor_classification']) {
      throw new Error('Brain tumor classification model not available');
    }

    return new Promise((resolve, reject) => {
      const pythonScript = path.join(process.cwd(), 'src', 'lib', 'inference-brain-mri.py');
      const pythonProcess = spawn('python', [
        pythonScript,
        imageData // Can be file path or JSON with base64 data
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const prediction = JSON.parse(result);
            resolve(prediction);
          } catch (e) {
            reject(new Error('Failed to parse brain tumor prediction result'));
          }
        } else {
          reject(new Error(`Brain tumor prediction failed: ${error}`));
        }
      });
    });
  }

  // Enhanced symptom analysis using trained models
  async enhancedSymptomAnalysis(symptoms, patientData = {}) {
    try {
      const results = {
        timestamp: new Date().toISOString(),
        available_models: this.getAvailableModels(),
        predictions: {}
      };

      // Medical text classification
      if (symptoms && this.modelMetadata['medical_text_classification']) {
        try {
          const textPrediction = await this.classifyMedicalText(symptoms);
          results.predictions.medical_specialty = {
            specialty: textPrediction.predicted_specialty,
            confidence: textPrediction.confidence,
            description: `Based on symptoms, likely medical specialty: ${textPrediction.predicted_specialty}`
          };
        } catch (error) {
          console.warn('Medical text classification failed:', error.message);
        }
      }

      // Diabetes risk assessment
      if (patientData && Object.keys(patientData).length > 0 && this.modelMetadata['diabetes_prediction']) {
        try {
          const diabetesFields = ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 
                                'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'];
          
          const diabetesData = {};
          let hasRequiredFields = false;
          
          for (const field of diabetesFields) {
            if (patientData[field] !== undefined) {
              diabetesData[field] = patientData[field];
              hasRequiredFields = true;
            }
          }
          
          if (hasRequiredFields) {
            const diabetesPrediction = await this.predictDiabetesRisk(diabetesData);
            results.predictions.diabetes_risk = {
              risk_level: diabetesPrediction.prediction === 1 ? 'High' : 'Low',
              probability: diabetesPrediction.probability,
              confidence: diabetesPrediction.confidence,
              description: diabetesPrediction.prediction === 1 
                ? 'High diabetes risk detected - recommend glucose testing and lifestyle assessment'
                : 'Low diabetes risk - maintain healthy lifestyle'
            };
          }
        } catch (error) {
          console.warn('Diabetes prediction failed:', error.message);
        }
      }

      // ECG analysis (if ECG data provided)
      if (patientData.ecg_data && this.modelMetadata['ecg_heartbeat']) {
        try {
          const ecgPrediction = await this.predictECGHeartbeat(patientData.ecg_data);
          results.predictions.heart_rhythm = {
            classification: ecgPrediction.predicted_class,
            confidence: ecgPrediction.confidence,
            description: this.getHeartRhythmDescription(ecgPrediction.predicted_class)
          };
        } catch (error) {
          console.warn('ECG prediction failed:', error.message);
        }
      }

      return results;

    } catch (error) {
      console.error('Enhanced symptom analysis failed:', error);
      throw error;
    }
  }

  // Get heart rhythm description
  getHeartRhythmDescription(classification) {
    const descriptions = {
      0: 'Normal heartbeat detected - regular cardiac rhythm',
      1: 'Supraventricular premature beat - usually benign but monitor',
      2: 'Premature ventricular contraction - may require cardiology evaluation',
      3: 'Fusion beat - combination of normal and abnormal, needs evaluation',
      4: 'Unclassifiable beat - recommend professional ECG interpretation'
    };
    
    return descriptions[classification] || 'Unknown heart rhythm classification';
  }

  // Comprehensive health risk assessment
  async comprehensiveHealthAssessment(symptoms, patientData = {}, vitals = {}) {
    try {
      const assessment = {
        timestamp: new Date().toISOString(),
        risk_factors: [],
        recommendations: [],
        urgency_level: 'low',
        confidence_score: 0,
        model_insights: {}
      };

      // Get enhanced predictions
      const predictions = await this.enhancedSymptomAnalysis(symptoms, patientData);
      assessment.model_insights = predictions.predictions;

      // Risk factor analysis
      if (predictions.predictions.diabetes_risk?.risk_level === 'High') {
        assessment.risk_factors.push('High diabetes risk detected');
        assessment.recommendations.push('Glucose tolerance test recommended');
        assessment.urgency_level = 'medium';
      }

      if (predictions.predictions.heart_rhythm?.classification >= 2) {
        assessment.risk_factors.push('Abnormal heart rhythm detected');
        assessment.recommendations.push('Cardiology consultation recommended');
        assessment.urgency_level = 'high';
      }

      if (predictions.predictions.medical_specialty) {
        assessment.recommendations.push(
          `Consider consultation with ${predictions.predictions.medical_specialty.specialty} specialist`
        );
      }

      // Calculate overall confidence
      const confidenceScores = Object.values(predictions.predictions)
        .map(p => p.confidence || 0)
        .filter(c => c > 0);
      
      if (confidenceScores.length > 0) {
        assessment.confidence_score = confidenceScores.reduce((a, b) => a + b) / confidenceScores.length;
      }

      return assessment;

    } catch (error) {
      console.error('Comprehensive health assessment failed:', error);
      throw error;
    }
  }

  // Get model training status and performance
  getModelStatus() {
    const status = {
      models_available: Object.keys(this.modelMetadata).length,
      models: {}
    };

    for (const [modelType, metadata] of Object.entries(this.modelMetadata)) {
      status.models[modelType] = {
        algorithm: metadata.best_algorithm,
        accuracy: metadata.test_accuracy || metadata.cv_accuracy,
        trained_at: metadata.trained_at,
        available: true
      };
    }

    return status;
  }
}

// Export singleton instance
export const trainedModelInference = new TrainedModelInference();