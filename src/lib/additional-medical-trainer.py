#!/usr/bin/env python3
"""
Additional Medical Dataset Trainer
Trains models on remaining datasets: breast cancer, stroke, chest X-ray, PubMedQA, medical reports
"""

import os
import json
import numpy as np
import pandas as pd
import logging
import joblib
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

# PyTorch imports
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import Dataset, DataLoader, TensorDataset
    import torchvision
    import torchvision.transforms as transforms
    import torchvision.models as models
    from torch.utils.data import ConcatDataset, WeightedRandomSampler
    from torch.nn import functional as F
    TORCH_AVAILABLE = True
    
    # Check if CUDA is available
    CUDA_AVAILABLE = torch.cuda.is_available()
    DEVICE = torch.device('cuda' if CUDA_AVAILABLE else 'cpu')
except ImportError:
    TORCH_AVAILABLE = False
    CUDA_AVAILABLE = False
    DEVICE = None

try:
    from PIL import Image
    IMAGE_AVAILABLE = True
except ImportError:
    IMAGE_AVAILABLE = False

# Custom PyTorch dataset for images
class ImageFolderDataset(Dataset):
    """Custom Dataset class for loading images with labels"""
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        
        # Get all image files and their labels
        self.classes = sorted(os.listdir(root_dir))
        self.class_to_idx = {cls: idx for idx, cls in enumerate(self.classes)}
        
        self.images = []
        self.labels = []
        for class_name in self.classes:
            class_dir = os.path.join(root_dir, class_name)
            if os.path.isdir(class_dir):
                for img_name in os.listdir(class_dir):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg')):
                        self.images.append(os.path.join(class_dir, img_name))
                        self.labels.append(self.class_to_idx[class_name])
                        
    def __len__(self):
        return len(self.images)
        
    def __getitem__(self, idx):
        # Load and transform image
        image_path = self.images[idx]
        image = Image.open(image_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, self.labels[idx]

class AdditionalMedicalTrainer:
    def __init__(self):
        self.datasets_dir = "datasets"
        self.models_dir = "trained_models"
        os.makedirs(self.models_dir, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{self.models_dir}/additional_training.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.trained_models = {}
        
        self.logger.info("Deep Learning Medical Training System initialized")
        self.logger.info(f"PyTorch available: {TORCH_AVAILABLE}")
        self.logger.info(f"CUDA available: {CUDA_AVAILABLE}")
        self.logger.info(f"Image processing available: {IMAGE_AVAILABLE}")
        if TORCH_AVAILABLE:
            self.logger.info(f"Using device: {DEVICE}")
    
    def train_breast_cancer_model(self):
        """Train breast cancer classification model"""
        self.logger.info("Training Breast Cancer Model...")
        
        try:
            data_path = os.path.join(self.datasets_dir, "breast-cancer", "data.csv")
            df = pd.read_csv(data_path)
            self.logger.info(f"Loaded breast cancer data: {df.shape}")
            
            # Use diagnosis column as target, drop id and empty columns
            target_col = 'diagnosis'
            cols_to_drop = ['id', target_col]
            
            # Remove empty columns
            for col in df.columns:
                if df[col].isna().all() or col.startswith('Unnamed'):
                    cols_to_drop.append(col)
            
            X = df.drop(columns=[col for col in cols_to_drop if col in df.columns])
            y = df[target_col]
            
            # Remove any rows with missing target values
            mask = y.notna()
            X = X[mask]
            y = y[mask]
            
            # Handle non-numeric columns
            for col in X.columns:
                if X[col].dtype == 'object':
                    X[col] = pd.get_dummies(X[col], drop_first=True).iloc[:, 0]
            
            X = X.fillna(X.mean())
            
            # Encode target if needed
            if y.dtype == 'object':
                label_encoder = LabelEncoder()
                y = label_encoder.fit_transform(y)
                class_names = {i: name for i, name in enumerate(label_encoder.classes_)}
            else:
                class_names = {0: 'Benign', 1: 'Malignant'}
            
            # Train model
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
            model.fit(X_train_scaled, y_train)
            
            train_score = model.score(X_train_scaled, y_train)
            test_score = model.score(X_test_scaled, y_test)
            
            # Save model
            joblib.dump(model, os.path.join(self.models_dir, "breast_cancer_model.joblib"))
            joblib.dump(scaler, os.path.join(self.models_dir, "breast_cancer_scaler.joblib"))
            
            metadata = {
                'model_type': 'breast_cancer_classification',
                'algorithm': 'random_forest',
                'train_accuracy': train_score,
                'test_accuracy': test_score,
                'classes': class_names,
                'sample_count': len(X),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat()
            }
            
            with open(os.path.join(self.models_dir, "breast_cancer_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
                self.logger.info(f"Breast cancer model completed with accuracy: {test_score:.4f}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Breast cancer training failed: {e}")
            return None
    
    def train_stroke_model(self):
        """Train stroke risk prediction model"""
        self.logger.info("Training Stroke Model...")
        
        try:
            data_path = os.path.join(self.datasets_dir, "stroke", "healthcare-dataset-stroke-data.csv")
            df = pd.read_csv(data_path)
            
            target_col = 'stroke'
            X = df.drop(columns=[target_col])
            y = df[target_col]
            
            # Handle categorical columns
            categorical_cols = X.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                X = pd.get_dummies(X, columns=[col], drop_first=True)
            
            X = X.fillna(X.mean())
            
            # Train model
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, class_weight='balanced')
            model.fit(X_train_scaled, y_train)
            
            test_score = model.score(X_test_scaled, y_test)
            
            # Save model
            joblib.dump(model, os.path.join(self.models_dir, "stroke_model.joblib"))
            joblib.dump(scaler, os.path.join(self.models_dir, "stroke_scaler.joblib"))
            
            metadata = {
                'model_type': 'stroke_risk_prediction',
                'algorithm': 'random_forest',
                'test_accuracy': test_score,
                'classes': {0: 'No Stroke Risk', 1: 'Stroke Risk'},
                'sample_count': len(X),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat()
            }
            
            with open(os.path.join(self.models_dir, "stroke_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
                self.logger.info(f"Stroke model completed with accuracy: {test_score:.4f}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Stroke training failed: {e}")
            return None
    
    def train_chest_xray_model(self):
        """Train chest X-ray pneumonia detection model"""
        self.logger.info("Training Chest X-ray Model...")
        
        try:
            if not IMAGE_AVAILABLE:
                self.logger.warning("PIL not available - skipping chest X-ray")
                return None
            
            train_dir = os.path.join(self.datasets_dir, "chest_xray", "chest_xray", "train")
            normal_dir = os.path.join(train_dir, "NORMAL")
            pneumonia_dir = os.path.join(train_dir, "PNEUMONIA")
            
            images = []
            labels = []
            
            # Load normal images (limited)
            normal_files = [f for f in os.listdir(normal_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            for file in normal_files[:100]:
                try:
                    img = Image.open(os.path.join(normal_dir, file))
                    img = img.convert('L').resize((64, 64))
                    images.append(np.array(img).flatten() / 255.0)
                    labels.append(0)
                except:
                    continue
            
            # Load pneumonia images (limited)
            pneumonia_files = [f for f in os.listdir(pneumonia_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            for file in pneumonia_files[:100]:
                try:
                    img = Image.open(os.path.join(pneumonia_dir, file))
                    img = img.convert('L').resize((64, 64))
                    images.append(np.array(img).flatten() / 255.0)
                    labels.append(1)
                except:
                    continue
            
            X = np.array(images)
            y = np.array(labels)
            
            # Train model
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
            model.fit(X_train_scaled, y_train)
            
            test_score = model.score(X_test_scaled, y_test)
            
            # Save model
            joblib.dump(model, os.path.join(self.models_dir, "chest_xray_model.joblib"))
            joblib.dump(scaler, os.path.join(self.models_dir, "chest_xray_scaler.joblib"))
            
            metadata = {
                'model_type': 'chest_xray_pneumonia_detection',
                'algorithm': 'random_forest',
                'test_accuracy': test_score,
                'classes': {0: 'Normal', 1: 'Pneumonia'},
                'sample_count': len(X),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat()
            }
            
            with open(os.path.join(self.models_dir, "chest_xray_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
                self.logger.info(f"Chest X-ray model completed with accuracy: {test_score:.4f}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Chest X-ray training failed: {e}")
            return None
    
    def train_pubmedqa_model(self):
        """Train PubMedQA model"""
        self.logger.info("Training PubMedQA Model...")
        
        try:
            data_path = os.path.join(self.datasets_dir, "pubmedqa", "ori_pqal.json")
            
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            questions = []
            answers = []
            
            count = 0
            for qid, item in data.items():
                if count >= 500:  # Limit for speed
                    break
                
                question = item.get('QUESTION', '')
                answer = item.get('final_decision', '')
                context = ' '.join(item.get('CONTEXTS', []))
                
                if question and answer:
                    questions.append(question + ' ' + context)
                    answers.append(answer.lower())
                    count += 1
            
            # Vectorize and train
            vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
            X = vectorizer.fit_transform(questions)
            
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(answers)
            
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
            model.fit(X_train, y_train)
            
            test_score = model.score(X_test, y_test)
            
            # Save model
            joblib.dump(model, os.path.join(self.models_dir, "pubmedqa_model.joblib"))
            joblib.dump(vectorizer, os.path.join(self.models_dir, "pubmedqa_vectorizer.joblib"))
            joblib.dump(label_encoder, os.path.join(self.models_dir, "pubmedqa_encoder.joblib"))
            
            metadata = {
                'model_type': 'pubmedqa_question_answering',
                'algorithm': 'random_forest',
                'test_accuracy': test_score,
                'classes': {i: name for i, name in enumerate(label_encoder.classes_)},
                'sample_count': len(questions),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat()
            }
            
            with open(os.path.join(self.models_dir, "pubmedqa_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
                self.logger.info(f"PubMedQA model completed with accuracy: {test_score:.4f}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"PubMedQA training failed: {e}")
            return None
    
    def train_medical_reports_model(self):
        """Train medical reports model"""
        self.logger.info("Training Medical Reports Model...")
        
        try:
            data_path = os.path.join(self.datasets_dir, "medical-reports", "mtsamples.csv")
            df = pd.read_csv(data_path)
            
            # Find text and label columns
            text_col = None
            label_col = None
            
            for col in ['description', 'transcription', 'text']:
                if col in df.columns:
                    text_col = col
                    break
            
            for col in ['medical_specialty', 'specialty', 'category']:
                if col in df.columns:
                    label_col = col
                    break
            
            if text_col is None:
                text_col = df.columns[0]
            if label_col is None:
                label_col = df.columns[1]
            
            # Clean and limit data
            df = df.dropna(subset=[text_col, label_col])
            df = df[df[text_col].str.len() > 50]
            
            if len(df) > 1000:
                df = df.sample(n=1000, random_state=42)
            
            texts = df[text_col].values
            labels = df[label_col].values
            
            # Vectorize and train
            vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
            X = vectorizer.fit_transform(texts)
            
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(labels)
            
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
            
            model = RandomForestClassifier(n_estimators=50, random_state=42, n_jobs=-1)
            model.fit(X_train, y_train)
            
            test_score = model.score(X_test, y_test)
            
            # Save model
            joblib.dump(model, os.path.join(self.models_dir, "medical_reports_model.joblib"))
            joblib.dump(vectorizer, os.path.join(self.models_dir, "medical_reports_vectorizer.joblib"))
            joblib.dump(label_encoder, os.path.join(self.models_dir, "medical_reports_encoder.joblib"))
            
            metadata = {
                'model_type': 'medical_reports_classification',
                'algorithm': 'random_forest',
                'test_accuracy': test_score,
                'classes': {i: name for i, name in enumerate(label_encoder.classes_)},
                'sample_count': len(texts),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat()
            }
            
            with open(os.path.join(self.models_dir, "medical_reports_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
                self.logger.info(f"Medical reports model completed with accuracy: {test_score:.4f}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Medical reports training failed: {e}")
            return None
    
    def train_all_models(self):
        """Train all additional models"""
        self.logger.info("Starting additional medical model training...")
        
        results = {}
        
        # Train all models
        models = [
            ('breast_cancer', self.train_breast_cancer_model),
            ('stroke', self.train_stroke_model),
            ('chest_xray', self.train_chest_xray_model),
            ('pubmedqa', self.train_pubmedqa_model),
            ('medical_reports', self.train_medical_reports_model)
        ]
        
        for name, train_func in models:
            result = train_func()
            if result:
                results[name] = result
                self.logger.info(f"Training completed for {name}")
            else:
                self.logger.warning(f"Training failed for {name}")
        
        # Save summary
        summary = {
            'training_completed_at': datetime.now().isoformat(),
            'models_trained': len(results),
            'models': results
        }
        
        with open(os.path.join(self.models_dir, "additional_training_summary.json"), 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Training completed! {len(results)} models trained")
        return results

def main():
    print("Additional Medical Training Pipeline")
    print("=" * 50)
    
    trainer = AdditionalMedicalTrainer()
    results = trainer.train_all_models()
    
    print("\nTraining Results:")
    for model_name, metadata in results.items():
        print(f"{model_name}: {metadata['algorithm']} - {metadata['test_accuracy']:.4f} accuracy")

if __name__ == "__main__":
    main()