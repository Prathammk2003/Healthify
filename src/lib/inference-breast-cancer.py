#!/usr/bin/env python3
"""
Breast Cancer Classification Inference
"""

import sys
import json
import numpy as np
import pandas as pd
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

def load_breast_cancer_model():
    """Load trained breast cancer model and scaler"""
    try:
        models_dir = os.path.join(os.getcwd(), 'trained_models')
        model_path = os.path.join(models_dir, 'breast_cancer_model.joblib')
        scaler_path = os.path.join(models_dir, 'breast_cancer_scaler.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Breast cancer model not found at {model_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        return model, scaler
    except Exception as e:
        raise Exception(f"Failed to load breast cancer model: {str(e)}")

def predict_breast_cancer(patient_data):
    """Predict breast cancer classification"""
    try:
        # Load model
        model, scaler = load_breast_cancer_model()
        
        # Expected features (30 features from the Wisconsin Breast Cancer dataset)
        expected_features = [
            'radius_mean', 'texture_mean', 'perimeter_mean', 'area_mean',
            'smoothness_mean', 'compactness_mean', 'concavity_mean', 
            'concave points_mean', 'symmetry_mean', 'fractal_dimension_mean',
            'radius_se', 'texture_se', 'perimeter_se', 'area_se',
            'smoothness_se', 'compactness_se', 'concavity_se', 
            'concave points_se', 'symmetry_se', 'fractal_dimension_se',
            'radius_worst', 'texture_worst', 'perimeter_worst', 'area_worst',
            'smoothness_worst', 'compactness_worst', 'concavity_worst', 
            'concave points_worst', 'symmetry_worst', 'fractal_dimension_worst'
        ]
        
        # Default values (median values from the dataset)
        feature_defaults = {
            'radius_mean': 13.37, 'texture_mean': 18.84, 'perimeter_mean': 86.24,
            'area_mean': 551.1, 'smoothness_mean': 0.096, 'compactness_mean': 0.104,
            'concavity_mean': 0.089, 'concave points_mean': 0.048, 'symmetry_mean': 0.181,
            'fractal_dimension_mean': 0.063, 'radius_se': 0.406, 'texture_se': 1.216,
            'perimeter_se': 2.866, 'area_se': 40.34, 'smoothness_se': 0.007,
            'compactness_se': 0.026, 'concavity_se': 0.032, 'concave points_se': 0.012,
            'symmetry_se': 0.021, 'fractal_dimension_se': 0.004, 'radius_worst': 16.27,
            'texture_worst': 25.68, 'perimeter_worst': 107.26, 'area_worst': 880.2,
            'smoothness_worst': 0.133, 'compactness_worst': 0.254, 'concavity_worst': 0.273,
            'concave points_worst': 0.115, 'symmetry_worst': 0.290, 'fractal_dimension_worst': 0.084
        }
        
        # Create feature vector
        feature_vector = []
        for feature in expected_features:
            if feature in patient_data:
                feature_vector.append(float(patient_data[feature]))
            else:
                feature_vector.append(feature_defaults[feature])
        
        # Convert to numpy array and reshape
        features = np.array(feature_vector).reshape(1, -1)
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Predict
        prediction = model.predict(features_scaled)[0]
        
        # Get prediction probabilities
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features_scaled)[0]
            confidence = float(np.max(probabilities))
            
            # Probabilities for each class
            class_probs = {
                'benign': float(probabilities[0]),
                'malignant': float(probabilities[1])
            }
        else:
            confidence = 0.8
            class_probs = {}
        
        # Interpret results
        diagnosis = 'Benign' if prediction == 0 else 'Malignant'
        
        if diagnosis == 'Malignant' and confidence >= 0.8:
            risk_level = 'High'
            interpretation = f'High probability of malignant tumor (confidence: {confidence:.1%}). Immediate medical consultation required.'
            recommendations = [
                'Immediate consultation with oncologist',
                'Biopsy confirmation recommended',
                'Further imaging studies may be required',
                'Do not delay medical attention'
            ]
        elif diagnosis == 'Malignant':
            risk_level = 'Medium'
            interpretation = f'Possible malignant tumor (confidence: {confidence:.1%}). Medical evaluation needed.'
            recommendations = [
                'Consultation with healthcare provider',
                'Additional tests recommended',
                'Follow up within 1-2 weeks'
            ]
        else:
            risk_level = 'Low'
            interpretation = f'Likely benign tumor (confidence: {confidence:.1%}). Continue regular monitoring.'
            recommendations = [
                'Continue regular screenings',
                'Monitor for any changes',
                'Follow standard screening guidelines'
            ]
        
        result = {
            'prediction': int(prediction),
            'diagnosis': diagnosis,
            'confidence': confidence,
            'class_probabilities': class_probs,
            'risk_level': risk_level,
            'interpretation': interpretation,
            'recommendations': recommendations,
            'features_used': {k: v for k, v in zip(expected_features, feature_vector)},
            'model_type': 'breast_cancer_classification',
            'status': 'success'
        }
        
        return result
        
    except Exception as e:
        return {
            'error': str(e),
            'status': 'error'
        }

def main():
    """Main inference function"""
    try:
        # Get input data from command line
        if len(sys.argv) != 2:
            raise ValueError("Usage: python inference-breast-cancer.py '<patient_data_json>'")
        
        patient_data = json.loads(sys.argv[1])
        result = predict_breast_cancer(patient_data)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'status': 'error'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()