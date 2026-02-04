#!/usr/bin/env python3
"""
Medical Dataset Loader for Multimodal Search Engine
Handles CSV, text, and image datasets with embeddings generation
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
import logging
from datetime import datetime
import pickle

# ML/AI Libraries
try:
    from sentence_transformers import SentenceTransformer
    import torch
    from PIL import Image
    import clip
    import faiss
    from transformers import AutoTokenizer, AutoModel
except ImportError as e:
    print(f"Missing dependencies: {e}")
    print("Install with: pip install sentence-transformers torch torchvision pillow transformers faiss-cpu")

# MongoDB
try:
    from pymongo import MongoClient
    from motor.motor_asyncio import AsyncIOMotorClient
    import pymongo
except ImportError:
    print("MongoDB dependencies missing. Install with: pip install pymongo motor")

class MedicalDatasetLoader:
    """
    Handles loading and processing of medical datasets for search indexing
    """
    
    def __init__(self, datasets_dir: str = "datasets", cache_dir: str = "search_cache"):
        self.datasets_dir = Path(datasets_dir)
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Initialize models
        self.text_model = None
        self.image_model = None
        self.image_preprocess = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Data storage
        self.loaded_data = {
            'csv': [],
            'text': [],
            'image': []
        }
        
        # Dataset configurations
        self.dataset_configs = {
            'csv_datasets': {
                'breast-cancer': {
                    'file_pattern': '*.csv',
                    'text_columns': ['diagnosis'],
                    'metadata_columns': ['id', 'radius_mean', 'texture_mean', 'perimeter_mean', 'area_mean']
                },
                'diabetes': {
                    'file_pattern': '*.csv',
                    'text_columns': ['Outcome'],
                    'metadata_columns': ['Pregnancies', 'Glucose', 'BloodPressure', 'BMI', 'Age']
                },
                'stroke': {
                    'file_pattern': '*.csv',
                    'text_columns': ['stroke'],
                    'metadata_columns': ['age', 'hypertension', 'heart_disease', 'work_type', 'smoking_status']
                }
            },
            'text_datasets': {
                'medical-transcriptions': {
                    'file_pattern': '*.csv',
                    'text_column': 'transcription',
                    'metadata_columns': ['medical_specialty', 'sample_name', 'description']
                },
                'pubmedqa': {
                    'file_pattern': '*.json',
                    'text_column': 'question',
                    'answer_column': 'final_decision',
                    'context_column': 'context'
                }
            },
            'image_datasets': {
                'brain-scans': {
                    'categories': ['glioma_tumor', 'meningioma_tumor', 'no_tumor', 'pituitary_tumor'],
                    'image_formats': ['.jpg', '.jpeg', '.png', '.bmp']
                },
                'covid-xray': {
                    'categories': ['NORMAL', 'PNEUMONIA', 'COVID'],
                    'image_formats': ['.jpg', '.jpeg', '.png']
                },
                'ecg-heartbeat': {
                    'categories': ['normal', 'abnormal'],
                    'image_formats': ['.png', '.jpg']
                }
            }
        }
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def initialize_models(self):
        """Initialize text and image embedding models"""
        try:
            # Initialize BioBERT for medical text
            self.logger.info("Loading BioBERT model for medical text embeddings...")
            self.text_model = SentenceTransformer('emilyalsentzer/Bio_ClinicalBERT')
            
            # Initialize CLIP for image embeddings
            self.logger.info("Loading CLIP model for image embeddings...")
            self.image_model, self.image_preprocess = clip.load("ViT-B/32", device=self.device)
            
            self.logger.info("Models initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize models: {e}")
            return False
    
    def load_csv_datasets(self) -> List[Dict[str, Any]]:
        """Load and process CSV medical datasets"""
        self.logger.info("Loading CSV datasets...")
        csv_data = []
        
        for dataset_name, config in self.dataset_configs['csv_datasets'].items():
            dataset_path = self.datasets_dir / dataset_name
            
            if not dataset_path.exists():
                self.logger.warning(f"Dataset {dataset_name} not found at {dataset_path}")
                continue
            
            try:
                # Find CSV files
                csv_files = list(dataset_path.glob(config['file_pattern']))
                
                for csv_file in csv_files:
                    self.logger.info(f"Processing {csv_file}")
                    df = pd.read_csv(csv_file)
                    
                    # Process each row
                    for idx, row in df.iterrows():
                        # Create searchable text content
                        text_parts = []
                        for col in config['text_columns']:
                            if col in df.columns and pd.notna(row[col]):
                                text_parts.append(f"{col}: {row[col]}")
                        
                        # Add metadata
                        metadata = {}
                        for col in config['metadata_columns']:
                            if col in df.columns and pd.notna(row[col]):
                                metadata[col] = row[col]
                        
                        # Create searchable content
                        content = f"Medical data from {dataset_name}: " + "; ".join(text_parts)
                        
                        # Add additional context based on dataset
                        if dataset_name == 'breast-cancer':
                            content += f" Patient with breast mass characteristics: {', '.join([f'{k}={v}' for k, v in metadata.items()])}"
                        elif dataset_name == 'diabetes':
                            content += f" Diabetes risk factors: {', '.join([f'{k}={v}' for k, v in metadata.items()])}"
                        elif dataset_name == 'stroke':
                            content += f" Stroke risk assessment: {', '.join([f'{k}={v}' for k, v in metadata.items()])}"
                        
                        csv_data.append({
                            'id': f"{dataset_name}_{idx}",
                            'dataset': dataset_name,
                            'type': 'csv',
                            'content': content,
                            'snippet': "; ".join(text_parts)[:200] + "..." if len("; ".join(text_parts)) > 200 else "; ".join(text_parts),
                            'metadata': metadata,
                            'file_path': str(csv_file),
                            'row_index': idx
                        })
                
                self.logger.info(f"Loaded {len([d for d in csv_data if d['dataset'] == dataset_name])} records from {dataset_name}")
                
            except Exception as e:
                self.logger.error(f"Error loading {dataset_name}: {e}")
        
        self.loaded_data['csv'] = csv_data
        self.logger.info(f"Total CSV records loaded: {len(csv_data)}")
        return csv_data
    
    def load_text_datasets(self) -> List[Dict[str, Any]]:
        """Load and process text medical datasets"""
        self.logger.info("Loading text datasets...")
        text_data = []
        
        for dataset_name, config in self.dataset_configs['text_datasets'].items():
            dataset_path = self.datasets_dir / dataset_name
            
            if not dataset_path.exists():
                self.logger.warning(f"Dataset {dataset_name} not found at {dataset_path}")
                continue
            
            try:
                if dataset_name == 'medical-transcriptions':
                    # Handle CSV format
                    csv_files = list(dataset_path.glob('*.csv'))
                    for csv_file in csv_files:
                        df = pd.read_csv(csv_file)
                        
                        for idx, row in df.iterrows():
                            if pd.notna(row.get(config['text_column'], '')):
                                content = row[config['text_column']]
                                
                                metadata = {}
                                for col in config['metadata_columns']:
                                    if col in df.columns and pd.notna(row[col]):
                                        metadata[col] = row[col]
                                
                                text_data.append({
                                    'id': f"{dataset_name}_{idx}",
                                    'dataset': dataset_name,
                                    'type': 'text',
                                    'content': f"Medical transcription: {content}",
                                    'snippet': content[:200] + "..." if len(content) > 200 else content,
                                    'metadata': metadata,
                                    'file_path': str(csv_file),
                                    'row_index': idx
                                })
                
                elif dataset_name == 'pubmedqa':
                    # Handle JSON format
                    json_files = list(dataset_path.glob('*.json'))
                    for json_file in json_files:
                        with open(json_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        # Handle different JSON structures
                        if isinstance(data, dict):
                            for key, item in data.items():
                                if isinstance(item, dict):
                                    question = item.get('QUESTION', item.get('question', ''))
                                    context = item.get('CONTEXTS', item.get('context', []))
                                    answer = item.get('final_decision', item.get('FINAL_DECISION', ''))
                                    
                                    if question:
                                        content = f"Medical Question: {question}"
                                        if answer:
                                            content += f" Answer: {answer}"
                                        if context and isinstance(context, list):
                                            content += f" Context: {' '.join(context[:2])}"  # First 2 context items
                                        
                                        text_data.append({
                                            'id': f"{dataset_name}_{key}",
                                            'dataset': dataset_name,
                                            'type': 'text',
                                            'content': content,
                                            'snippet': question[:200] + "..." if len(question) > 200 else question,
                                            'metadata': {'answer': answer, 'pubmed_id': key},
                                            'file_path': str(json_file),
                                            'row_index': key
                                        })
                
                self.logger.info(f"Loaded {len([d for d in text_data if d['dataset'] == dataset_name])} records from {dataset_name}")
                
            except Exception as e:
                self.logger.error(f"Error loading {dataset_name}: {e}")
        
        self.loaded_data['text'] = text_data
        self.logger.info(f"Total text records loaded: {len(text_data)}")
        return text_data
    
    def load_image_datasets(self) -> List[Dict[str, Any]]:
        """Load and process image medical datasets"""
        self.logger.info("Loading image datasets...")
        image_data = []
        
        for dataset_name, config in self.dataset_configs['image_datasets'].items():
            dataset_path = self.datasets_dir / dataset_name
            
            if not dataset_path.exists():
                self.logger.warning(f"Dataset {dataset_name} not found at {dataset_path}")
                continue
            
            try:
                # Find image files
                for category in config.get('categories', ['unknown']):
                    category_path = dataset_path / category
                    if not category_path.exists():
                        # Try direct dataset path
                        category_path = dataset_path
                    
                    for format_ext in config['image_formats']:
                        image_files = list(category_path.glob(f"*{format_ext}"))
                        
                        for image_file in image_files:
                            try:
                                # Verify image can be opened
                                with Image.open(image_file) as img:
                                    img.verify()
                                
                                # Create content description
                                content = f"Medical image from {dataset_name}: {category} - {image_file.name}"
                                
                                # Add medical context
                                if dataset_name == 'brain-scans':
                                    content += f" Brain MRI scan showing {category.replace('_', ' ')}"
                                elif dataset_name == 'covid-xray':
                                    content += f" Chest X-ray image classified as {category}"
                                elif 'xray' in dataset_name.lower():
                                    content += f" X-ray medical imaging"
                                
                                image_data.append({
                                    'id': f"{dataset_name}_{category}_{image_file.stem}",
                                    'dataset': dataset_name,
                                    'type': 'image',
                                    'content': content,
                                    'snippet': f"{category} - {image_file.name}",
                                    'metadata': {
                                        'category': category,
                                        'filename': image_file.name,
                                        'format': image_file.suffix[1:],
                                        'size': image_file.stat().st_size
                                    },
                                    'file_path': str(image_file),
                                    'category': category
                                })
                            
                            except Exception as e:
                                self.logger.warning(f"Invalid image {image_file}: {e}")
                
                self.logger.info(f"Loaded {len([d for d in image_data if d['dataset'] == dataset_name])} images from {dataset_name}")
                
            except Exception as e:
                self.logger.error(f"Error loading {dataset_name}: {e}")
        
        self.loaded_data['image'] = image_data
        self.logger.info(f"Total images loaded: {len(image_data)}")
        return image_data
    
    def generate_text_embeddings(self, data_items: List[Dict[str, Any]]) -> List[np.ndarray]:
        """Generate embeddings for text data"""
        if not self.text_model:
            raise RuntimeError("Text model not initialized. Call initialize_models() first.")
        
        self.logger.info(f"Generating embeddings for {len(data_items)} text items...")
        
        texts = [item['content'] for item in data_items]
        embeddings = self.text_model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
        
        return embeddings
    
    def generate_image_embeddings(self, data_items: List[Dict[str, Any]]) -> List[np.ndarray]:
        """Generate embeddings for image data"""
        if not self.image_model:
            raise RuntimeError("Image model not initialized. Call initialize_models() first.")
        
        self.logger.info(f"Generating embeddings for {len(data_items)} images...")
        
        embeddings = []
        for item in data_items:
            try:
                image_path = Path(item['file_path'])
                with Image.open(image_path) as image:
                    # Convert to RGB if necessary
                    if image.mode != 'RGB':
                        image = image.convert('RGB')
                    
                    # Preprocess and encode
                    image_tensor = self.image_preprocess(image).unsqueeze(0).to(self.device)
                    
                    with torch.no_grad():
                        embedding = self.image_model.encode_image(image_tensor)
                        embedding = embedding.cpu().numpy().flatten()
                    
                    embeddings.append(embedding)
            
            except Exception as e:
                self.logger.error(f"Error processing image {item['file_path']}: {e}")
                # Use zero embedding as fallback
                embeddings.append(np.zeros(512))  # CLIP embedding size
        
        return np.array(embeddings)
    
    def save_data_cache(self, filename: str = "medical_data_cache.pkl"):
        """Save loaded data to cache file"""
        cache_file = self.cache_dir / filename
        
        cache_data = {
            'loaded_data': self.loaded_data,
            'timestamp': datetime.now().isoformat(),
            'total_items': sum(len(data) for data in self.loaded_data.values())
        }
        
        with open(cache_file, 'wb') as f:
            pickle.dump(cache_data, f)
        
        self.logger.info(f"Data cache saved to {cache_file}")
    
    def load_data_cache(self, filename: str = "medical_data_cache.pkl") -> bool:
        """Load data from cache file"""
        cache_file = self.cache_dir / filename
        
        if not cache_file.exists():
            return False
        
        try:
            with open(cache_file, 'rb') as f:
                cache_data = pickle.load(f)
            
            self.loaded_data = cache_data['loaded_data']
            self.logger.info(f"Loaded {cache_data['total_items']} items from cache")
            return True
        
        except Exception as e:
            self.logger.error(f"Error loading cache: {e}")
            return False
    
    def get_all_data(self) -> List[Dict[str, Any]]:
        """Get all loaded data combined"""
        all_data = []
        for data_type, items in self.loaded_data.items():
            all_data.extend(items)
        return all_data

if __name__ == "__main__":
    # Test the loader
    loader = MedicalDatasetLoader()
    
    # Initialize models
    if loader.initialize_models():
        # Load all datasets
        csv_data = loader.load_csv_datasets()
        text_data = loader.load_text_datasets()
        image_data = loader.load_image_datasets()
        
        # Save cache
        loader.save_data_cache()
        
        print(f"Loaded {len(csv_data)} CSV records, {len(text_data)} text records, {len(image_data)} images")
    else:
        print("Failed to initialize models")