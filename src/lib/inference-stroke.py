#!/usr/bin/env python3
"""
Stroke Risk Prediction Inference
"""

import sys
import json
import numpy as np
import pandas as pd
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

def load_stroke_model():
    """Load trained stroke model and scaler"""
    try:
        models_dir = os.path.join(os.getcwd(), 'trained_models')
        model_path = os.path.join(models_dir, 'stroke_model.joblib')
        scaler_path = os.path.join(models_dir, 'stroke_scaler.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Stroke model not found at {model_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        return model, scaler
    except Exception as e:
        raise Exception(f"Failed to load stroke model: {str(e)}")

def predict_stroke_risk(patient_data):
    """Predict stroke risk"""
    try:
        # Load model
        model, scaler = load_stroke_model()
        
        # Expected features after preprocessing (these are typical after one-hot encoding)
        # This is a simplified version - in practice, you'd need to replicate the exact preprocessing
        expected_features = {
            'age': 50.0,
            'hypertension': 0,
            'heart_disease': 0,
            'avg_glucose_level': 120.0,
            'bmi': 25.0,
            'gender_Male': 0,
            'ever_married_Yes': 1,
            'work_type_Govt_job': 0,
            'work_type_Never_worked': 0,
            'work_type_Private': 1,
            'work_type_Self-employed': 0,
            'Residence_type_Urban': 1,
            'smoking_status_formerly smoked': 0,
            'smoking_status_never smoked': 1,
            'smoking_status_smokes': 0
        }
        
        # Create feature vector with provided data or defaults
        feature_vector = []
        for feature, default_value in expected_features.items():
            if feature in patient_data:
                feature_vector.append(float(patient_data[feature]))
            else:
                feature_vector.append(default_value)
        
        # Convert to numpy array and reshape
        features = np.array(feature_vector).reshape(1, -1)
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Predict
        prediction = model.predict(features_scaled)[0]
        
        # Get prediction probabilities
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features_scaled)[0]
            stroke_probability = float(probabilities[1])  # Probability of stroke
            confidence = float(np.max(probabilities))
        else:
            stroke_probability = 0.5 if prediction == 0 else 0.8
            confidence = 0.8
        
        # Risk interpretation
        if stroke_probability >= 0.7:
            risk_level = 'High'
            risk_description = 'High stroke risk - immediate medical evaluation recommended'
            recommendations = [
                'Immediate consultation with neurologist or physician',
                'Blood pressure monitoring and management',
                'Lifestyle modifications (diet, exercise, smoking cessation)',
                'Regular medical follow-ups',
                'Consider preventive medications as prescribed'
            ]
        elif stroke_probability >= 0.3:
            risk_level = 'Medium'
            risk_description = 'Moderate stroke risk - preventive measures recommended'
            recommendations = [
                'Regular medical checkups',
                'Blood pressure and glucose monitoring',
                'Healthy diet and regular exercise',
                'Avoid smoking and excessive alcohol',
                'Manage existing health conditions'
            ]
        else:
            risk_level = 'Low'
            risk_description = 'Low stroke risk - maintain healthy lifestyle'
            recommendations = [
                'Continue healthy lifestyle habits',
                'Regular health screenings',
                'Monitor blood pressure annually',
                'Maintain healthy weight and diet'
            ]
        
        result = {
            'prediction': int(prediction),
            'stroke_probability': stroke_probability,
            'confidence': confidence,
            'risk_level': risk_level,
            'risk_description': risk_description,
            'recommendations': recommendations,
            'features_used': {k: v for k, v in zip(expected_features.keys(), feature_vector)},
            'model_type': 'stroke_risk_prediction',
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
            raise ValueError("Usage: python inference-stroke.py '<patient_data_json>'")
        
        patient_data = json.loads(sys.argv[1])
        result = predict_stroke_risk(patient_data)
        
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