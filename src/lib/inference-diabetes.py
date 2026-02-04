#!/usr/bin/env python3
"""
Diabetes Risk Prediction Inference
"""

import sys
import json
import numpy as np
import pandas as pd
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

def load_diabetes_model():
    """Load trained diabetes model and scaler"""
    try:
        models_dir = os.path.join(os.getcwd(), 'trained_models')
        model_path = os.path.join(models_dir, 'diabetes_model.joblib')
        scaler_path = os.path.join(models_dir, 'diabetes_scaler.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Diabetes model not found at {model_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        return model, scaler
    except Exception as e:
        raise Exception(f"Failed to load diabetes model: {str(e)}")

def predict_diabetes_risk(patient_data):
    """Predict diabetes risk"""
    try:
        # Load model
        model, scaler = load_diabetes_model()
        
        # Expected features in order
        expected_features = [
            'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
            'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
        ]
        
        # Prepare data with default values for missing features
        feature_defaults = {
            'Pregnancies': 1,
            'Glucose': 120,
            'BloodPressure': 80,
            'SkinThickness': 20,
            'Insulin': 80,
            'BMI': 25.0,
            'DiabetesPedigreeFunction': 0.5,
            'Age': 30
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
            probability = float(probabilities[1])  # Probability of diabetes
            confidence = float(np.max(probabilities))
        else:
            probability = 0.5 if prediction == 0 else 0.8
            confidence = 0.8
        
        # Risk interpretation
        if probability >= 0.7:
            risk_level = 'High'
            risk_description = 'High diabetes risk - immediate glucose testing recommended'
        elif probability >= 0.4:
            risk_level = 'Medium'
            risk_description = 'Moderate diabetes risk - lifestyle modifications recommended'
        else:
            risk_level = 'Low'
            risk_description = 'Low diabetes risk - maintain healthy lifestyle'
        
        result = {
            'prediction': int(prediction),
            'probability': probability,
            'confidence': confidence,
            'risk_level': risk_level,
            'risk_description': risk_description,
            'features_used': {k: v for k, v in zip(expected_features, feature_vector)},
            'model_type': 'diabetes_prediction',
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
            raise ValueError("Usage: python inference-diabetes.py '<patient_data_json>'")
        
        patient_data = json.loads(sys.argv[1])
        result = predict_diabetes_risk(patient_data)
        
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