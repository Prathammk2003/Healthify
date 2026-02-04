#!/usr/bin/env python3
"""
Deep Learning Medical Dataset Trainer
Trains neural network models on medical datasets using PyTorch:
- Tabular datasets (breast cancer, stroke) → feed-forward neural networks
- Text datasets (PubMedQA, medical reports) → embedding + LSTM/GRU or dense networks
- Image datasets (chest X-ray) → CNN with ResNet backbone
"""

import os
import json
import numpy as np
import pandas as pd
import logging
import pickle
import re
import copy
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer

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
    
    # Check if CUDA is available and force CUDA if available
    CUDA_AVAILABLE = torch.cuda.is_available()
    if CUDA_AVAILABLE:
        # GPU memory management
        torch.cuda.empty_cache()
        torch.cuda.memory.set_per_process_memory_fraction(0.8)  # Use 80% of available GPU memory
        
        # Device setup
        DEVICE = torch.device('cuda:0')
        torch.set_default_device(DEVICE)
        torch.set_default_dtype(torch.float32)
        
        # CUDA optimizations
        torch.backends.cudnn.benchmark = True
        torch.backends.cudnn.enabled = True
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        
        # Enable automatic mixed precision using new syntax
        torch.amp.autocast('cuda', enabled=True)
    else:
        DEVICE = torch.device('cpu')
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

class DeepLearningMedicalTrainer:
    def __init__(self):
        """Initialize the deep learning medical trainer"""
        self.datasets_dir = "datasets"
        self.models_dir = "trained_models"
        os.makedirs(self.models_dir, exist_ok=True)
        self.trained_models = {}  # Initialize trained_models dictionary
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{self.models_dir}/deep_learning_training.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        self.check_dependencies()
    
    def check_dependencies(self):
        """Check if required dependencies are available"""
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is required but not installed. Please install PyTorch.")
        if not IMAGE_AVAILABLE:
            raise ImportError("PIL is required but not installed. Please install pillow.")
        self.logger.info(f"Using device: {DEVICE}")
        if CUDA_AVAILABLE:
            self.logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            self.logger.info(f"GPU Memory Available: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")

    def save_model(self, model, optimizer, scheduler, metadata, extra_data=None):
        """Save PyTorch model with its metadata"""
        model_path = os.path.join(self.models_dir, f"{metadata['model_type']}_model.pt")
        
        # Prepare checkpoint
        checkpoint = {
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict() if optimizer else None,
            'scheduler_state_dict': scheduler.state_dict() if scheduler else None
        }
        
        if extra_data:
            checkpoint.update(extra_data)
            
        # Save model checkpoint
        torch.save(checkpoint, model_path)
        
        # Update metadata with model path
        metadata['model_path'] = model_path
        metadata['device'] = str(DEVICE)
        metadata['trained_at'] = datetime.now().isoformat()
        
        # Save metadata
        self.save_metadata(metadata)
        
        return model_path
        
    def load_model(self, model_type, model_class):
        """Load a PyTorch model with its metadata"""
        metadata_path = os.path.join(self.models_dir, f"{model_type}_metadata.json")
        
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
        except FileNotFoundError:
            raise ValueError(f"No metadata found for model type: {model_type}")
            
        model_path = metadata['model_path']
        if not os.path.exists(model_path):
            raise ValueError(f"Model file not found: {model_path}")
            
        # Initialize model
        model = model_class()
        model = model.to(DEVICE)
        
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location=DEVICE)
        model.load_state_dict(checkpoint['model_state_dict'])
        
        return model, metadata, checkpoint
        
    def save_metadata(self, metadata):
        """Save model metadata to a JSON file"""
        metadata_path = os.path.join(
            self.models_dir, 
            f"{metadata['model_type']}_metadata.json"
        )
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=4)
        self.logger = logging.getLogger(__name__)
        self.trained_models = {}
        
        self.logger.info("Deep Learning Medical Training System initialized")
        self.logger.info(f"PyTorch available: {TORCH_AVAILABLE}")
        self.logger.info(f"CUDA GPU available: {CUDA_AVAILABLE}")
        self.logger.info(f"Device being used: {DEVICE}")
        self.logger.info(f"Image processing available: {IMAGE_AVAILABLE}")
    
    class BreastCancerNet(nn.Module):
        def __init__(self, input_size):
            super().__init__()
            self.model = nn.Sequential(
                nn.Linear(input_size, 128),
                nn.ReLU(),
                nn.BatchNorm1d(128),
                nn.Dropout(0.3),
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.BatchNorm1d(64),
                nn.Dropout(0.3),
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(32, 1),
                nn.Sigmoid()
            )
            
        def forward(self, x):
            return self.model(x)

    def train_breast_cancer_model(self):
        """Train breast cancer classification model with PyTorch Neural Network"""
        self.logger.info("Training Breast Cancer Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
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
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Convert data to PyTorch tensors
            X_train_tensor = torch.FloatTensor(X_train_scaled).to(DEVICE)
            y_train_tensor = torch.FloatTensor(y_train).to(DEVICE)
            X_test_tensor = torch.FloatTensor(X_test_scaled).to(DEVICE)
            y_test_tensor = torch.FloatTensor(y_test).to(DEVICE)
            
            # Create data loaders with smaller batch size
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor.view(-1, 1))
            test_dataset = TensorDataset(X_test_tensor, y_test_tensor.view(-1, 1))
            train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
            test_loader = DataLoader(test_dataset, batch_size=16)
            
            # Initialize model
            model = self.BreastCancerNet(input_size=X_train_scaled.shape[1]).to(DEVICE)
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            criterion = nn.BCELoss()
            
            # Training loop
            best_val_acc = 0
            patience = 15
            no_improve = 0
            epochs = 100
            
            for epoch in range(epochs):
                model.train()
                for batch_X, batch_y in train_loader:
                    optimizer.zero_grad()
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()
                
                # Validation
                model.eval()
                correct = 0
                total = 0
                val_loss = 0
                with torch.no_grad():
                    for batch_X, batch_y in test_loader:
                        outputs = model(batch_X)
                        val_loss += criterion(outputs, batch_y).item()
                        predicted = (outputs > 0.5).float()
                        total += batch_y.size(0)
                        correct += (predicted == batch_y).sum().item()
                
                val_acc = correct / total
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_state = model.state_dict()
                    no_improve = 0
                else:
                    no_improve += 1
                
                if no_improve >= patience:
                    self.logger.info(f"Early stopping at epoch {epoch}")
                    break
            
            # Load best model
            model.load_state_dict(best_state)
            
            # Final evaluation
            model.eval()
            correct = 0
            total = 0
            test_loss = 0
            with torch.no_grad():
                for batch_X, batch_y in test_loader:
                    outputs = model(batch_X)
                    test_loss += criterion(outputs, batch_y).item()
                    predicted = (outputs > 0.5).float()
                    total += batch_y.size(0)
                    correct += (predicted == batch_y).sum().item()
            
            test_acc = correct / total
            
            # Save model
            model_path = os.path.join(self.models_dir, "breast_cancer_nn.pt")
            torch.save({
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'input_size': X_train_scaled.shape[1]
            }, model_path)
            
            # Save scaler for inference
            scaler_path = os.path.join(self.models_dir, "breast_cancer_scaler.pkl")
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
            
            metadata = {
                'model_type': 'breast_cancer_classification',
                'algorithm': 'pytorch_neural_network',
                'test_accuracy': float(test_acc),
                'classes': class_names,
                'sample_count': len(X),
                'feature_count': X.shape[1],
                'feature_names': list(X.columns),
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'scaler_path': scaler_path,
                'device': str(DEVICE)
            }
            
            with open(os.path.join(self.models_dir, "breast_cancer_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['breast_cancer'] = metadata
            self.logger.info(f"Breast cancer neural network completed with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Breast cancer neural network training failed: {e}")
            return None
    
    class StrokeNet(nn.Module):
        def __init__(self, input_size):
            super().__init__()
            self.model = nn.Sequential(
                nn.Linear(input_size, 256),
                nn.ReLU(),
                nn.BatchNorm1d(256),
                nn.Dropout(0.4),
                nn.Linear(256, 128),
                nn.ReLU(),
                nn.BatchNorm1d(128),
                nn.Dropout(0.3),
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(64, 1),
                nn.Sigmoid()
            )
            if CUDA_AVAILABLE:
                self.model = self.model.cuda()
            
        def forward(self, x):
            return self.model(x)

    def train_stroke_model(self):
        """Train stroke risk prediction model with PyTorch Neural Network"""
        self.logger.info("Training Stroke Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
            data_path = os.path.join(self.datasets_dir, "stroke", "healthcare-dataset-stroke-data.csv")
            df = pd.read_csv(data_path)
            self.logger.info(f"Loaded stroke data: {df.shape}")
            
            target_col = 'stroke'
            X = df.drop(columns=[target_col])
            y = df[target_col]
            
            # Handle categorical columns
            categorical_cols = X.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                X = pd.get_dummies(X, columns=[col], drop_first=True)
            
            X = X.fillna(X.mean())
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Convert data to PyTorch tensors with memory pinning for faster access
            X_train_tensor = torch.tensor(X_train_scaled, dtype=torch.float32).share_memory_()
            y_train_tensor = torch.tensor(y_train.values, dtype=torch.float32).share_memory_()
            X_test_tensor = torch.tensor(X_test_scaled, dtype=torch.float32).share_memory_()
            y_test_tensor = torch.tensor(y_test.values, dtype=torch.float32).share_memory_()
            
            # Calculate class weights for imbalanced data
            class_counts = np.bincount(y_train.astype(int))
            total_samples = len(y_train)
            class_weights = torch.cuda.FloatTensor([total_samples / (2 * count) for count in class_counts]) if CUDA_AVAILABLE else torch.FloatTensor([total_samples / (2 * count) for count in class_counts])
            sample_weights = torch.cuda.FloatTensor([class_weights[t] for t in y_train.astype(int)]) if CUDA_AVAILABLE else torch.FloatTensor([class_weights[t] for t in y_train.astype(int)])
            sampler = torch.utils.data.WeightedRandomSampler(
                weights=sample_weights,
                num_samples=len(sample_weights),
                replacement=True
            )
            
            # Create data loaders with CUDA pinning
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor.view(-1, 1))
            test_dataset = TensorDataset(X_test_tensor, y_test_tensor.view(-1, 1))
            train_loader = DataLoader(
                train_dataset, 
                batch_size=64,  # Larger batch size for CPU
                sampler=sampler,
                pin_memory=False,
                num_workers=4,  # Use 4 workers for data loading
                persistent_workers=True,  # Keep workers alive between batches
                prefetch_factor=2  # Prefetch 2 batches per worker
            )
            test_loader = DataLoader(
                test_dataset, 
                batch_size=64,  # Larger batch size for CPU
                pin_memory=False,
                num_workers=4,  # Use 4 workers for data loading
                persistent_workers=True,  # Keep workers alive between batches
                prefetch_factor=2  # Prefetch 2 batches per worker
            )
            
            # Initialize model
            model = self.StrokeNet(input_size=X_train_scaled.shape[1]).to(DEVICE)
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            criterion = nn.BCELoss()
            
            # Training loop with early stopping and learning rate scheduling
            best_val_acc = 0
            patience = 15
            no_improve = 0
            epochs = 100
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=10)
            
            for epoch in range(epochs):
                model.train()
                for batch_X, batch_y in train_loader:
                    optimizer.zero_grad()
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    loss.backward()
                    optimizer.step()
                
                # Validation
                model.eval()
                correct = 0
                total = 0
                val_loss = 0
                with torch.no_grad():
                    for batch_X, batch_y in test_loader:
                        outputs = model(batch_X)
                        val_loss += criterion(outputs, batch_y).item()
                        predicted = (outputs > 0.5).float()
                        total += batch_y.size(0)
                        correct += (predicted == batch_y).sum().item()
                
                val_acc = correct / total
                scheduler.step(val_acc)  # Update learning rate based on validation accuracy
                
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_state = model.state_dict()
                    no_improve = 0
                else:
                    no_improve += 1
                
                if no_improve >= patience:
                    self.logger.info(f"Early stopping at epoch {epoch}")
                    break
            
            # Load best model
            model.load_state_dict(best_state)
            
            # Final evaluation
            model.eval()
            correct = 0
            total = 0
            test_loss = 0
            with torch.no_grad():
                for batch_X, batch_y in test_loader:
                    outputs = model(batch_X)
                    test_loss += criterion(outputs, batch_y).item()
                    predicted = (outputs > 0.5).float()
                    total += batch_y.size(0)
                    correct += (predicted == batch_y).sum().item()
            
            test_acc = correct / total
            
            # Save model
            model_path = os.path.join(self.models_dir, "stroke_nn.pt")
            torch.save({
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'input_size': X_train_scaled.shape[1],
                'class_weights': class_weights
            }, model_path)
            
            # Save scaler for inference
            scaler_path = os.path.join(self.models_dir, "stroke_scaler.pkl")
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
            
            metadata = {
                'model_type': 'stroke_risk_prediction',
                'algorithm': 'pytorch_neural_network',
                'test_accuracy': float(test_acc),
                'classes': {0: 'No Stroke Risk', 1: 'Stroke Risk'},
                'sample_count': len(X),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'scaler_path': scaler_path,
                'device': str(DEVICE)
            }
            
            with open(os.path.join(self.models_dir, "stroke_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['stroke'] = metadata
            self.logger.info(f"Stroke neural network completed with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Stroke neural network training failed: {str(e)}")
            self.logger.error(f"Error details: {type(e).__name__}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    class ChestXrayCNN(nn.Module):
        def __init__(self):
            super().__init__()
            # Use ResNet18 as backbone with pretrained weights
            self.backbone = torchvision.models.resnet18(weights='IMAGENET1K_V1')
            
            # Replace the last layer with our binary classifier
            num_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Linear(num_features, 512),
                nn.ReLU(),
                nn.BatchNorm1d(512),
                nn.Dropout(0.5),
                nn.Linear(512, 256),
                nn.ReLU(),
                nn.BatchNorm1d(256),
                nn.Dropout(0.3),
                nn.Linear(256, 1),
                nn.Sigmoid()
            )
        
        def forward(self, x):
            return self.backbone(x)
    
    def train_chest_xray_model(self):
        """Train chest X-ray pneumonia detection model with CNN"""
        self.logger.info("Training Chest X-ray CNN Model...")

        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train CNN")
                return None
            
            if not IMAGE_AVAILABLE:
                self.logger.error("PIL not available - cannot process images")
                return None
                
            if not IMAGE_AVAILABLE:
                self.logger.error("PIL not available - cannot process images")
                return None

            train_dir = os.path.join(self.datasets_dir, "chest_xray", "chest_xray", "train")
            val_dir = os.path.join(self.datasets_dir, "chest_xray", "chest_xray", "val")
            test_dir = os.path.join(self.datasets_dir, "chest_xray", "chest_xray", "test")

            # Check if directories exist
            if not os.path.exists(train_dir):
                self.logger.warning(f"Training directory not found: {train_dir}")
                return None

            # Define image transformations
            train_transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(40),
                transforms.RandomAffine(0, translate=(0.2, 0.2), scale=(0.8, 1.2), shear=20),
                transforms.ColorJitter(brightness=0.2, contrast=0.2),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # ImageNet stats
            ])
            
            eval_transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])

            # Create datasets
            train_dataset = torchvision.datasets.ImageFolder(train_dir, transform=train_transform)
            val_dataset = torchvision.datasets.ImageFolder(val_dir, transform=eval_transform)
            test_dataset = torchvision.datasets.ImageFolder(test_dir, transform=eval_transform)

            # Create data loaders
            train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=4)
            val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=4)
            test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=4)

            # Initialize model, optimizer, and criterion
            model = self.ChestXrayCNN().to(DEVICE)
            optimizer = optim.AdamW(model.parameters(), lr=0.0001, weight_decay=0.01)
            criterion = nn.BCELoss()
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=5)
            
            # Training loop
            epochs = 25
            best_val_acc = 0
            patience = 10
            no_improve = 0
            
            for epoch in range(epochs):
                # Training phase
                model.train()
                train_loss = 0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    inputs = inputs.to(DEVICE)
                    labels = labels.float().to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs.squeeze(), labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    predicted = (outputs.squeeze() > 0.5).float()
                    train_total += labels.size(0)
                    train_correct += (predicted == labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation phase
                model.eval()
                val_loss = 0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in val_loader:
                        inputs = inputs.to(DEVICE)
                        labels = labels.float().to(DEVICE)
                        
                        outputs = model(inputs)
                        loss = criterion(outputs.squeeze(), labels)
                        
                        val_loss += loss.item()
                        predicted = (outputs.squeeze() > 0.5).float()
                        val_total += labels.size(0)
                        val_correct += (predicted == labels).sum().item()
                
                val_acc = val_correct / val_total
                scheduler.step(val_acc)
                
                # Early stopping check
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_state = model.state_dict()
                    no_improve = 0
                else:
                    no_improve += 1
                
                if no_improve >= patience:
                    self.logger.info(f"Early stopping at epoch {epoch}")
                    break
                
                self.logger.info(f"Epoch {epoch}: Train Acc = {train_acc:.4f}, Val Acc = {val_acc:.4f}")
            
            # Load best model for testing
            model.load_state_dict(best_state)
            
            # Test phase
            model.eval()
            test_loss = 0
            test_correct = 0
            test_total = 0
            
            with torch.no_grad():
                for inputs, labels in test_loader:
                    inputs = inputs.to(DEVICE)
                    labels = labels.float().to(DEVICE)
                    
                    outputs = model(inputs)
                    loss = criterion(outputs.squeeze(), labels)
                    
                    test_loss += loss.item()
                    predicted = (outputs.squeeze() > 0.5).float()
                    test_total += labels.size(0)
                    test_correct += (predicted == labels).sum().item()
            
            test_acc = test_correct / test_total

            # Save model
            model_path = os.path.join(self.models_dir, "chest_xray_cnn.pt")
            torch.save({
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'class_to_idx': train_dataset.class_to_idx
            }, model_path)

            metadata = {
                'model_type': 'chest_xray_pneumonia_detection',
                'algorithm': 'pytorch_resnet_cnn',
                'test_accuracy': float(test_acc),
                'classes': {v: k for k, v in train_dataset.class_to_idx.items()},
                'image_size': (224, 224),
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'device': str(DEVICE)
            }

            with open(os.path.join(self.models_dir, "chest_xray_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)

            self.trained_models['chest_xray'] = metadata
            self.logger.info(f"Chest X-ray CNN completed with accuracy: {test_acc:.4f}")
            
            return metadata

        except Exception as e:
            self.logger.error(f"Chest X-ray CNN training failed: {e}")
            return None
    
    def train_pubmedqa_model(self):
        """Train PubMedQA model with Dense network using PyTorch"""
        self.logger.info("Training PubMedQA Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
            data_path = os.path.join(self.datasets_dir, "pubmedqa", "ori_pqal.json")
            
            if not os.path.exists(data_path):
                self.logger.warning(f"PubMedQA data not found: {data_path}")
                return None
            
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            questions = []
            answers = []
            
            # Use comprehensive data preparation
            for qid, item in data.items():
                question = item.get('QUESTION', '').strip()
                answer = item.get('final_decision', '').strip()
                contexts = item.get('CONTEXTS', [])
                
                # Enhanced context processing
                if contexts:
                    # Take most relevant context sentences
                    context = ' '.join(contexts[:5])  # Use first 5 sentences for relevance
                    # Clean and normalize context
                    context = re.sub(r'\s+', ' ', context)
                    context = context.strip()
                else:
                    context = ''
                
                # Combine question and context for better understanding
                combined_text = f"Question: {question} Context: {context}"
                
                if question and answer:
                    questions.append(question + ' ' + context)
                    answers.append(answer.lower())
            
            self.logger.info(f"Loaded {len(questions)} PubMedQA samples")
            
            if len(questions) == 0:
                self.logger.warning("No valid PubMedQA samples found")
                return None
            
            # Encode answers
            label_encoder = LabelEncoder()
            labels = label_encoder.fit_transform(answers)
            num_classes = len(label_encoder.classes_)
            
            # TF-IDF vectorization
            vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
            features = vectorizer.fit_transform(questions).toarray()
            
            # Convert to PyTorch tensors
            X = torch.FloatTensor(features).to(DEVICE)
            y = torch.LongTensor(labels).to(DEVICE)
            
            # Create dataset and split
            dataset = TensorDataset(X, y)
            train_size = int(0.8 * len(dataset))
            val_size = len(dataset) - train_size
            # Use CPU generator for dataset splitting
            generator = torch.Generator()
            generator.manual_seed(42)
            train_dataset, val_dataset = torch.utils.data.random_split(
                dataset, [train_size, val_size],
                generator=generator
            )
            
            # Create dataloaders
            train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
            val_loader = DataLoader(val_dataset, batch_size=32)
            
            # Define the model
            class PubMedQANet(nn.Module):
                def __init__(self, input_size, num_classes):
                    super().__init__()
                    self.network = nn.Sequential(
                        nn.Linear(input_size, 512),
                        nn.ReLU(),
                        nn.BatchNorm1d(512),
                        nn.Dropout(0.5),
                        nn.Linear(512, 256),
                        nn.ReLU(),
                        nn.BatchNorm1d(256),
                        nn.Dropout(0.4),
                        nn.Linear(256, 128),
                        nn.ReLU(),
                        nn.Dropout(0.3),
                        nn.Linear(128, num_classes)
                    )
                
                def forward(self, x):
                    return self.network(x)
                    
            # Initialize model, optimizer, and criterion
            model = PubMedQANet(X.shape[1], num_classes).to(DEVICE)
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='min', factor=0.5, patience=5
            )
            
            # Training loop
            best_val_loss = float('inf')
            best_val_acc = 0
            patience = 10
            no_improve = 0
            epochs = 50
            
            for epoch in range(epochs):
                # Training phase
                model.train()
                train_loss = 0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    _, predicted = outputs.max(1)
                    train_total += labels.size(0)
                    train_correct += predicted.eq(labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation phase
                model.eval()
                val_loss = 0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in val_loader:
                        outputs = model(inputs)
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        _, predicted = outputs.max(1)
                        val_total += labels.size(0)
                        val_correct += predicted.eq(labels).sum().item()
                
                val_acc = val_correct / val_total
                avg_val_loss = val_loss / len(val_loader)
                
                # Learning rate scheduling
                scheduler.step(avg_val_loss)
                
                # Early stopping check
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_state = model.state_dict()
                    no_improve = 0
                else:
                    no_improve += 1
                
                if no_improve >= patience:
                    self.logger.info(f"Early stopping triggered at epoch {epoch}")
                    break
                
                self.logger.info(f"Epoch {epoch}: Train Acc = {train_acc:.4f}, Val Acc = {val_acc:.4f}")
            
            # Load best model state for final evaluation
            model.load_state_dict(best_state)
            
            # Final evaluation
            model.eval()
            all_preds = []
            all_labels = []
            
            with torch.no_grad():
                for inputs, labels in val_loader:  # Use validation set for final metrics
                    outputs = model(inputs)
                    _, predicted = outputs.max(1)
                    all_preds.extend(predicted.cpu().numpy())
                    all_labels.extend(labels.cpu().numpy())
            
            test_acc = sum(np.array(all_preds) == np.array(all_labels)) / len(all_labels)
            
            # Save model
            model_path = os.path.join(self.models_dir, "pubmedqa_model.pt")
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'num_classes': num_classes
            }
            torch.save(checkpoint, model_path)
            
            # Save vectorizer for inference
            vectorizer_path = os.path.join(self.models_dir, "pubmedqa_vectorizer.pkl")
            with open(vectorizer_path, 'wb') as f:
                pickle.dump(vectorizer, f)
            
            # Save label encoder
            encoder_path = os.path.join(self.models_dir, "pubmedqa_encoder.pkl")
            with open(encoder_path, 'wb') as f:
                pickle.dump(label_encoder, f)
            
            metadata = {
                'model_type': 'pubmedqa_question_answering',
                'algorithm': 'pytorch_dense_network',
                'test_accuracy': float(test_acc),
                'classes': {i: name for i, name in enumerate(label_encoder.classes_)},
                'sample_count': len(questions),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'vectorizer_path': vectorizer_path,
                'encoder_path': encoder_path,
                'device': str(DEVICE)
            }
            
            with open(os.path.join(self.models_dir, "pubmedqa_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['pubmedqa'] = metadata
            self.logger.info(f"PubMedQA neural network completed with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"PubMedQA neural network training failed: {e}")
            return None
    
    def train_medical_reports_model(self):
        """Train medical reports model with PyTorch neural network"""
        self.logger.info("Training Medical Reports Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
            data_path = os.path.join(self.datasets_dir, "medical-reports", "mtsamples.csv")
            
            if not os.path.exists(data_path):
                self.logger.warning(f"Medical reports data not found: {data_path}")
                return None
                
            try:
                df = pd.read_csv(data_path)
            except Exception as e:
                self.logger.warning(f"Could not load medical reports: {e}")
                return None
            
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
            
            # Clean data (use all data, no limits)
            df = df.dropna(subset=[text_col, label_col])
            df = df[df[text_col].str.len() > 50]
            
            texts = df[text_col].values
            labels = df[label_col].values
            
            self.logger.info(f"Loaded {len(texts)} medical reports")
            
            if len(texts) == 0:
                self.logger.warning("No valid medical reports found")
                return None
            
            # Encode labels
            label_encoder = LabelEncoder()
            encoded_labels = label_encoder.fit_transform(labels)
            num_classes = len(label_encoder.classes_)
            
            # Convert text to TF-IDF features
            vectorizer = TfidfVectorizer(max_features=3000, stop_words='english')
            X = vectorizer.fit_transform(texts).toarray()
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, encoded_labels, test_size=0.2, random_state=42, stratify=encoded_labels
            )
            
            # Convert to PyTorch tensors
            X_train_tensor = torch.FloatTensor(X_train).to(DEVICE)
            y_train_tensor = torch.LongTensor(y_train).to(DEVICE)
            X_test_tensor = torch.FloatTensor(X_test).to(DEVICE)
            y_test_tensor = torch.LongTensor(y_test).to(DEVICE)
            
            # Create datasets and dataloaders with optimized settings
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
            test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
            
            train_loader = DataLoader(
                train_dataset, 
                batch_size=64,  # Increased batch size for faster training
                shuffle=True,
                num_workers=0,  # Disable multiprocessing to prevent CUDA errors
                pin_memory=False  # Disable pin memory since data is already on GPU
            )
            test_loader = DataLoader(
                test_dataset,
                batch_size=64,  # Increased batch size
                shuffle=False,
                num_workers=0,  # Disable multiprocessing
                pin_memory=False  # Disable pin memory
            )
            
            # Define model
            class MedicalReportsNet(nn.Module):
                def __init__(self, input_dim, num_classes):
                    super().__init__()
                    # Wider network with faster activation function
                    self.model = nn.Sequential(
                        nn.Linear(input_dim, 1024),
                        nn.LeakyReLU(),
                        nn.BatchNorm1d(1024),
                        nn.Dropout(0.3),
                        nn.Linear(1024, 512),
                        nn.LeakyReLU(),
                        nn.BatchNorm1d(512),
                        nn.Dropout(0.3),
                        nn.Linear(512, 256),
                        nn.LeakyReLU(),
                        nn.BatchNorm1d(256),
                        nn.Dropout(0.2),
                        nn.Linear(256, num_classes)
                    )
                    
                def forward(self, x):
                    return F.log_softmax(self.model(x), dim=1)
                    
            model = MedicalReportsNet(X_train.shape[1], num_classes).to(DEVICE)
            
            # Loss and optimizer
            criterion = nn.NLLLoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.2, patience=15,  # More patient LR reduction
                min_lr=1e-6  # Add minimum learning rate
            )
            
            # Training loop with increased patience and epochs
            best_val_acc = 0.0
            patience = 25  # Increased patience
            patience_counter = 0
            epochs = 100  # Increased max epochs
            best_model = None
            
            for epoch in range(epochs):
                # Training
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    _, predicted = outputs.max(1)
                    train_total += labels.size(0)
                    train_correct += predicted.eq(labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in test_loader:
                        inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                        outputs = model(inputs)
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        _, predicted = outputs.max(1)
                        val_total += labels.size(0)
                        val_correct += predicted.eq(labels).sum().item()
                
                val_acc = val_correct / val_total
                
                # Update learning rate
                scheduler.step(val_acc)
                
                self.logger.info(f'Epoch {epoch+1}/{epochs}:')
                self.logger.info(f'Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}')
                self.logger.info(f'Val Loss: {val_loss/len(test_loader):.4f}, Val Acc: {val_acc:.4f}')
                
                # Early stopping
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_model = copy.deepcopy(model.state_dict())
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        self.logger.info('Early stopping triggered')
                        break
            
            # Load best model
            model.load_state_dict(best_model)
            
            # Final evaluation
            model.eval()
            test_acc = val_acc  # Using validation accuracy as test accuracy
            
            # Save model, preprocessors and metadata
            model_path = os.path.join(self.models_dir, "medical_reports_model.pt")
            preprocessors_path = os.path.join(self.models_dir, "medical_reports_preprocessors.pt")
            
            # Save model checkpoint
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'input_dim': X_train.shape[1],
                'num_classes': num_classes
            }
            torch.save(checkpoint, model_path)
            
            # Save preprocessors
            torch.save({
                'vectorizer': vectorizer,
                'label_encoder': label_encoder
            }, preprocessors_path)
            
            # Save metadata
            metadata = {
                'model_type': 'medical_reports_classification',
                'algorithm': 'pytorch_neural_network',
                'test_accuracy': float(test_acc),
                'classes': {i: c for i, c in enumerate(label_encoder.classes_)},
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'preprocessors_path': preprocessors_path,
                'device': str(DEVICE)
            }
            
            self.save_metadata(metadata)
            self.trained_models['medical_reports'] = metadata
            
            self.logger.info(f"Medical Reports model trained with accuracy: {test_acc:.4f}")
            
            return metadata
            
            # Save vectorizer
            vectorizer_path = os.path.join(self.models_dir, "medical_reports_vectorizer.pkl")
            with open(vectorizer_path, 'wb') as f:
                pickle.dump(vectorizer, f)
            
            # Save label encoder
            encoder_path = os.path.join(self.models_dir, "medical_reports_encoder.pkl")
            with open(encoder_path, 'wb') as f:
                pickle.dump(label_encoder, f)
            
            metadata = {
                'model_type': 'medical_reports_classification',
                'algorithm': 'dense_neural_network',
                'test_accuracy': float(test_acc),
                'classes': {i: name for i, name in enumerate(label_encoder.classes_)},
                'sample_count': len(texts),
                'feature_count': X.shape[1],
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'vectorizer_path': vectorizer_path,
                'encoder_path': encoder_path
            }
            
            with open(os.path.join(self.models_dir, "medical_reports_metadata.json"), 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.trained_models['medical_reports'] = metadata
            self.logger.info(f"Medical reports neural network completed with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Medical reports neural network training failed: {e}")
            return None
            
    def train_covid_xray_model(self):
        """Train COVID X-ray classification model with CNN"""
        self.logger.info("Training COVID X-ray CNN Model...")
        
        try:
            if not TORCH_AVAILABLE or not IMAGE_AVAILABLE:
                self.logger.error("PyTorch/Image processing not available - cannot train CNN")
                return None
                
            # Setup transforms
            transform_train = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(20),
                transforms.ColorJitter(brightness=0.2, contrast=0.2),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            transform_val = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            # Create datasets
            train_dataset = ImageFolderDataset(
                os.path.join(self.datasets_dir, 'covid-xray', 'train'),
                transform=transform_train
            )
            
            val_dataset = ImageFolderDataset(
                os.path.join(self.datasets_dir, 'covid-xray', 'val'),
                transform=transform_val
            )
            
            # Create dataloaders
            train_loader = DataLoader(
                train_dataset,
                batch_size=32,
                shuffle=True,
                num_workers=2
            )
            
            val_loader = DataLoader(
                val_dataset,
                batch_size=32,
                shuffle=False,
                num_workers=2
            )
            
            # Create model using pretrained ResNet18
            model = models.resnet18(pretrained=True)
            
            # Modify final layer for binary classification
            num_features = model.fc.in_features
            model.fc = nn.Sequential(
                nn.Linear(num_features, 64),
                nn.ReLU(),
                nn.Dropout(0.5),
                nn.Linear(64, 1),
                nn.Sigmoid()
            )
            
            model = model.to(DEVICE)
            
            # Loss function and optimizer
            criterion = nn.BCELoss()
            optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.5, patience=3
            )
            
            # Training loop
            best_val_acc = 0
            patience = 3
            no_improve = 0
            epochs = 20
            
            for epoch in range(epochs):
                # Training phase
                model.train()
                train_loss = 0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    inputs = inputs.to(DEVICE)
                    labels = labels.float().to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(inputs).squeeze()
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    predicted = (outputs > 0.5).float()
                    train_total += labels.size(0)
                    train_correct += (predicted == labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation phase
                model.eval()
                val_loss = 0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in val_loader:
                        inputs = inputs.to(DEVICE)
                        labels = labels.float().to(DEVICE)
                        
                        outputs = model(inputs).squeeze()
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        predicted = (outputs > 0.5).float()
                        val_total += labels.size(0)
                        val_correct += (predicted == labels).sum().item()
                
                val_acc = val_correct / val_total
                
                # Learning rate scheduling
                scheduler.step(val_acc)
                
                # Early stopping check
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_state = model.state_dict()
                    no_improve = 0
                else:
                    no_improve += 1
                
                if no_improve >= patience:
                    self.logger.info(f"Early stopping triggered at epoch {epoch}")
                    break
                
                self.logger.info(f"Epoch {epoch}: Train Acc = {train_acc:.4f}, Val Acc = {val_acc:.4f}")
            
            # Load best model state
            model.load_state_dict(best_state)
            
            # Final evaluation
            model.eval()
            test_acc = val_acc  # Use validation accuracy as test accuracy since we don't have a separate test set
            
            # Save model
            model_path = os.path.join(self.models_dir, "covid_xray_model.pt")
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'num_classes': 1  # Binary classification
            }
            torch.save(checkpoint, model_path)
            
            # Save metadata
            metadata = {
                'model_type': 'covid_xray_classification',
                'algorithm': 'pytorch_resnet_cnn',
                'test_accuracy': float(test_acc),
                'classes': {0: 'Normal', 1: 'COVID-19'},
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'device': str(DEVICE)
            }
            
            self.save_metadata(metadata)
            self.trained_models['covid_xray'] = metadata
            
            self.logger.info(f"COVID X-ray model trained with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error training COVID X-ray model: {str(e)}")
            return None

    def train_skin_cancer_model(self):
        """Train skin cancer classification model with CNN"""
        self.logger.info("Training Skin Cancer CNN Model...")
        
        try:
            if not TORCH_AVAILABLE or not IMAGE_AVAILABLE:
                self.logger.error("PyTorch/Image processing not available - cannot train CNN")
                return None
                
            # Setup transforms
            transform_train = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.RandomHorizontalFlip(),
                transforms.RandomRotation(20),
                transforms.ColorJitter(brightness=0.2, contrast=0.2),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])

            transform_val = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            
            # Setup datasets and dataloaders
            train_dataset = ImageFolderDataset(
                root=os.path.join(self.data_dir, 'skin-cancer/train'),
                transform=transform_train
            )
            val_dataset = ImageFolderDataset(
                root=os.path.join(self.data_dir, 'skin-cancer/val'),
                transform=transform_val
            )
            
            train_loader = DataLoader(
                train_dataset, 
                batch_size=32,
                shuffle=True,
                num_workers=4,
                pin_memory=True
            )
            val_loader = DataLoader(
                val_dataset,
                batch_size=32,
                shuffle=False,
                num_workers=4,
                pin_memory=True
            )
            
            num_classes = len(train_dataset.classes)
            
            # Create model 
            model = models.resnet18(pretrained=True)
            # Modify final layer for skin cancer classes
            model.fc = nn.Linear(model.fc.in_features, num_classes)
            model = model.to(DEVICE)
            
            # Loss and optimizer
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.5, patience=2
            )
            
            # Training loop
            best_val_acc = 0.0
            patience = 3
            patience_counter = 0
            epochs = 20
            
            for epoch in range(epochs):
                # Training
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0
                
                for images, labels in train_loader:
                    images, labels = images.to(DEVICE), labels.to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(images)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    _, predicted = outputs.max(1)
                    train_total += labels.size(0)
                    train_correct += predicted.eq(labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for images, labels in val_loader:
                        images, labels = images.to(DEVICE), labels.to(DEVICE)
                        outputs = model(images)
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        _, predicted = outputs.max(1)
                        val_total += labels.size(0)
                        val_correct += predicted.eq(labels).sum().item()
                
                val_acc = val_correct / val_total
                
                # Update learning rate
                scheduler.step(val_acc)
                
                self.logger.info(f'Epoch {epoch+1}/{epochs}:')
                self.logger.info(f'Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}')
                self.logger.info(f'Val Loss: {val_loss/len(val_loader):.4f}, Val Acc: {val_acc:.4f}')
                
                # Early stopping
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_model = copy.deepcopy(model.state_dict())
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        self.logger.info('Early stopping triggered')
                        break
                        
            # Load best model and save
            model.load_state_dict(best_model)
            
            # Test final model
            model.eval()
            test_acc = val_acc  # Using validation accuracy as test accuracy
            
            # Save model and metadata
            model_path = os.path.join(self.models_dir, "skin_cancer_model.pt")
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'num_classes': num_classes,
                'class_to_idx': train_dataset.class_to_idx
            }
            torch.save(checkpoint, model_path)
            
            metadata = {
                'model_type': 'skin_cancer_classification',
                'algorithm': 'pytorch_resnet_cnn',
                'test_accuracy': float(test_acc),
                'classes': train_dataset.class_to_idx,
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'device': str(DEVICE)
            }
            
            self.save_metadata(metadata)
            self.trained_models['skin_cancer'] = metadata
            
            self.logger.info(f"Skin Cancer model trained with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error training skin cancer model: {str(e)}")
            return None

    def train_lab_values_model(self):
        """Train lab values classification model with PyTorch Neural Network"""
        self.logger.info("Training Lab Values Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
            # Load data
            data_path = os.path.join(self.datasets_dir, "lab-values", "data.csv")
            df = pd.read_csv(data_path)
            
            # Prepare features and target
            target_col = 'diagnosis'
            X = df.drop(columns=[target_col])
            y = df[target_col]
            
            # Handle missing values
            X = X.fillna(X.mean())
            
            # Encode categorical variables
            for col in X.select_dtypes(include=['object']).columns:
                X[col] = pd.get_dummies(X[col], drop_first=True)
                
            # Convert to numpy arrays
            X = X.values
            y = y.values
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Convert to PyTorch tensors
            X_train_tensor = torch.FloatTensor(X_train_scaled).to(DEVICE)
            y_train_tensor = torch.FloatTensor(y_train).view(-1, 1).to(DEVICE)
            X_test_tensor = torch.FloatTensor(X_test_scaled).to(DEVICE)
            y_test_tensor = torch.FloatTensor(y_test).view(-1, 1).to(DEVICE)
            
            # Create datasets and dataloaders
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
            test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
            
            train_loader = DataLoader(
                train_dataset, 
                batch_size=32,
                shuffle=True,
                num_workers=4,
                pin_memory=True
            )
            test_loader = DataLoader(
                test_dataset,
                batch_size=32,
                shuffle=False,
                num_workers=4,
                pin_memory=True
            )
            
            # Define model
            class LabValuesNet(nn.Module):
                def __init__(self, input_dim):
                    super().__init__()
                    self.fc1 = nn.Linear(input_dim, 128)
                    self.bn1 = nn.BatchNorm1d(128)
                    self.fc2 = nn.Linear(128, 64)
                    self.bn2 = nn.BatchNorm1d(64)
                    self.fc3 = nn.Linear(64, 32)
                    self.fc4 = nn.Linear(32, 1)
                    self.dropout = nn.Dropout(0.3)
                    
                def forward(self, x):
                    x = F.relu(self.bn1(self.fc1(x)))
                    x = self.dropout(x)
                    x = F.relu(self.bn2(self.fc2(x)))
                    x = self.dropout(x)
                    x = F.relu(self.fc3(x))
                    x = self.dropout(x)
                    x = torch.sigmoid(self.fc4(x))
                    return x
                    
            model = LabValuesNet(X_train_scaled.shape[1]).to(DEVICE)
            
            # Loss and optimizer with improved settings
            criterion = nn.BCELoss()
            optimizer = optim.AdamW(model.parameters(), 
                                  lr=0.001,
                                  weight_decay=0.01,  # L2 regularization
                                  amsgrad=True)  # Use AMSGrad variant
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.5, patience=2
            )
            
            # Training loop
            best_val_acc = 0.0
            patience = 5
            patience_counter = 0
            epochs = 50
            best_model = None
            
            for epoch in range(epochs):
                # Training
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    predicted = (outputs >= 0.5).float()
                    train_total += labels.size(0)
                    train_correct += (predicted == labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in test_loader:
                        inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                        outputs = model(inputs)
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        predicted = (outputs >= 0.5).float()
                        val_total += labels.size(0)
                        val_correct += (predicted == labels).sum().item()
                
                val_acc = val_correct / val_total
                
                # Update learning rate
                scheduler.step(val_acc)
                
                self.logger.info(f'Epoch {epoch+1}/{epochs}:')
                self.logger.info(f'Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}')
                self.logger.info(f'Val Loss: {val_loss/len(test_loader):.4f}, Val Acc: {val_acc:.4f}')
                
                # Early stopping
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_model = copy.deepcopy(model.state_dict())
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        self.logger.info('Early stopping triggered')
                        break
            
            # Load best model
            model.load_state_dict(best_model)
            
            # Final evaluation
            model.eval()
            test_acc = val_acc  # Using validation accuracy as test accuracy
            
            # Save model and metadata
            model_path = os.path.join(self.models_dir, "lab_values_model.pt")
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'scaler': scaler,
                'test_accuracy': test_acc,
                'input_dim': X_train_scaled.shape[1]
            }
            torch.save(checkpoint, model_path)
            
            # Save metadata
            metadata = {
                'model_type': 'lab_values_classification',
                'algorithm': 'pytorch_neural_network',
                'test_accuracy': float(test_acc),
                'feature_names': list(df.drop(columns=[target_col]).columns),
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'device': str(DEVICE)
            }
            
            self.save_metadata(metadata)
            self.trained_models['lab_values'] = metadata
            
            self.logger.info(f"Lab Values model trained with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error training lab values model: {str(e)}")
            return None

    def train_medical_transcriptions_model(self):
        """Train medical transcriptions classification model with PyTorch Neural Network"""
        self.logger.info("Training Medical Transcriptions Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
            # Load data
            data_path = os.path.join(self.datasets_dir, "medical-transcriptions", "transcriptions.csv")
            df = pd.read_csv(data_path)
            
            # Prepare text data
            texts = df['text'].values
            labels = df['category'].values
            
            # Vectorize text
            vectorizer = TfidfVectorizer(max_features=5000)
            X = vectorizer.fit_transform(texts).toarray()
            
            # Encode labels
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(labels)
            num_classes = len(label_encoder.classes_)
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Convert to PyTorch tensors
            X_train_tensor = torch.FloatTensor(X_train).to(DEVICE)
            y_train_tensor = torch.LongTensor(y_train).to(DEVICE)
            X_test_tensor = torch.FloatTensor(X_test).to(DEVICE)
            y_test_tensor = torch.LongTensor(y_test).to(DEVICE)
            
            # Create datasets and dataloaders
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
            test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
            
            train_loader = DataLoader(
                train_dataset, 
                batch_size=32,
                shuffle=True,
                num_workers=4,
                pin_memory=True
            )
            test_loader = DataLoader(
                test_dataset,
                batch_size=32,
                shuffle=False,
                num_workers=4,
                pin_memory=True
            )
            
            # Define model
            class TextClassifier(nn.Module):
                def __init__(self, input_dim, num_classes):
                    super().__init__()
                    self.fc1 = nn.Linear(input_dim, 256)
                    self.bn1 = nn.BatchNorm1d(256)
                    self.fc2 = nn.Linear(256, 128)
                    self.bn2 = nn.BatchNorm1d(128)
                    self.fc3 = nn.Linear(128, 64)
                    self.bn3 = nn.BatchNorm1d(64)
                    self.fc4 = nn.Linear(64, num_classes)
                    self.dropout = nn.Dropout(0.3)
                    
                def forward(self, x):
                    x = F.relu(self.bn1(self.fc1(x)))
                    x = self.dropout(x)
                    x = F.relu(self.bn2(self.fc2(x)))
                    x = self.dropout(x)
                    x = F.relu(self.bn3(self.fc3(x)))
                    x = self.dropout(x)
                    x = F.log_softmax(self.fc4(x), dim=1)
                    return x
                    
            model = TextClassifier(X_train.shape[1], num_classes).to(DEVICE)
            
            # Loss and optimizer
            criterion = nn.NLLLoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.5, patience=2
            )
            
            # Training loop
            best_val_acc = 0.0
            patience = 3
            patience_counter = 0
            epochs = 30
            best_model = None
            
            for epoch in range(epochs):
                # Training
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    _, predicted = outputs.max(1)
                    train_total += labels.size(0)
                    train_correct += predicted.eq(labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in test_loader:
                        inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                        outputs = model(inputs)
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        _, predicted = outputs.max(1)
                        val_total += labels.size(0)
                        val_correct += predicted.eq(labels).sum().item()
                
                val_acc = val_correct / val_total
                
                # Update learning rate
                scheduler.step(val_acc)
                
                self.logger.info(f'Epoch {epoch+1}/{epochs}:')
                self.logger.info(f'Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}')
                self.logger.info(f'Val Loss: {val_loss/len(test_loader):.4f}, Val Acc: {val_acc:.4f}')
                
                # Early stopping
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_model = copy.deepcopy(model.state_dict())
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        self.logger.info('Early stopping triggered')
                        break
            
            # Load best model
            model.load_state_dict(best_model)
            
            # Final evaluation
            model.eval()
            test_acc = val_acc  # Using validation accuracy as test accuracy
            
            # Save model, preprocessors and metadata
            model_path = os.path.join(self.models_dir, "medical_transcriptions_model.pt")
            preprocessors_path = os.path.join(self.models_dir, "medical_transcriptions_preprocessors.pt")
            
            # Save model checkpoint
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'input_dim': X_train.shape[1],
                'num_classes': num_classes
            }
            torch.save(checkpoint, model_path)
            
            # Save preprocessors
            torch.save({
                'vectorizer': vectorizer,
                'label_encoder': label_encoder
            }, preprocessors_path)
            
            # Save metadata
            metadata = {
                'model_type': 'medical_transcriptions_classification',
                'algorithm': 'pytorch_neural_network',
                'test_accuracy': float(test_acc),
                'classes': {i: c for i, c in enumerate(label_encoder.classes_)},
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'preprocessors_path': preprocessors_path,
                'device': str(DEVICE)
            }
            
            self.save_metadata(metadata)
            self.trained_models['medical_transcriptions'] = metadata
            
            self.logger.info(f"Medical Transcriptions model trained with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error training medical transcriptions model: {str(e)}")
            return None

    def train_pathology_reports_model(self):
        """Train pathology reports classification model with PyTorch Neural Network"""
        self.logger.info("Training Pathology Reports Neural Network Model...")
        
        try:
            if not TORCH_AVAILABLE:
                self.logger.error("PyTorch not available - cannot train neural network")
                return None
                
            # Load data
            data_path = os.path.join(self.datasets_dir, "pathology-reports", "reports.csv")
            df = pd.read_csv(data_path)
            
            # Prepare text data
            texts = df['report_text'].values
            labels = df['diagnosis'].values
            
            # Vectorize text
            vectorizer = TfidfVectorizer(max_features=5000)
            X = vectorizer.fit_transform(texts).toarray()
            
            # Encode labels
            label_encoder = LabelEncoder()
            y = label_encoder.fit_transform(labels)
            num_classes = len(label_encoder.classes_)
            
            # Train-test split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Convert to PyTorch tensors
            X_train_tensor = torch.FloatTensor(X_train).to(DEVICE)
            y_train_tensor = torch.LongTensor(y_train).to(DEVICE)
            X_test_tensor = torch.FloatTensor(X_test).to(DEVICE)
            y_test_tensor = torch.LongTensor(y_test).to(DEVICE)
            
            # Create datasets and dataloaders
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
            test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
            
            train_loader = DataLoader(
                train_dataset, 
                batch_size=32,
                shuffle=True,
                num_workers=4,
                pin_memory=True
            )
            test_loader = DataLoader(
                test_dataset,
                batch_size=32,
                shuffle=False,
                num_workers=4,
                pin_memory=True
            )
            
            # Define model
            class PathologyReportClassifier(nn.Module):
                def __init__(self, input_dim, num_classes):
                    super().__init__()
                    self.fc1 = nn.Linear(input_dim, 256)
                    self.bn1 = nn.BatchNorm1d(256)
                    self.fc2 = nn.Linear(256, 128)
                    self.bn2 = nn.BatchNorm1d(128)
                    self.fc3 = nn.Linear(128, 64)
                    self.bn3 = nn.BatchNorm1d(64)
                    self.fc4 = nn.Linear(64, num_classes)
                    self.dropout = nn.Dropout(0.3)
                    
                def forward(self, x):
                    x = F.relu(self.bn1(self.fc1(x)))
                    x = self.dropout(x)
                    x = F.relu(self.bn2(self.fc2(x)))
                    x = self.dropout(x)
                    x = F.relu(self.bn3(self.fc3(x)))
                    x = self.dropout(x)
                    x = F.log_softmax(self.fc4(x), dim=1)
                    return x
                    
            model = PathologyReportClassifier(X_train.shape[1], num_classes).to(DEVICE)
            
            # Loss and optimizer
            criterion = nn.NLLLoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            scheduler = optim.lr_scheduler.ReduceLROnPlateau(
                optimizer, mode='max', factor=0.5, patience=2
            )
            
            # Training loop
            best_val_acc = 0.0
            patience = 3
            patience_counter = 0
            epochs = 30
            best_model = None
            
            for epoch in range(epochs):
                # Training
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0
                
                for inputs, labels in train_loader:
                    inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                    
                    optimizer.zero_grad()
                    outputs = model(inputs)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()
                    
                    train_loss += loss.item()
                    _, predicted = outputs.max(1)
                    train_total += labels.size(0)
                    train_correct += predicted.eq(labels).sum().item()
                
                train_acc = train_correct / train_total
                
                # Validation
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0
                
                with torch.no_grad():
                    for inputs, labels in test_loader:
                        inputs, labels = inputs.to(DEVICE), labels.to(DEVICE)
                        outputs = model(inputs)
                        loss = criterion(outputs, labels)
                        
                        val_loss += loss.item()
                        _, predicted = outputs.max(1)
                        val_total += labels.size(0)
                        val_correct += predicted.eq(labels).sum().item()
                
                val_acc = val_correct / val_total
                
                # Update learning rate
                scheduler.step(val_acc)
                
                self.logger.info(f'Epoch {epoch+1}/{epochs}:')
                self.logger.info(f'Train Loss: {train_loss/len(train_loader):.4f}, Train Acc: {train_acc:.4f}')
                self.logger.info(f'Val Loss: {val_loss/len(test_loader):.4f}, Val Acc: {val_acc:.4f}')
                
                # Early stopping
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    best_model = copy.deepcopy(model.state_dict())
                    patience_counter = 0
                else:
                    patience_counter += 1
                    if patience_counter >= patience:
                        self.logger.info('Early stopping triggered')
                        break
            
            # Load best model
            model.load_state_dict(best_model)
            
            # Final evaluation
            model.eval()
            test_acc = val_acc  # Using validation accuracy as test accuracy
            
            # Save model, preprocessors and metadata
            model_path = os.path.join(self.models_dir, "pathology_reports_model.pt")
            preprocessors_path = os.path.join(self.models_dir, "pathology_reports_preprocessors.pt")
            
            # Save model checkpoint
            checkpoint = {
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'test_accuracy': test_acc,
                'input_dim': X_train.shape[1],
                'num_classes': num_classes
            }
            torch.save(checkpoint, model_path)
            
            # Save preprocessors
            torch.save({
                'vectorizer': vectorizer,
                'label_encoder': label_encoder
            }, preprocessors_path)
            
            # Save metadata
            metadata = {
                'model_type': 'pathology_reports_classification',
                'algorithm': 'pytorch_neural_network',
                'test_accuracy': float(test_acc),
                'classes': {i: c for i, c in enumerate(label_encoder.classes_)},
                'trained_at': datetime.now().isoformat(),
                'model_path': model_path,
                'preprocessors_path': preprocessors_path,
                'device': str(DEVICE)
            }
            
            self.save_metadata(metadata)
            self.trained_models['pathology_reports'] = metadata
            
            self.logger.info(f"Pathology Reports model trained with accuracy: {test_acc:.4f}")
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error training pathology reports model: {str(e)}")
            return None
    
    def train_all_models(self):
        """Train all deep learning models"""
        self.logger.info("Starting deep learning medical model training...")
        
        if not TORCH_AVAILABLE:
            self.logger.error("TensorFlow not available - cannot proceed with deep learning training")
            return {}
        
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
            self.logger.info(f"Training {name} model...")
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
            'deep_learning_framework': 'PyTorch',
            'models': results
        }
        
        with open(os.path.join(self.models_dir, "deep_learning_training_summary.json"), 'w') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Deep learning training completed! {len(results)} models trained")
        return results

def main():
    print("Deep Learning Medical Training Pipeline")
    print("=" * 50)
    
    trainer = DeepLearningMedicalTrainer()
    results = trainer.train_all_models()
    
    print("\nDeep Learning Training Results:")
    for model_name, metadata in results.items():
        print(f"{model_name}: {metadata['algorithm']} - {metadata['test_accuracy']:.4f} accuracy")
    
    print(f"\nAll models saved as .pt files in: {trainer.models_dir}")

if __name__ == "__main__":
    main()