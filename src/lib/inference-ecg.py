#!/usr/bin/env python3
"""
ECG Heartbeat Classification Inference
"""

import sys
import json
import numpy as np
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

def load_ecg_model():
    """Load trained ECG model and scaler"""
    try:
        models_dir = os.path.join(os.getcwd(), 'trained_models')
        model_path = os.path.join(models_dir, 'ecg_heartbeat_model.joblib')
        scaler_path = os.path.join(models_dir, 'ecg_heartbeat_scaler.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"ECG model not found at {model_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        return model, scaler
    except Exception as e:
        raise Exception(f"Failed to load ECG model: {str(e)}")

def predict_ecg_heartbeat(ecg_data):
    """Predict ECG heartbeat classification"""
    try:
        # Load model
        model, scaler = load_ecg_model()
        
        # Prepare data
        if isinstance(ecg_data, list):
            ecg_array = np.array(ecg_data).reshape(1, -1)
        elif isinstance(ecg_data, dict) and 'values' in ecg_data:
            ecg_array = np.array(ecg_data['values']).reshape(1, -1)
        else:
            raise ValueError("Invalid ECG data format")
        
        # Scale data
        ecg_scaled = scaler.transform(ecg_array)
        
        # Predict
        prediction = model.predict(ecg_scaled)[0]
        
        # Get prediction probabilities if available
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(ecg_scaled)[0]
            confidence = float(np.max(probabilities))
        else:
            confidence = 0.8  # Default confidence for non-probabilistic models
        
        # Class labels
        class_labels = {
            0: 'Normal heartbeat',
            1: 'Supraventricular premature',
            2: 'Premature ventricular contraction',
            3: 'Fusion of ventricular and normal',
            4: 'Unclassifiable beat'
        }
        
        result = {
            'predicted_class': int(prediction),
            'predicted_label': class_labels.get(int(prediction), 'Unknown'),
            'confidence': confidence,
            'model_type': 'ecg_heartbeat',
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
            raise ValueError("Usage: python inference-ecg.py '<ecg_data_json>'")
        
        ecg_data = json.loads(sys.argv[1])
        result = predict_ecg_heartbeat(ecg_data)
        
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