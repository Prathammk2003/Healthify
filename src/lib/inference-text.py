#!/usr/bin/env python3
"""
Medical Text Classification Inference
"""

import sys
import json
import numpy as np
import joblib
import os
import warnings
warnings.filterwarnings('ignore')

# NLP Libraries
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False

def load_medical_text_model():
    """Load trained medical text classification model"""
    try:
        models_dir = os.path.join(os.getcwd(), 'trained_models')
        model_path = os.path.join(models_dir, 'medical_text_model.joblib')
        vectorizer_path = os.path.join(models_dir, 'medical_text_vectorizer.joblib')
        encoder_path = os.path.join(models_dir, 'medical_text_encoder.joblib')
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Medical text model not found at {model_path}")
        
        model = joblib.load(model_path)
        vectorizer = joblib.load(vectorizer_path)
        label_encoder = joblib.load(encoder_path)
        
        return model, vectorizer, label_encoder
    except Exception as e:
        raise Exception(f"Failed to load medical text model: {str(e)}")

def preprocess_medical_text(text):
    """Preprocess medical text"""
    if not NLP_AVAILABLE or not text:
        return text.lower() if text else ""
    
    try:
        # Initialize lemmatizer and stopwords
        lemmatizer = WordNetLemmatizer()
        stop_words = set(stopwords.words('english'))
        
        # Tokenize
        tokens = word_tokenize(text.lower())
        
        # Remove stopwords and lemmatize
        processed_tokens = [
            lemmatizer.lemmatize(token) 
            for token in tokens 
            if token.isalpha() and token not in stop_words
        ]
        
        return ' '.join(processed_tokens)
    except:
        return text.lower()

def predict_medical_specialty(text):
    """Predict medical specialty from text"""
    try:
        # Load model
        model, vectorizer, label_encoder = load_medical_text_model()
        
        if not text or len(text.strip()) == 0:
            raise ValueError("Empty text provided")
        
        # Preprocess text
        processed_text = preprocess_medical_text(text)
        
        # Vectorize text
        text_vector = vectorizer.transform([processed_text])
        
        # Predict
        prediction = model.predict(text_vector)[0]
        
        # Get prediction probabilities
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(text_vector)[0]
            confidence = float(np.max(probabilities))
            
            # Get top 3 predictions
            top_indices = np.argsort(probabilities)[-3:][::-1]
            top_predictions = []
            for idx in top_indices:
                specialty = label_encoder.inverse_transform([idx])[0]
                prob = float(probabilities[idx])
                top_predictions.append({
                    'specialty': specialty,
                    'probability': prob
                })
        else:
            confidence = 0.8
            top_predictions = []
        
        # Get predicted specialty
        predicted_specialty = label_encoder.inverse_transform([prediction])[0]
        
        # Generate clinical interpretation
        interpretation = generate_clinical_interpretation(predicted_specialty, confidence)
        
        result = {
            'predicted_specialty': predicted_specialty,
            'confidence': confidence,
            'top_predictions': top_predictions,
            'interpretation': interpretation,
            'processed_text_length': len(processed_text),
            'model_type': 'medical_text_classification',
            'status': 'success'
        }
        
        return result
        
    except Exception as e:
        return {
            'error': str(e),
            'status': 'error'
        }

def generate_clinical_interpretation(specialty, confidence):
    """Generate clinical interpretation based on predicted specialty"""
    specialty_descriptions = {
        'Cardiovascular / Pulmonary': 'Heart and lung related conditions - consider cardiology or pulmonology consultation',
        'Orthopedic': 'Musculoskeletal conditions - orthopedic evaluation may be needed',
        'Radiology': 'Imaging findings - radiological interpretation available',
        'General Medicine': 'General medical condition - primary care evaluation appropriate',
        'Gastroenterology': 'Digestive system condition - GI specialist consultation recommended',
        'Neurology': 'Neurological condition - neurology evaluation recommended',
        'SOAP': 'Clinical documentation - review medical notes for follow-up',
        'Emergency Room Reports': 'Emergency condition - immediate medical attention may be needed',
        'Psychiatry / Psychology': 'Mental health condition - psychiatric evaluation recommended',
        'Surgery': 'Surgical condition - surgical consultation may be required'
    }
    
    base_description = specialty_descriptions.get(specialty, f'{specialty} related condition')
    
    if confidence >= 0.8:
        confidence_level = 'High confidence'
    elif confidence >= 0.6:
        confidence_level = 'Moderate confidence'
    else:
        confidence_level = 'Low confidence'
    
    return f"{confidence_level}: {base_description}"

def main():
    """Main inference function"""
    try:
        # Get input data from command line
        if len(sys.argv) != 2:
            raise ValueError("Usage: python inference-text.py '<text_data_json>'")
        
        input_data = json.loads(sys.argv[1])
        text = input_data.get('text', '')
        
        result = predict_medical_specialty(text)
        
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