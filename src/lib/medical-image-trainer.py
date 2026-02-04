#!/usr/bin/env python3
"""
Comprehensive Medical Image Training System
Trains models on brain MRI, ECG images, and all available medical datasets
"""

import os
import sys
import pandas as pd
import numpy as np
import json
from datetime import datetime
import logging
import warnings
warnings.filterwarnings('ignore')

# Core Libraries
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

# Image Processing Libraries
try:
    from PIL import Image
    import cv2
    import matplotlib.pyplot as plt
    IMAGE_PROCESSING_AVAILABLE = True
except ImportError:
    IMAGE_PROCESSING_AVAILABLE = False
    print("Image processing libraries not available. Install: pip install pillow opencv-python matplotlib")

# Deep Learning Libraries (Optional but recommended for images)
try:
    import tensorflow as tf
    from tensorflow.keras.applications import VGG16, ResNet50
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.models import Sequential, Model
    from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D, Flatten
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    DEEP_LEARNING_AVAILABLE = True
except ImportError:
    DEEP_LEARNING_AVAILABLE = False
    print("TensorFlow not available. Using traditional ML approaches only.")

class MedicalImageTrainer:
    """
    Comprehensive medical image training system
    """
    
    def __init__(self, datasets_dir: str = "datasets", models_dir: str = "trained_models"):
        self.datasets_dir = datasets_dir
        self.models_dir = models_dir
        self.trained_models = {}
        
        # Create models directory
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{self.models_dir}/medical_image_training.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        self.logger.info("Medical Image Training System initialized")
        self.logger.info(f"Image processing available: {IMAGE_PROCESSING_AVAILABLE}")
        self.logger.info(f"Deep learning available: {DEEP_LEARNING_AVAILABLE}")
    
    def load_and_preprocess_images(self, image_dir, target_size=(224, 224), max_images=1000):
        """Load and preprocess images from directory"""
        if not IMAGE_PROCESSING_AVAILABLE:
            raise ImportError("Image processing libraries not available")
        
        images = []
        labels = []
        
        # Get all image files
        for root, dirs, files in os.walk(image_dir):
            class_name = os.path.basename(root)
            if class_name == os.path.basename(image_dir):
                continue  # Skip root directory
                
            count = 0
            for file in files:
                if count >= max_images:
                    break
                    
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
                    try:
                        img_path = os.path.join(root, file)
                        img = Image.open(img_path)
                        
                        # Convert to RGB if necessary
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Resize image
                        img = img.resize(target_size)
                        img_array = np.array(img) / 255.0  # Normalize
                        
                        images.append(img_array)
                        labels.append(class_name)
                        count += 1
                        
                    except Exception as e:
                        self.logger.warning(f"Failed to load image {file}: {e}")
        
        return np.array(images), np.array(labels)
    
    def extract_image_features(self, images, method='traditional'):
        """Extract features from images"""
        if method == 'traditional' and IMAGE_PROCESSING_AVAILABLE:
            # Traditional computer vision features
            features = []
            for img in images:
                # Convert to grayscale for feature extraction
                gray = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
                
                # Calculate basic statistics
                mean_intensity = np.mean(gray)
                std_intensity = np.std(gray)
                min_intensity = np.min(gray)
                max_intensity = np.max(gray)
                
                # Calculate histogram features
                hist = cv2.calcHist([gray], [0], None, [16], [0, 256])
                hist_features = hist.flatten() / np.sum(hist)  # Normalize
                
                # Combine features
                feature_vector = np.concatenate([
                    [mean_intensity, std_intensity, min_intensity, max_intensity],
                    hist_features
                ])
                
                features.append(feature_vector)
            
            return np.array(features)
        
        elif method == 'cnn' and DEEP_LEARNING_AVAILABLE:
            # Use pre-trained CNN for feature extraction
            base_model = VGG16(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
            features = base_model.predict(images)
            return features.reshape(features.shape[0], -1)
        
        else:
            # Fallback: flatten images
            return images.reshape(images.shape[0], -1)
    
    def train_brain_mri_model(self):
        """Train brain MRI tumor detection model"""
        self.logger.info("Training Brain MRI Tumor Detection Model...")
        
        try:
            brain_dir = os.path.join(self.datasets_dir, "brain-scans")
            
            if not os.path.exists(brain_dir):
                raise FileNotFoundError("Brain scans dataset not found")
            
            # Check for different directory structures
            if os.path.exists(os.path.join(brain_dir, "brain_tumor_dataset")):
                brain_dir = os.path.join(brain_dir, "brain_tumor_dataset")
            
            self.logger.info(f"Loading brain MRI images from: {brain_dir}")
            
            if IMAGE_PROCESSING_AVAILABLE:
                # Load and preprocess images
                images, labels = self.load_and_preprocess_images(
                    brain_dir, 
                    target_size=(128, 128),  # Smaller size for faster training
                    max_images=500  # Limit for faster training
                )
                
                self.logger.info(f"Loaded {len(images)} brain MRI images")
                self.logger.info(f"Classes: {np.unique(labels)}")
                
                # Extract features
                self.logger.info("Extracting image features...")
                X = self.extract_image_features(images, method='traditional')
                
                # Encode labels
                label_encoder = LabelEncoder()
                y = label_encoder.fit_transform(labels)
                
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
                        n_estimators=100, 
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
                model_path = os.path.join(self.models_dir, "brain_mri_model.joblib")
                scaler_path = os.path.join(self.models_dir, "brain_mri_scaler.joblib")
                encoder_path = os.path.join(self.models_dir, "brain_mri_encoder.joblib")
                
                joblib.dump(best_model_info['model'], model_path)
                joblib.dump(scaler, scaler_path)
                joblib.dump(label_encoder, encoder_path)
                
                # Save metadata
                metadata = {
                    'model_type': 'brain_mri_tumor_detection',
                    'best_algorithm': best_model_name,
                    'train_accuracy': best_model_info['train_accuracy'],
                    'test_accuracy': best_model_info['test_accuracy'],
                    'classes': list(label_encoder.classes_),
                    'image_count': len(images),
                    'feature_count': X.shape[1],
                    'trained_at': datetime.now().isoformat(),
                    'model_path': model_path,
                    'scaler_path': scaler_path,
                    'encoder_path': encoder_path
                }
                
                with open(os.path.join(self.models_dir, "brain_mri_metadata.json"), 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                self.trained_models['brain_mri'] = metadata
                self.logger.info(f"Brain MRI model saved: {best_model_name} with {best_model_info['test_accuracy']:.4f} accuracy")
                
                return metadata
            
            else:
                self.logger.warning("Image processing not available - skipping brain MRI training")
                return {'error': 'Image processing libraries not available'}
                
        except Exception as e:
            self.logger.error(f"Brain MRI training failed: {str(e)}")
            raise
    
    def train_ecg_signal_model(self):
        """Train ECG signal classification model (enhanced)"""
        self.logger.info("Training Enhanced ECG Signal Classification Model...")
        
        try:
            # Load all ECG datasets
            ecg_files = [
                ("mitbih_train.csv", "mitbih_test.csv"),
                ("ptbdb_normal.csv", "ptbdb_abnormal.csv")
            ]
            
            datasets_loaded = []
            
            for train_file, test_file in ecg_files:
                train_path = os.path.join(self.datasets_dir, "ecg-heartbeat", train_file)
                test_path = os.path.join(self.datasets_dir, "ecg-heartbeat", test_file)
                
                if os.path.exists(train_path):
                    if train_file == "mitbih_train.csv" and os.path.exists(test_path):
                        # MIT-BIH dataset with separate train/test
                        train_data = pd.read_csv(train_path, header=None)
                        test_data = pd.read_csv(test_path, header=None)
                        
                        # Sample for faster training
                        if len(train_data) > 10000:
                            train_data = train_data.sample(n=10000, random_state=42)
                        if len(test_data) > 5000:
                            test_data = test_data.sample(n=5000, random_state=42)
                        
                        datasets_loaded.append(('mitbih', train_data, test_data))
                        
                    elif train_file == "ptbdb_normal.csv" and os.path.exists(test_path):
                        # PTB database - combine normal and abnormal
                        normal_data = pd.read_csv(train_path, header=None)
                        abnormal_data = pd.read_csv(test_path, header=None)
                        
                        # Add labels
                        normal_data['label'] = 0  # Normal
                        abnormal_data['label'] = 1  # Abnormal
                        
                        # Combine and split
                        combined_data = pd.concat([normal_data, abnormal_data], ignore_index=True)
                        train_data, test_data = train_test_split(
                            combined_data, test_size=0.2, random_state=42, stratify=combined_data['label']
                        )
                        
                        datasets_loaded.append(('ptbdb', train_data, test_data))
            
            if not datasets_loaded:
                raise FileNotFoundError("No ECG datasets found")
            
            all_results = {}
            
            for dataset_name, train_data, test_data in datasets_loaded:
                self.logger.info(f"Training on {dataset_name} dataset...")
                
                if dataset_name == 'mitbih':
                    # MIT-BIH: features are all columns except last (label)
                    X_train = train_data.iloc[:, :-1].values
                    y_train = train_data.iloc[:, -1].values
                    X_test = test_data.iloc[:, :-1].values
                    y_test = test_data.iloc[:, -1].values
                else:
                    # PTB: features are all columns except 'label'
                    X_train = train_data.drop('label', axis=1).values
                    y_train = train_data['label'].values
                    X_test = test_data.drop('label', axis=1).values
                    y_test = test_data['label'].values
                
                # Scale features
                scaler = StandardScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                
                # Train models
                models = {
                    'random_forest': RandomForestClassifier(
                        n_estimators=100, 
                        random_state=42, 
                        n_jobs=-1
                    ),
                    'logistic_regression': LogisticRegression(
                        random_state=42, 
                        max_iter=1000
                    )
                }
                
                dataset_results = {}
                for name, model in models.items():
                    self.logger.info(f"Training {name} on {dataset_name}...")
                    model.fit(X_train_scaled, y_train)
                    
                    train_score = model.score(X_train_scaled, y_train)
                    test_score = model.score(X_test_scaled, y_test)
                    
                    dataset_results[name] = {
                        'model': model,
                        'train_accuracy': train_score,
                        'test_accuracy': test_score,
                        'scaler': scaler
                    }
                    
                    self.logger.info(f"{dataset_name} {name}: Train={train_score:.4f}, Test={test_score:.4f}")
                
                # Select best model for this dataset
                best_model_name = max(dataset_results.keys(), key=lambda k: dataset_results[k]['test_accuracy'])
                best_model_info = dataset_results[best_model_name]
                
                # Save model
                model_path = os.path.join(self.models_dir, f"ecg_{dataset_name}_model.joblib")
                scaler_path = os.path.join(self.models_dir, f"ecg_{dataset_name}_scaler.joblib")
                
                joblib.dump(best_model_info['model'], model_path)
                joblib.dump(best_model_info['scaler'], scaler_path)
                
                # Create class labels based on dataset
                if dataset_name == 'mitbih':
                    class_labels = {
                        0: 'Normal heartbeat',
                        1: 'Supraventricular premature',
                        2: 'Premature ventricular contraction',
                        3: 'Fusion of ventricular and normal',
                        4: 'Unclassifiable beat'
                    }
                else:
                    class_labels = {
                        0: 'Normal ECG',
                        1: 'Abnormal ECG'
                    }
                
                # Save metadata
                metadata = {
                    'model_type': f'ecg_{dataset_name}_classification',
                    'dataset': dataset_name,
                    'best_algorithm': best_model_name,
                    'train_accuracy': best_model_info['train_accuracy'],
                    'test_accuracy': best_model_info['test_accuracy'],
                    'feature_count': X_train.shape[1],
                    'training_samples': len(X_train),
                    'class_labels': class_labels,
                    'trained_at': datetime.now().isoformat(),
                    'model_path': model_path,
                    'scaler_path': scaler_path
                }
                
                with open(os.path.join(self.models_dir, f"ecg_{dataset_name}_metadata.json"), 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                all_results[dataset_name] = metadata
                self.trained_models[f'ecg_{dataset_name}'] = metadata
                
                self.logger.info(f"✅ ECG {dataset_name} model saved: {best_model_name}")
            
            return all_results
            
        except Exception as e:
            self.logger.error(f"ECG training failed: {str(e)}")
            raise
    
    def train_all_medical_images(self):
        """Train models on all available medical image datasets"""
        self.logger.info("Starting comprehensive medical image training...")
        
        start_time = datetime.now()
        training_results = {}
        
        # Train brain MRI model
        try:
            brain_result = self.train_brain_mri_model()
            training_results['brain_mri'] = brain_result
        except Exception as e:
            self.logger.error(f"Brain MRI training failed: {e}")
            training_results['brain_mri'] = {'error': str(e)}
        
        # Train enhanced ECG models
        try:
            ecg_results = self.train_ecg_signal_model()
            training_results.update(ecg_results)
        except Exception as e:
            self.logger.error(f"ECG training failed: {e}")
            training_results['ecg'] = {'error': str(e)}
        
        # Calculate total time
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        
        # Save overall summary
        summary = {
            'training_completed_at': end_time.isoformat(),
            'total_training_time_seconds': total_time,
            'total_training_time_minutes': round(total_time / 60, 2),
            'models_trained': len([k for k, v in training_results.items() if 'error' not in v]),
            'models_failed': len([k for k, v in training_results.items() if 'error' in v]),
            'image_processing_available': IMAGE_PROCESSING_AVAILABLE,
            'deep_learning_available': DEEP_LEARNING_AVAILABLE,
            'results': training_results
        }
        
        with open(os.path.join(self.models_dir, "medical_image_training_summary.json"), 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"🎉 Medical image training completed in {summary['total_training_time_minutes']:.2f} minutes!")
        self.logger.info(f"✅ Models trained: {summary['models_trained']}")
        self.logger.info(f"❌ Models failed: {summary['models_failed']}")
        
        return summary

def main():
    """Main training function"""
    print("Comprehensive Medical Image Training Pipeline")
    print("=" * 60)
    
    # Check prerequisites
    if not IMAGE_PROCESSING_AVAILABLE:
        print("⚠️  Warning: Image processing libraries not available")
        print("   Install with: pip install pillow opencv-python matplotlib")
        print("   Continuing with available methods...")
    
    # Initialize trainer
    trainer = MedicalImageTrainer()
    
    # Run training
    results = trainer.train_all_medical_images()
    
    print("\n" + "=" * 60)
    print("📊 Medical Image Training Summary:")
    print(f"⏱️  Total time: {results['total_training_time_minutes']:.2f} minutes")
    print(f"✅ Successful models: {results['models_trained']}")
    print(f"❌ Failed models: {results['models_failed']}")
    print(f"📁 Models saved to: trained_models/")
    
    return results

if __name__ == "__main__":
    main()