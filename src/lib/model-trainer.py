#!/usr/bin/env python3
"""
Medical Dataset Training Pipeline
Trains custom models on healthcare datasets for improved symptom checking
"""

import os
import sys
import pandas as pd
import numpy as np
import json
from datetime import datetime
import logging
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Machine Learning Libraries
import sklearn
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
import joblib

# Deep Learning Libraries
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, Model
    from tensorflow.keras.layers import Dense, Dropout, Conv1D, LSTM, Embedding, GlobalMaxPooling1D
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("TensorFlow not available. Using scikit-learn models only.")

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
    print("NLTK not available. Basic text processing only.")

class MedicalDatasetTrainer:
    """
    Comprehensive training system for medical datasets
    """
    
    def __init__(self, datasets_dir: str = "datasets", models_dir: str = "trained_models"):
        self.datasets_dir = datasets_dir
        self.models_dir = models_dir
        self.trained_models = {}
        self.training_history = {}
        
        # Create models directory
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{self.models_dir}/training.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Initialize text preprocessor
        if NLP_AVAILABLE:
            self.lemmatizer = WordNetLemmatizer()
            self.stop_words = set(stopwords.words('english'))
        
        self.logger.info("Medical Dataset Trainer initialized")
    
    def train_ecg_heartbeat_model(self) -> Dict:
        """Train ECG heartbeat classification model"""
        self.logger.info("Training ECG Heartbeat Classification Model...")
        
        try:
            # Load ECG datasets
            train_path = os.path.join(self.datasets_dir, "ecg-heartbeat", "mitbih_train.csv")
            test_path = os.path.join(self.datasets_dir, "ecg-heartbeat", "mitbih_test.csv")
            
            if not (os.path.exists(train_path) and os.path.exists(test_path)):
                raise FileNotFoundError("ECG dataset files not found")
            
            # Load data
            train_data = pd.read_csv(train_path, header=None)
            test_data = pd.read_csv(test_path, header=None)
            
            self.logger.info(f"Loaded ECG data: Train {train_data.shape}, Test {test_data.shape}")
            
            # Prepare features and labels
            X_train = train_data.iloc[:, :-1].values
            y_train = train_data.iloc[:, -1].values
            X_test = test_data.iloc[:, :-1].values
            y_test = test_data.iloc[:, -1].values
            
            # Normalize features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train multiple models (OPTIMIZED - no slow Gradient Boosting)
            models = {
                'random_forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
                'logistic_regression': LogisticRegression(random_state=42, max_iter=1000)
                # Removed gradient_boosting - too slow for large datasets
            }
            
            results = {}
            for name, model in models.items():
                self.logger.info(f"Training {name}...")
                model.fit(X_train_scaled, y_train)
                
                # Evaluate
                train_score = model.score(X_train_scaled, y_train)
                test_score = model.score(X_test_scaled, y_test)
                
                results[name] = {
                    'model': model,
                    'train_accuracy': train_score,
                    'test_accuracy': test_score,
                    'scaler': scaler
                }
                
                self.logger.info(f"{name}: Train={train_score:.4f}, Test={test_score:.4f}")
            
            # Select best model
            best_model_name = max(results.keys(), key=lambda k: results[k]['test_accuracy'])
            best_model_info = results[best_model_name]
            
            # Save best model
            model_path = os.path.join(self.models_dir, "ecg_heartbeat_model.joblib")
            scaler_path = os.path.join(self.models_dir, "ecg_heartbeat_scaler.joblib")
            
            joblib.dump(best_model_info['model'], model_path)
            joblib.dump(best_model_info['scaler'], scaler_path)
            
            # Save model metadata
            metadata = {
                'model_type': 'ecg_heartbeat',
                'best_algorithm': best_model_name,
                'train_accuracy': best_model_info['train_accuracy'],
                'test_accuracy': best_model_info['test_accuracy'],
                'feature_count': X_train.shape[1],
                'class_labels': {
                    0: 'Normal heartbeat',
                    1: 'Supraventricular premature',
                    2: 'Premature ventricular contraction',
                    3: 'Fusion of ventricular and normal',
                    4: 'Unclassifiable beat'
                },
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'scaler_path': scaler_path
            }
            
            with open(os.path.join(self.models_dir, "ecg_heartbeat_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['ecg_heartbeat'] = metadata
            self.logger.info(f"ECG model saved: {best_model_name} with {best_model_info['test_accuracy']:.4f} accuracy")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"ECG training failed: {str(e)}")
            raise
    
    def train_diabetes_model(self) -> Dict:
        """Train diabetes prediction model"""
        self.logger.info("Training Diabetes Prediction Model...")
        
        try:
            # Load diabetes dataset
            data_path = os.path.join(self.datasets_dir, "diabetes", "diabetes.csv")
            
            if not os.path.exists(data_path):
                raise FileNotFoundError("Diabetes dataset not found")
            
            # Load data
            data = pd.read_csv(data_path)
            self.logger.info(f"Loaded diabetes data: {data.shape}")
            
            # Prepare features and target
            X = data.drop('Outcome', axis=1)
            y = data['Outcome']
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train models (OPTIMIZED - faster training)
            models = {
                'random_forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
                'logistic_regression': LogisticRegression(random_state=42, max_iter=500)
                # Removed slow models for faster training
            }
            
            results = {}
            for name, model in models.items():
                self.logger.info(f"Training {name}...")
                model.fit(X_train_scaled, y_train)
                
                # Cross-validation
                cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
                test_score = model.score(X_test_scaled, y_test)
                
                results[name] = {
                    'model': model,
                    'cv_mean': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'test_accuracy': test_score,
                    'scaler': scaler
                }
                
                self.logger.info(f"{name}: CV={cv_scores.mean():.4f}±{cv_scores.std():.4f}, Test={test_score:.4f}")
            
            # Select best model
            best_model_name = max(results.keys(), key=lambda k: results[k]['test_accuracy'])
            best_model_info = results[best_model_name]
            
            # Save best model
            model_path = os.path.join(self.models_dir, "diabetes_model.joblib")
            scaler_path = os.path.join(self.models_dir, "diabetes_scaler.joblib")
            
            joblib.dump(best_model_info['model'], model_path)
            joblib.dump(best_model_info['scaler'], scaler_path)
            
            # Save metadata
            metadata = {
                'model_type': 'diabetes_prediction',
                'best_algorithm': best_model_name,
                'cv_accuracy': best_model_info['cv_mean'],
                'test_accuracy': best_model_info['test_accuracy'],
                'features': list(X.columns),
                'classes': {0: 'No diabetes', 1: 'Diabetes'},
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'scaler_path': scaler_path
            }
            
            with open(os.path.join(self.models_dir, "diabetes_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['diabetes'] = metadata
            self.logger.info(f"Diabetes model saved: {best_model_name} with {best_model_info['test_accuracy']:.4f} accuracy")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Diabetes training failed: {str(e)}")
            raise
    
    def preprocess_medical_text(self, text: str) -> str:
        """Preprocess medical transcription text"""
        if not NLP_AVAILABLE or not text:
            return text.lower() if text else ""
        
        try:
            # Tokenize
            tokens = word_tokenize(text.lower())
            
            # Remove stopwords and lemmatize
            processed_tokens = [
                self.lemmatizer.lemmatize(token) 
                for token in tokens 
                if token.isalpha() and token not in self.stop_words
            ]
            
            return ' '.join(processed_tokens)
        except:
            return text.lower()
    
    def train_medical_text_classifier(self) -> Dict:
        """Train medical transcription classifier"""
        self.logger.info("Training Medical Text Classification Model...")
        
        try:
            # Load medical transcriptions
            data_path = os.path.join(self.datasets_dir, "medical-transcriptions", "mtsamples.csv")
            
            if not os.path.exists(data_path):
                raise FileNotFoundError("Medical transcriptions dataset not found")
            
            # Load data
            data = pd.read_csv(data_path)
            self.logger.info(f"Loaded medical transcriptions: {data.shape}")
            
            # Use medical specialty as target and transcription as features
            if 'medical_specialty' in data.columns and 'transcription' in data.columns:
                # Filter common specialties
                specialty_counts = data['medical_specialty'].value_counts()
                common_specialties = specialty_counts[specialty_counts >= 50].index
                filtered_data = data[data['medical_specialty'].isin(common_specialties)].copy()
                
                self.logger.info(f"Using {len(common_specialties)} specialties with {len(filtered_data)} samples")
                
                # Preprocess text
                self.logger.info("Preprocessing medical texts...")
                filtered_data['processed_text'] = filtered_data['transcription'].apply(self.preprocess_medical_text)
                
                # Prepare features using TF-IDF
                from sklearn.feature_extraction.text import TfidfVectorizer
                
                vectorizer = TfidfVectorizer(
                    max_features=2000,  # Reduced for faster training
                    ngram_range=(1, 2),
                    min_df=2,
                    max_df=0.8
                )
                
                X = vectorizer.fit_transform(filtered_data['processed_text'])
                y = filtered_data['medical_specialty']
                
                # Encode labels
                label_encoder = LabelEncoder()
                y_encoded = label_encoder.fit_transform(y)
                
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
                )
                
                # Train models (OPTIMIZED - no slow gradient boosting)
                models = {
                    'random_forest': RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
                    'logistic_regression': LogisticRegression(random_state=42, max_iter=1000)
                }
                
                results = {}
                for name, model in models.items():
                    self.logger.info(f"Training {name}...")
                    model.fit(X_train, y_train)
                    
                    train_score = model.score(X_train, y_train)
                    test_score = model.score(X_test, y_test)
                    
                    results[name] = {
                        'model': model,
                        'train_accuracy': train_score,
                        'test_accuracy': test_score
                    }
                    
                    self.logger.info(f"{name}: Train={train_score:.4f}, Test={test_score:.4f}")
                
                # Select best model
                best_model_name = max(results.keys(), key=lambda k: results[k]['test_accuracy'])
                best_model_info = results[best_model_name]
                
                # Save model
                model_path = os.path.join(self.models_dir, "medical_text_model.joblib")
                vectorizer_path = os.path.join(self.models_dir, "medical_text_vectorizer.joblib")
                encoder_path = os.path.join(self.models_dir, "medical_text_encoder.joblib")
                
                joblib.dump(best_model_info['model'], model_path)
                joblib.dump(vectorizer, vectorizer_path)
                joblib.dump(label_encoder, encoder_path)
                
                # Save metadata
                metadata = {
                    'model_type': 'medical_text_classification',
                    'best_algorithm': best_model_name,
                    'train_accuracy': best_model_info['train_accuracy'],
                    'test_accuracy': best_model_info['test_accuracy'],
                    'specialties': list(label_encoder.classes_),
                    'feature_count': X.shape[1],
                    'trained_at': datetime.now().isoformat(),
                    'model_path': model_path,
                    'vectorizer_path': vectorizer_path,
                    'encoder_path': encoder_path
                }
                
                with open(os.path.join(self.models_dir, "medical_text_metadata.json"), 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                self.trained_models['medical_text'] = metadata
                self.logger.info(f"Medical text model saved: {best_model_name} with {best_model_info['test_accuracy']:.4f} accuracy")
                
                return metadata
        
        except Exception as e:
            self.logger.error(f"Medical text training failed: {str(e)}")
            raise
    
    def train_all_models(self) -> Dict:
        """Train all available models"""
        self.logger.info("Starting comprehensive model training...")
        
        training_results = {}
        
        # Train ECG model
        try:
            ecg_result = self.train_ecg_heartbeat_model()
            training_results['ecg_heartbeat'] = ecg_result
        except Exception as e:
            self.logger.error(f"ECG training failed: {e}")
            training_results['ecg_heartbeat'] = {'error': str(e)}
        
        # Train diabetes model
        try:
            diabetes_result = self.train_diabetes_model()
            training_results['diabetes'] = diabetes_result
        except Exception as e:
            self.logger.error(f"Diabetes training failed: {e}")
            training_results['diabetes'] = {'error': str(e)}
        
        # Train medical text model
        try:
            text_result = self.train_medical_text_classifier()
            training_results['medical_text'] = text_result
        except Exception as e:
            self.logger.error(f"Medical text training failed: {e}")
            training_results['medical_text'] = {'error': str(e)}
        
        # Save overall training summary
        summary = {
            'training_completed_at': datetime.now().isoformat(),
            'models_trained': len([k for k, v in training_results.items() if 'error' not in v]),
            'models_failed': len([k for k, v in training_results.items() if 'error' in v]),
            'results': training_results
        }
        
        with open(os.path.join(self.models_dir, "training_summary.json"), 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Training completed. {summary['models_trained']} models successful, {summary['models_failed']} failed")
        
        return summary

def main():
    """Main training function"""
    print("🏥 Medical Dataset Training Pipeline")
    print("=" * 50)
    
    # Initialize trainer
    trainer = MedicalDatasetTrainer()
    
    # Run training
    results = trainer.train_all_models()
    
    print("\n" + "=" * 50)
    print("📊 Training Summary:")
    print(f"✅ Successful models: {results['models_trained']}")
    print(f"❌ Failed models: {results['models_failed']}")
    print(f"📁 Models saved to: {trainer.models_dir}")
    
    return results

if __name__ == "__main__":
    main()