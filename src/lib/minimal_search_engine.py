#!/usr/bin/env python3
"""
Minimal Medical Search Engine Fallback
Provides basic keyword-based search when advanced ML libraries are unavailable
"""

import os
import json
import re
from pathlib import Path
from typing import List, Dict, Any

def fallback_search(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Basic keyword-based search fallback when ML dependencies are missing
    """
    results = []
    
    # Sample medical data for demonstration
    sample_data = [
        {
            'dataset': 'medical-knowledge',
            'type': 'text',
            'content': 'Chest pain can be caused by heart disease, acid reflux, or muscle strain',
            'snippet': 'Chest pain evaluation should consider cardiac, gastrointestinal, and musculoskeletal causes',
            'source': 'medical_guidelines.txt',
            'keywords': ['chest', 'pain', 'heart', 'cardiac', 'reflux', 'muscle']
        },
        {
            'dataset': 'symptom-checker',
            'type': 'text', 
            'content': 'Fever, cough, and shortness of breath may indicate respiratory infection',
            'snippet': 'Respiratory symptoms including fever, cough, dyspnea require medical evaluation',
            'source': 'respiratory_symptoms.txt',
            'keywords': ['fever', 'cough', 'breath', 'respiratory', 'infection', 'pneumonia']
        },
        {
            'dataset': 'diabetes-info',
            'type': 'text',
            'content': 'Diabetes symptoms include excessive thirst, frequent urination, and blurred vision',
            'snippet': 'Classic diabetes symptoms: polydipsia, polyuria, blurred vision, fatigue',
            'source': 'diabetes_symptoms.txt',
            'keywords': ['diabetes', 'thirst', 'urination', 'vision', 'blood', 'sugar', 'glucose']
        },
        {
            'dataset': 'cardiology',
            'type': 'text',
            'content': 'Heart palpitations can be caused by anxiety, caffeine, or arrhythmia',
            'snippet': 'Palpitations may result from anxiety, stimulants, or cardiac arrhythmias',
            'source': 'heart_conditions.txt',
            'keywords': ['heart', 'palpitations', 'anxiety', 'caffeine', 'arrhythmia', 'rhythm']
        },
        {
            'dataset': 'neurology',
            'type': 'text',
            'content': 'Headaches can be tension-type, migraine, or secondary to other conditions',
            'snippet': 'Headache evaluation: tension-type, migraine, cluster, secondary causes',
            'source': 'headache_types.txt',
            'keywords': ['headache', 'migraine', 'tension', 'pain', 'head', 'neurological']
        },
        {
            'dataset': 'dermatology',
            'type': 'text',
            'content': 'Skin rashes may indicate allergic reactions, infections, or autoimmune conditions',
            'snippet': 'Skin rash differential: allergic, infectious, autoimmune, drug-related',
            'source': 'skin_conditions.txt',
            'keywords': ['skin', 'rash', 'allergy', 'infection', 'dermatitis', 'eczema']
        },
        {
            'dataset': 'gastroenterology',
            'type': 'text',
            'content': 'Abdominal pain location and character help determine underlying cause',
            'snippet': 'Abdominal pain assessment by location, quality, timing, associated symptoms',
            'source': 'abdominal_pain.txt',
            'keywords': ['abdominal', 'pain', 'stomach', 'nausea', 'digestive', 'gastric']
        },
        {
            'dataset': 'psychiatry',
            'type': 'text',
            'content': 'Depression symptoms include persistent sadness, loss of interest, and fatigue',
            'snippet': 'Major depression: persistent low mood, anhedonia, fatigue, sleep changes',
            'source': 'mental_health.txt',
            'keywords': ['depression', 'anxiety', 'mood', 'mental', 'sadness', 'stress']
        }
    ]
    
    # Simple keyword matching
    query_lower = query.lower()
    query_words = re.findall(r'\b\w+\b', query_lower)
    
    if not query_words:
        return []
    
    # Score each result based on keyword matches
    scored_results = []
    
    for item in sample_data:
        score = 0
        content_lower = item['content'].lower()
        
        # Count keyword matches
        for word in query_words:
            if word in item['keywords']:
                score += 2  # Exact keyword match
            elif word in content_lower:
                score += 1  # Content match
        
        # Bonus for multiple word matches
        if score > 0:
            word_matches = sum(1 for word in query_words if word in content_lower)
            if word_matches > 1:
                score += word_matches * 0.5
        
        if score > 0:
            result = {
                'dataset': item['dataset'],
                'type': item['type'],
                'content': item['content'],
                'snippet': item['snippet'],
                'source': item['source'],
                'relevance_score': min(score / 10.0, 1.0),  # Normalize to 0-1
                'search_method': 'keyword_fallback'
            }
            scored_results.append(result)
    
    # Sort by score and return top results
    scored_results.sort(key=lambda x: x['relevance_score'], reverse=True)
    return scored_results[:top_k]

def basic_medical_search(query: str, datasets_dir: str = None) -> List[Dict[str, Any]]:
    """
    Basic search through medical text files if available
    """
    if not datasets_dir or not os.path.exists(datasets_dir):
        return fallback_search(query)
    
    results = []
    query_lower = query.lower()
    
    try:
        # Look for text files in datasets directory
        datasets_path = Path(datasets_dir)
        text_files = list(datasets_path.glob('**/*.txt')) + list(datasets_path.glob('**/*.md'))
        
        for file_path in text_files[:20]:  # Limit to first 20 files
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Simple keyword search
                if any(word in content.lower() for word in query_lower.split()):
                    # Extract snippet around match
                    snippet = extract_snippet(content, query_lower)
                    
                    result = {
                        'dataset': file_path.parent.name,
                        'type': 'text',
                        'content': content[:500],  # First 500 chars
                        'snippet': snippet,
                        'source': str(file_path),
                        'relevance_score': calculate_basic_relevance(content, query_lower),
                        'search_method': 'file_search'
                    }
                    results.append(result)
                    
            except Exception as e:
                continue  # Skip files that can't be read
    
    except Exception as e:
        # Fall back to sample data if file search fails
        return fallback_search(query)
    
    # Sort by relevance and return top results
    results.sort(key=lambda x: x['relevance_score'], reverse=True)
    return results[:5]

def extract_snippet(content: str, query: str) -> str:
    """Extract relevant snippet from content around query match"""
    content_lower = content.lower()
    query_words = query.split()
    
    # Find first query word position
    for word in query_words:
        pos = content_lower.find(word)
        if pos != -1:
            # Extract 200 characters around the match
            start = max(0, pos - 100)
            end = min(len(content), pos + 100)
            snippet = content[start:end].strip()
            
            # Clean up snippet
            if start > 0:
                snippet = "..." + snippet
            if end < len(content):
                snippet = snippet + "..."
            
            return snippet
    
    # If no match found, return first 200 characters
    return content[:200] + "..." if len(content) > 200 else content

def calculate_basic_relevance(content: str, query: str) -> float:
    """Calculate basic relevance score based on keyword frequency"""
    content_lower = content.lower()
    query_words = query.split()
    
    score = 0
    for word in query_words:
        count = content_lower.count(word)
        score += count * 0.1  # Each occurrence adds 0.1
    
    # Normalize to 0-1 range
    return min(score, 1.0)

# Test function
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        test_query = sys.argv[1]
    else:
        test_query = "chest pain"
    
    print(f"Testing minimal search for: '{test_query}'")
    results = fallback_search(test_query, 3)
    
    print(f"\nFound {len(results)} results:")
    for i, result in enumerate(results, 1):
        print(f"{i}. [{result['dataset']}] {result['snippet']}")
        print(f"   Relevance: {result['relevance_score']:.2f}")
        print()