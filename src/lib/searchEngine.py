#!/usr/bin/env python3
"""
Medical Search Engine with FAISS and MongoDB Integration
Provides unified search across medical datasets
"""

import os
import json
import numpy as np
import faiss
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
import logging
from datetime import datetime
import asyncio

# MongoDB
try:
    from pymongo import MongoClient
    from motor.motor_asyncio import AsyncIOMotorClient
    import pymongo
except ImportError:
    print("MongoDB dependencies missing. Install with: pip install pymongo motor")

# ML Libraries
try:
    from sentence_transformers import SentenceTransformer
    import torch
    from PIL import Image
    import clip
except ImportError:
    print("Missing ML dependencies")

from loadData import MedicalDatasetLoader

class MedicalSearchEngine:
    """
    Medical Search Engine with vector search capabilities
    """
    
    def __init__(self, 
                 datasets_dir: str = "datasets",
                 mongo_uri: str = None,
                 cache_dir: str = "search_cache",
                 collection_name: str = "medical_search_index"):
        
        self.datasets_dir = Path(datasets_dir)
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # Initialize loader
        self.loader = MedicalDatasetLoader(str(datasets_dir), str(cache_dir))
        
        # Vector indexes
        self.text_index = None
        self.image_index = None
        
        # Data mappings (FAISS index -> data item)
        self.text_mapping = []
        self.image_mapping = []
        
        # MongoDB setup
        self.mongo_client = None
        self.db = None
        self.collection = None
        self.collection_name = collection_name
        
        if mongo_uri:
            self.setup_mongodb(mongo_uri)
        
        # Models
        self.text_model = None
        self.image_model = None
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def setup_mongodb(self, mongo_uri: str):
        """Setup MongoDB connection"""
        try:
            self.mongo_client = MongoClient(mongo_uri)
            self.db = self.mongo_client.healthcare_app
            self.collection = self.db[self.collection_name]
            
            # Create vector search index (if using MongoDB Atlas with vector search)
            try:
                # Create index for text embeddings
                self.collection.create_index([
                    ("embedding", "2dsphere"),
                    ("dataset", 1),
                    ("type", 1)
                ], background=True)
                self.logger.info("MongoDB indexes created")
            except Exception as e:
                self.logger.warning(f"Index creation warning: {e}")
            
            self.logger.info("MongoDB connection established")
        except Exception as e:
            self.logger.error(f"MongoDB connection failed: {e}")
    
    async def initialize_search_engine(self, force_rebuild: bool = False):
        """Initialize the complete search engine"""
        self.logger.info("Initializing Medical Search Engine...")
        
        # Initialize models
        if not self.loader.initialize_models():
            raise RuntimeError("Failed to initialize ML models")
        
        self.text_model = self.loader.text_model
        self.image_model = self.loader.image_model
        
        # Check for cached data
        if not force_rebuild and self.loader.load_data_cache():
            self.logger.info("Using cached dataset data")
        else:
            # Load all datasets
            self.logger.info("Loading datasets from scratch...")
            self.loader.load_csv_datasets()
            self.loader.load_text_datasets()
            self.loader.load_image_datasets()
            self.loader.save_data_cache()
        
        # Build embeddings and indexes
        await self.build_search_indexes(force_rebuild)
        
        self.logger.info("Search engine initialization complete")
    
    async def build_search_indexes(self, force_rebuild: bool = False):
        """Build FAISS indexes and populate MongoDB"""
        
        # Check for existing indexes
        text_index_file = self.cache_dir / "text_index.faiss"
        image_index_file = self.cache_dir / "image_index.faiss"
        text_mapping_file = self.cache_dir / "text_mapping.json"
        image_mapping_file = self.cache_dir / "image_mapping.json"
        
        if not force_rebuild and all(f.exists() for f in [text_index_file, image_index_file, text_mapping_file, image_mapping_file]):
            self.logger.info("Loading existing FAISS indexes...")
            self.load_indexes()
            return
        
        # Build text index
        await self.build_text_index()
        
        # Build image index
        await self.build_image_index()
        
        # Save indexes
        self.save_indexes()
        
        # Populate MongoDB
        if self.collection:
            await self.populate_mongodb()
    
    async def build_text_index(self):
        """Build FAISS index for text data"""
        self.logger.info("Building text search index...")
        
        # Combine CSV and text data
        text_data = self.loader.loaded_data['csv'] + self.loader.loaded_data['text']
        
        if not text_data:
            self.logger.warning("No text data found")
            return
        
        # Generate embeddings
        embeddings = self.loader.generate_text_embeddings(text_data)
        
        # Create FAISS index
        dimension = embeddings.shape[1]
        self.text_index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Add to index
        self.text_index.add(embeddings.astype(np.float32))
        self.text_mapping = text_data
        
        self.logger.info(f"Text index built with {len(text_data)} items")
    
    async def build_image_index(self):
        """Build FAISS index for image data"""
        self.logger.info("Building image search index...")
        
        image_data = self.loader.loaded_data['image']
        
        if not image_data:
            self.logger.warning("No image data found")
            return
        
        # Generate embeddings
        embeddings = self.loader.generate_image_embeddings(image_data)
        
        # Create FAISS index
        dimension = embeddings.shape[1]
        self.image_index = faiss.IndexFlatIP(dimension)
        
        # Normalize embeddings
        faiss.normalize_L2(embeddings)
        
        # Add to index
        self.image_index.add(embeddings.astype(np.float32))
        self.image_mapping = image_data
        
        self.logger.info(f"Image index built with {len(image_data)} items")
    
    def save_indexes(self):
        """Save FAISS indexes and mappings"""
        if self.text_index:
            faiss.write_index(self.text_index, str(self.cache_dir / "text_index.faiss"))
            with open(self.cache_dir / "text_mapping.json", 'w') as f:
                json.dump(self.text_mapping, f, default=str)
        
        if self.image_index:
            faiss.write_index(self.image_index, str(self.cache_dir / "image_index.faiss"))
            with open(self.cache_dir / "image_mapping.json", 'w') as f:
                json.dump(self.image_mapping, f, default=str)
        
        self.logger.info("FAISS indexes saved")
    
    def load_indexes(self):
        """Load FAISS indexes and mappings"""
        try:
            # Load text index
            if (self.cache_dir / "text_index.faiss").exists():
                self.text_index = faiss.read_index(str(self.cache_dir / "text_index.faiss"))
                with open(self.cache_dir / "text_mapping.json", 'r') as f:
                    self.text_mapping = json.load(f)
            
            # Load image index
            if (self.cache_dir / "image_index.faiss").exists():
                self.image_index = faiss.read_index(str(self.cache_dir / "image_index.faiss"))
                with open(self.cache_dir / "image_mapping.json", 'r') as f:
                    self.image_mapping = json.load(f)
            
            self.logger.info("FAISS indexes loaded successfully")
        
        except Exception as e:
            self.logger.error(f"Error loading indexes: {e}")
    
    async def populate_mongodb(self):
        """Populate MongoDB with search data"""
        if not self.collection:
            self.logger.warning("MongoDB not configured")
            return
        
        self.logger.info("Populating MongoDB with search data...")
        
        # Clear existing data
        self.collection.delete_many({})
        
        # Insert all data
        all_documents = []
        
        # Add text data with embeddings
        for i, item in enumerate(self.text_mapping):
            if self.text_index and i < self.text_index.ntotal:
                embedding = self.text_index.reconstruct(i).tolist()
                doc = {
                    '_id': item['id'],
                    'dataset': item['dataset'],
                    'type': item['type'],
                    'content': item['content'],
                    'snippet': item['snippet'],
                    'metadata': item['metadata'],
                    'file_path': item['file_path'],
                    'embedding': embedding,
                    'created_at': datetime.utcnow()
                }
                all_documents.append(doc)
        
        # Add image data with embeddings
        for i, item in enumerate(self.image_mapping):
            if self.image_index and i < self.image_index.ntotal:
                embedding = self.image_index.reconstruct(i).tolist()
                doc = {
                    '_id': item['id'],
                    'dataset': item['dataset'],
                    'type': item['type'],
                    'content': item['content'],
                    'snippet': item['snippet'],
                    'metadata': item['metadata'],
                    'file_path': item['file_path'],
                    'embedding': embedding,
                    'created_at': datetime.utcnow()
                }
                all_documents.append(doc)
        
        # Batch insert
        if all_documents:
            try:
                self.collection.insert_many(all_documents, ordered=False)
                self.logger.info(f"Inserted {len(all_documents)} documents into MongoDB")
            except Exception as e:
                self.logger.error(f"MongoDB insertion error: {e}")
    
    async def search(self, query: str, top_k: int = 5, search_types: List[str] = None) -> List[Dict[str, Any]]:
        """
        Unified search across all datasets
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            search_types: Types to search ['csv', 'text', 'image'] or None for all
        
        Returns:
            List of search results
        """
        if search_types is None:
            search_types = ['csv', 'text', 'image']
        
        results = []
        
        # Text search (includes CSV data)
        if any(t in search_types for t in ['csv', 'text']):
            text_results = await self.search_text(query, top_k)
            results.extend(text_results)
        
        # Image search
        if 'image' in search_types:
            image_results = await self.search_images(query, top_k)
            results.extend(image_results)
        
        # Sort by relevance score and return top results
        results.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        return results[:top_k]
    
    async def search_text(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search text and CSV data"""
        if not self.text_index or not self.text_model:
            return []
        
        # Generate query embedding
        query_embedding = self.text_model.encode([query], convert_to_numpy=True)
        faiss.normalize_L2(query_embedding)
        
        # Search FAISS index
        scores, indices = self.text_index.search(query_embedding.astype(np.float32), top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.text_mapping):
                item = self.text_mapping[idx]
                result = {
                    'id': item['id'],
                    'dataset': item['dataset'],
                    'type': item['type'],
                    'content': item['content'],
                    'snippet': item['snippet'],
                    'metadata': item['metadata'],
                    'file_path': item.get('file_path', ''),
                    'relevance_score': float(score),
                    'search_type': 'text'
                }
                results.append(result)
        
        return results
    
    async def search_images(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search image data using text query"""
        if not self.image_index or not self.image_model:
            return []
        
        # Generate text embedding for image search using CLIP
        text_tokens = clip.tokenize([query]).to(self.loader.device)
        
        with torch.no_grad():
            query_embedding = self.image_model.encode_text(text_tokens)
            query_embedding = query_embedding.cpu().numpy()
        
        faiss.normalize_L2(query_embedding)
        
        # Search FAISS index
        scores, indices = self.image_index.search(query_embedding.astype(np.float32), top_k)
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.image_mapping):
                item = self.image_mapping[idx]
                result = {
                    'id': item['id'],
                    'dataset': item['dataset'],
                    'type': item['type'],
                    'content': item['content'],
                    'snippet': item['snippet'],
                    'metadata': item['metadata'],
                    'file_path': item.get('file_path', ''),
                    'relevance_score': float(score),
                    'search_type': 'image'
                }
                results.append(result)
        
        return results
    
    async def mongodb_vector_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Alternative search using MongoDB Atlas vector search
        (Requires MongoDB Atlas with vector search enabled)
        """
        if not self.collection or not self.text_model:
            return []
        
        # Generate query embedding
        query_embedding = self.text_model.encode([query], convert_to_numpy=True)[0].tolist()
        
        try:
            # MongoDB Atlas vector search aggregation
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",  # You need to create this in MongoDB Atlas
                        "path": "embedding",
                        "queryVector": query_embedding,
                        "numCandidates": top_k * 10,
                        "limit": top_k
                    }
                },
                {
                    "$project": {
                        "dataset": 1,
                        "type": 1,
                        "content": 1,
                        "snippet": 1,
                        "metadata": 1,
                        "file_path": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            results = []
            async for doc in self.collection.aggregate(pipeline):
                result = {
                    'id': str(doc['_id']),
                    'dataset': doc['dataset'],
                    'type': doc['type'],
                    'content': doc['content'],
                    'snippet': doc['snippet'],
                    'metadata': doc['metadata'],
                    'file_path': doc['file_path'],
                    'relevance_score': doc.get('score', 0),
                    'search_type': 'mongodb_vector'
                }
                results.append(result)
            
            return results
        
        except Exception as e:
            self.logger.error(f"MongoDB vector search error: {e}")
            return []
    
    def get_dataset_stats(self) -> Dict[str, Any]:
        """Get statistics about loaded datasets"""
        stats = {
            'total_items': len(self.text_mapping) + len(self.image_mapping),
            'text_items': len(self.text_mapping),
            'image_items': len(self.image_mapping),
            'datasets': {}
        }
        
        # Count by dataset
        all_items = self.text_mapping + self.image_mapping
        for item in all_items:
            dataset = item['dataset']
            if dataset not in stats['datasets']:
                stats['datasets'][dataset] = {'total': 0, 'types': {}}
            
            stats['datasets'][dataset]['total'] += 1
            item_type = item['type']
            if item_type not in stats['datasets'][dataset]['types']:
                stats['datasets'][dataset]['types'][item_type] = 0
            stats['datasets'][dataset]['types'][item_type] += 1
        
        return stats

# Convenience function for external use
async def create_search_engine(datasets_dir: str = "datasets", 
                               mongo_uri: str = None,
                               force_rebuild: bool = False) -> MedicalSearchEngine:
    """Create and initialize a medical search engine"""
    engine = MedicalSearchEngine(datasets_dir=datasets_dir, mongo_uri=mongo_uri)
    await engine.initialize_search_engine(force_rebuild=force_rebuild)
    return engine

if __name__ == "__main__":
    # Test the search engine
    async def test_search():
        # Example usage
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        
        engine = await create_search_engine(
            datasets_dir="datasets",
            mongo_uri=mongo_uri,
            force_rebuild=False
        )
        
        # Test searches
        queries = [
            "chest pain diagnosis",
            "brain tumor detection",
            "diabetes risk factors",
            "pneumonia x-ray"
        ]
        
        for query in queries:
            print(f"\nSearching for: {query}")
            results = await engine.search(query, top_k=3)
            
            for i, result in enumerate(results, 1):
                print(f"{i}. [{result['dataset']}] {result['snippet'][:100]}...")
                print(f"   Score: {result['relevance_score']:.3f}")
        
        # Print stats
        stats = engine.get_dataset_stats()
        print(f"\nDataset Statistics:")
        print(f"Total items: {stats['total_items']}")
        for dataset, info in stats['datasets'].items():
            print(f"  {dataset}: {info['total']} items {info['types']}")
    
    # Run test
    asyncio.run(test_search())