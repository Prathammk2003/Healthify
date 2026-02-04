#!/usr/bin/env python3
"""
Brain MRI Tumor Detection Inference
"""

import sys
import json
import numpy as np
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

# Image processing
try:
    from PIL import Image
    import cv2
    IMAGE_AVAILABLE = True
except ImportError:
    IMAGE_AVAILABLE = False

def load_brain_mri_model():
    """Load trained brain MRI model"""
    try:
        models_dir = os.path.join(os.getcwd(), 'trained_models')
        model_path = os.path.join(models_dir, 'brain_classification_model.joblib')
        scaler_path = os.path.join(models_dir, 'brain_classification_scaler.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Brain classification model not found at {model_path}")
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        return model, scaler
    except Exception as e:
        raise Exception(f"Failed to load brain classification model: {str(e)}")

def preprocess_brain_image(image_data, target_size=(128, 128)):
    """Preprocess brain MRI image for prediction"""
    if not IMAGE_AVAILABLE:
        raise ImportError("Image processing libraries not available")
    
    try:
        # Convert image data to PIL Image
        if isinstance(image_data, str):
            # Assume it's a file path
            img = Image.open(image_data)
        elif isinstance(image_data, bytes):
            # Assume it's image bytes
            from io import BytesIO
            img = Image.open(BytesIO(image_data))
        else:
            raise ValueError("Invalid image data format")
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize image
        img = img.resize(target_size)
        img_array = np.array(img) / 255.0  # Normalize
        
        return img_array
        
    except Exception as e:
        raise Exception(f"Failed to preprocess image: {str(e)}")

def extract_brain_features(img_array):
    """Extract features from brain MRI image"""
    try:
        # Convert to grayscale and flatten (simple approach)
        if len(img_array.shape) == 3:
            # Convert RGB to grayscale
            gray = np.dot(img_array[...,:3], [0.2989, 0.5870, 0.1140])
        else:
            gray = img_array
        
        # Flatten the image as features
        feature_vector = gray.flatten()
        
        return feature_vector.reshape(1, -1)
        
    except Exception as e:
        raise Exception(f"Failed to extract features: {str(e)}")

def predict_brain_tumor(image_data):
    """Predict brain tumor from MRI image"""
    try:
        # Load model
        model, scaler = load_brain_mri_model()
        
        # Preprocess image
        img_array = preprocess_brain_image(image_data, target_size=(64, 64))
        
        # Extract features
        features = extract_brain_features(img_array)
        
        # Scale features
        features_scaled = scaler.transform(features)
        
        # Predict
        prediction = model.predict(features_scaled)[0]
        
        # Get prediction probabilities if available
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(features_scaled)[0]
            confidence = float(np.max(probabilities))
            
            # Get probabilities for each class
            class_probs = {
                'no_tumor': float(probabilities[0]),
                'tumor': float(probabilities[1])
            }
        else:
            confidence = 0.8
            class_probs = {}
        
        # Get predicted class name
        predicted_class = 'no_tumor' if prediction == 0 else 'tumor'
        
        # Generate medical interpretation
        interpretation = generate_brain_interpretation(predicted_class, confidence)
        
        result = {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'class_probabilities': class_probs,
            'interpretation': interpretation,
            'risk_level': get_brain_risk_level(predicted_class, confidence),
            'recommendations': get_brain_recommendations(predicted_class),
            'model_type': 'brain_tumor_classification',
            'status': 'success'
        }
        
        return result
        
    except Exception as e:
        return {
            'error': str(e),
            'status': 'error'
        }

def generate_brain_interpretation(predicted_class, confidence):
    """Generate medical interpretation for brain MRI result"""
    interpretations = {
        'no': f'No tumor detected in brain MRI scan (confidence: {confidence:.1%}). The scan appears normal.',
        'yes': f'Tumor detected in brain MRI scan (confidence: {confidence:.1%}). Further medical evaluation required.',
        'normal': f'Normal brain MRI scan (confidence: {confidence:.1%}). No abnormalities detected.',
        'tumor': f'Brain tumor detected (confidence: {confidence:.1%}). Immediate medical consultation recommended.'
    }
    
    return interpretations.get(predicted_class.lower(), 
                              f'Brain MRI analysis: {predicted_class} (confidence: {confidence:.1%})')

def get_brain_risk_level(predicted_class, confidence):
    """Determine risk level for brain MRI result"""
    if predicted_class.lower() in ['tumor'] and confidence > 0.7:
        return 'high'
    elif predicted_class.lower() in ['tumor'] and confidence > 0.5:
        return 'medium'
    else:
        return 'low'

def get_brain_recommendations(predicted_class):
    """Get medical recommendations based on brain MRI result"""
    if predicted_class.lower() in ['tumor']:
        return [
            'Immediate consultation with neurologist or neurosurgeon',
            'Additional imaging studies may be required (contrast MRI, CT scan)',
            'Biopsy may be necessary for definitive diagnosis',
            'Do not delay medical attention'
        ]
    else:
        return [
            'Continue regular medical checkups',
            'Monitor for any new neurological symptoms',
            'Follow up as recommended by healthcare provider'
        ]

def main():
    """Main inference function"""
    try:
        # Get input data from command line
        if len(sys.argv) != 2:
            raise ValueError("Usage: python inference-brain-mri.py '<image_path_or_data>'")
        
        image_input = sys.argv[1]
        
        # Try to parse as JSON first (for base64 data), otherwise treat as file path
        try:
            input_data = json.loads(image_input)
            if 'image_data' in input_data:
                import base64
                from io import BytesIO
                image_bytes = base64.b64decode(input_data['image_data'])
                result = predict_brain_tumor(image_bytes)
            else:
                raise ValueError("No image_data found in JSON input")
        except json.JSONDecodeError:
            # Treat as file path
            result = predict_brain_tumor(image_input)
        
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