/**
 * Model Service Configuration
 * 
 * This file contains configuration for all available medical models
 */

export const modelConfig = {
  diabetes: {
    name: 'Diabetes Risk Prediction',
    description: 'Predicts diabetes risk based on patient features',
    endpoint: '/api/models',
    method: 'POST',
    requestType: 'diabetes',
    features: [
      'Pregnancies', 'Glucose', 'BloodPressure',
      'SkinThickness', 'Insulin', 'BMI',
      'DiabetesPedigreeFunction', 'Age'
    ],
    classes: {
      0: 'No diabetes',
      1: 'Diabetes'
    }
  },
  'stroke-risk': {
    name: 'Stroke Risk Prediction',
    description: 'Predicts stroke risk based on patient features',
    endpoint: '/api/models',
    method: 'POST',
    requestType: 'stroke-risk',
    features: [
      'age', 'hypertension', 'heart_disease',
      'work_type', 'smoking_status'
    ],
    classes: {
      0: 'No Stroke Risk',
      1: 'Stroke Risk'
    }
  },
  'breast-cancer': {
    name: 'Breast Cancer Classification',
    description: 'Classifies breast cancer as benign or malignant',
    endpoint: '/api/models',
    method: 'POST',
    requestType: 'breast-cancer',
    features: [
      'radius_mean', 'texture_mean', 'perimeter_mean',
      'area_mean', 'smoothness_mean', 'compactness_mean',
      'concavity_mean', 'concave points_mean', 'symmetry_mean',
      'fractal_dimension_mean', 'radius_se', 'texture_se',
      'perimeter_se', 'area_se', 'smoothness_se', 'compactness_se',
      'concavity_se', 'concave points_se', 'symmetry_se',
      'fractal_dimension_se', 'radius_worst', 'texture_worst',
      'perimeter_worst', 'area_worst', 'smoothness_worst',
      'compactness_worst', 'concavity_worst', 'concave points_worst',
      'symmetry_worst', 'fractal_dimension_worst'
    ],
    classes: {
      0: 'Benign',
      1: 'Malignant'
    }
  },
  'chest-xray': {
    name: 'Chest X-ray Analysis',
    description: 'Analyzes chest x-ray images for abnormalities',
    endpoint: '/api/models',
    method: 'POST',
    requestType: 'chest-xray',
    input: 'imagePath',
    classes: {
      1: 'Pneumonia',
      0: 'Normal'
    }
  },
  'ecg-analysis': {
    name: 'ECG Heartbeat Analysis',
    description: 'Analyzes ECG data for abnormalities',
    endpoint: '/api/models',
    method: 'POST',
    requestType: 'ecg-analysis',
    input: 'heartbeatData',
    classes: {
      1: 'Abnormal',
      0: 'Normal'
    }
  }
};