#!/usr/bin/env python3
"""
Simplified Medical Image and Signal Training
Works with available libraries and focuses on ECG and basic brain scan analysis
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
import logging
from datetime import datetime
from pathlib import Path

# Core ML Libraries
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

# Image processing (optional)
try:
    from PIL import Image
    IMAGE_AVAILABLE = True
except ImportError:
    IMAGE_AVAILABLE = False

class SimplifiedMedicalTrainer:
    def __init__(self):
        """Initialize the medical trainer"""
        self.datasets_dir = "datasets"
        self.models_dir = "trained_models"
        
        # Create directories
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{self.models_dir}/medical_training.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        self.logger.info("Simplified Medical Training System initialized")
        self.logger.info(f"Image processing available: {IMAGE_AVAILABLE}")
        
        self.trained_models = {}
    
    def train_enhanced_ecg_model(self):
        """Train enhanced ECG model with all available ECG data"""
        self.logger.info("Training Enhanced ECG Model...")
        
        try:
            # Load ECG datasets
            ecg_dir = os.path.join(self.datasets_dir, "ecg-heartbeat")
            
            datasets = []
            labels = []
            
            # Load MIT-BIH dataset
            mitbih_train_path = os.path.join(ecg_dir, "mitbih_train.csv")
            mitbih_test_path = os.path.join(ecg_dir, "mitbih_test.csv")
            
            if os.path.exists(mitbih_train_path):
                df_train = pd.read_csv(mitbih_train_path, header=None)
                df_test = pd.read_csv(mitbih_test_path, header=None)
                
                # Combine datasets
                df_combined = pd.concat([df_train, df_test], ignore_index=True)
                
                # Separate features and labels
                X_mitbih = df_combined.iloc[:, :-1].values
                y_mitbih = df_combined.iloc[:, -1].values
                
                datasets.append(X_mitbih)
                labels.append(y_mitbih)
                
                self.logger.info(f"Loaded MIT-BIH dataset: {X_mitbih.shape[0]} samples")
            
            # Load PTB dataset if available
            ptb_path = os.path.join(ecg_dir, "ptbdb_normal.csv")
            ptb_abnormal_path = os.path.join(ecg_dir, "ptbdb_abnormal.csv")
            
            if os.path.exists(ptb_path) and os.path.exists(ptb_abnormal_path):
                df_normal = pd.read_csv(ptb_path, header=None)
                df_abnormal = pd.read_csv(ptb_abnormal_path, header=None)
                
                # Add labels (0 = normal, 1 = abnormal)
                df_normal['label'] = 0
                df_abnormal['label'] = 1
                
                df_ptb = pd.concat([df_normal, df_abnormal], ignore_index=True)
                
                X_ptb = df_ptb.iloc[:, :-1].values
                y_ptb = df_ptb.iloc[:, -1].values
                
                datasets.append(X_ptb)
                labels.append(y_ptb)
                
                self.logger.info(f"Loaded PTB dataset: {X_ptb.shape[0]} samples")
            
            if not datasets:
                raise FileNotFoundError("No ECG datasets found")
            
            # Use the largest dataset for training
            X = datasets[0]
            y = labels[0]
            
            # Limit data size for faster training
            if len(X) > 10000:
                indices = np.random.choice(len(X), 10000, replace=False)
                X = X[indices]
                y = y[indices]
                self.logger.info(f"Limited to {len(X)} samples for faster training")
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train models
            models = {
                'random_forest': RandomForestClassifier(
                    n_estimators=50,  # Reduced for faster training
                    random_state=42, 
                    n_jobs=-1
                ),
                'logistic_regression': LogisticRegression(
                    random_state=42, 
                    max_iter=500
                )
            }
            
            results = {}
            for name, model in models.items():
                self.logger.info(f"Training {name}...")
                model.fit(X_train_scaled, y_train)
                
                train_score = model.score(X_train_scaled, y_train)
                test_score = model.score(X_test_scaled, y_test)
                
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
            model_path = os.path.join(self.models_dir, "enhanced_ecg_model.joblib")
            scaler_path = os.path.join(self.models_dir, "enhanced_ecg_scaler.joblib")
            
            joblib.dump(best_model_info['model'], model_path)
            joblib.dump(scaler, scaler_path)
            
            # Create class labels mapping
            unique_labels = np.unique(y)
            class_labels = {int(label): f"ECG_Class_{int(label)}" for label in unique_labels}
            
            # Save metadata
            metadata = {
                'model_type': 'enhanced_ecg_heartbeat',
                'best_algorithm': best_model_name,
                'train_accuracy': best_model_info['train_accuracy'],
                'test_accuracy': best_model_info['test_accuracy'],
                'classes': class_labels,
                'sample_count': len(X),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'scaler_path': scaler_path
            }
            
            with open(os.path.join(self.models_dir, "enhanced_ecg_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['enhanced_ecg'] = metadata
            self.logger.info(f"Enhanced ECG model saved: {best_model_name} with {best_model_info['test_accuracy']:.4f} accuracy")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Enhanced ECG training failed: {e}")
            return None
    
    def train_brain_classification_model(self):
        """Train brain scan classification model"""
        self.logger.info("Training Brain Classification Model...")
        
        try:
            brain_dir = os.path.join(self.datasets_dir, "brain-scans")
            
            if not os.path.exists(brain_dir):
                raise FileNotFoundError("Brain scans dataset not found")
            
            # Check directory structure
            no_dir = os.path.join(brain_dir, "no")
            yes_dir = os.path.join(brain_dir, "yes")
            
            if not (os.path.exists(no_dir) and os.path.exists(yes_dir)):
                self.logger.warning("Standard brain scan structure not found, checking alternative...")
                
                # Check for brain_tumor_dataset structure
                tumor_dir = os.path.join(brain_dir, "brain_tumor_dataset")
                if os.path.exists(tumor_dir):
                    no_dir = os.path.join(tumor_dir, "no")
                    yes_dir = os.path.join(tumor_dir, "yes")
            
            if IMAGE_AVAILABLE and os.path.exists(no_dir) and os.path.exists(yes_dir):
                # Load images with basic feature extraction
                features = []
                labels = []
                
                # Process 'no' images (no tumor)
                no_files = [f for f in os.listdir(no_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                for i, file in enumerate(no_files[:100]):  # Limit for faster training
                    try:
                        img_path = os.path.join(no_dir, file)
                        img = Image.open(img_path)
                        
                        # Convert to grayscale and resize
                        img = img.convert('L').resize((64, 64))
                        img_array = np.array(img).flatten() / 255.0
                        
                        features.append(img_array)
                        labels.append(0)  # 0 = no tumor
                        
                    except Exception as e:
                        self.logger.warning(f"Failed to process {file}: {e}")
                
                # Process 'yes' images (tumor)
                yes_files = [f for f in os.listdir(yes_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                for i, file in enumerate(yes_files[:100]):  # Limit for faster training
                    try:
                        img_path = os.path.join(yes_dir, file)
                        img = Image.open(img_path)
                        
                        # Convert to grayscale and resize
                        img = img.convert('L').resize((64, 64))
                        img_array = np.array(img).flatten() / 255.0
                        
                        features.append(img_array)
                        labels.append(1)  # 1 = tumor
                        
                    except Exception as e:
                        self.logger.warning(f"Failed to process {file}: {e}")
                
                if len(features) < 10:
                    raise ValueError("Not enough images processed for training")
                
                X = np.array(features)
                y = np.array(labels)
                
                self.logger.info(f"Processed {len(X)} brain images: {np.sum(y==0)} no-tumor, {np.sum(y==1)} tumor")
                
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42, stratify=y
                )
                
                # Scale features
                scaler = StandardScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                
                # Train models
                models = {
                    'random_forest': RandomForestClassifier(
                        n_estimators=50,
                        random_state=42, 
                        n_jobs=-1
                    ),
                    'logistic_regression': LogisticRegression(
                        random_state=42, 
                        max_iter=1000
                    )
                }
                
                results = {}
                for name, model in models.items():
                    self.logger.info(f"Training {name}...")
                    model.fit(X_train_scaled, y_train)
                    
                    train_score = model.score(X_train_scaled, y_train)
                    test_score = model.score(X_test_scaled, y_test)
                    
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
                model_path = os.path.join(self.models_dir, "brain_classification_model.joblib")
                scaler_path = os.path.join(self.models_dir, "brain_classification_scaler.joblib")
                
                joblib.dump(best_model_info['model'], model_path)
                joblib.dump(scaler, scaler_path)
                
                # Save metadata
                metadata = {
                    'model_type': 'brain_tumor_classification',
                    'best_algorithm': best_model_name,
                    'train_accuracy': best_model_info['train_accuracy'],
                    'test_accuracy': best_model_info['test_accuracy'],
                    'classes': {0: 'no_tumor', 1: 'tumor'},
                    'sample_count': len(X),
                    'feature_count': X.shape[1],
                    'trained_at': datetime.now().isoformat(),
                    'model_path': model_path,
                    'scaler_path': scaler_path
                }
                
                with open(os.path.join(self.models_dir, "brain_classification_metadata.json"), 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                self.trained_models['brain_classification'] = metadata
                self.logger.info(f"Brain classification model saved: {best_model_name} with {best_model_info['test_accuracy']:.4f} accuracy")
                
                return metadata
                
            else:
                self.logger.warning("Image processing not available or brain scan directories not found")
                return None
            
        except Exception as e:
            self.logger.error(f"Brain classification training failed: {e}")
            return None
    
    def train_all_models(self):
        """Train all available medical models"""
        self.logger.info("Starting comprehensive medical model training...")
        
        results = {}
        
        # Train enhanced ECG model
        ecg_result = self.train_enhanced_ecg_model()
        if ecg_result:
            results['enhanced_ecg'] = ecg_result
        
        # Train brain classification model
        brain_result = self.train_brain_classification_model()
        if brain_result:
            results['brain_classification'] = brain_result
        
        # Save combined results
        summary = {
            'training_completed_at': datetime.now().isoformat(),
            'models_trained': len(results),
            'models': results
        }
        
        with open(os.path.join(self.models_dir, "medical_training_summary.json"), 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Training completed! {len(results)} models trained successfully")
        
        return results

def main():
    """Main training function"""
    print("Simplified Medical Training Pipeline")
    print("=" * 50)
    
    try:
        trainer = SimplifiedMedicalTrainer()
        results = trainer.train_all_models()
        
        print("\nTraining Results:")
        print("=" * 30)
        
        for model_name, metadata in results.items():
            print(f"{model_name}:")
            print(f"  Algorithm: {metadata['best_algorithm']}")
            print(f"  Accuracy: {metadata['test_accuracy']:.4f}")
            print(f"  Samples: {metadata['sample_count']}")
            print()
        
        print(f"All models saved to: {trainer.models_dir}")
        
    except Exception as e:
        print(f"Training failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()