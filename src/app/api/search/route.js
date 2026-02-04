import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { datasetLoader } from '@/lib/dataset-loader';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Medical Search API endpoint
export async function POST(req) {
  try {
    await connectDB();
    
    const body = await req.json();
    const { query, searchTypes = ['csv', 'text', 'image'], topK = 5, userId } = body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required and must be a non-empty string' },
        { status: 400 }
      );
    }
    
    // Log search request
    console.log(`Medical search request: "${query}" by user ${userId || 'anonymous'}`);
    
    try {
      // First try to use preloaded datasets (fastest option)
      console.log('🔍 Searching preloaded medical datasets...');
      const preloadedResults = datasetLoader.searchDatasets(query, {
        maxResults: topK,
        datasetTypes: searchTypes.includes('csv') ? null : ['medical-transcriptions', 'pubmedqa'] // Filter if needed
      });
      
      if (preloadedResults && preloadedResults.length > 0) {
        console.log(`✅ Found ${preloadedResults.length} results from preloaded datasets`);
        const enhancedResults = await enhanceSearchResults(preloadedResults);
        
        // Log successful search
        if (userId) {
          await logSearchQuery(userId, query, enhancedResults.length);
        }
        
        return NextResponse.json({
          query,
          results: enhancedResults,
          totalResults: enhancedResults.length,
          searchTypes,
          dataSource: 'preloaded_datasets',
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }
      
      console.log('⚠️ No results from preloaded datasets, trying fallback methods...');
      
      // Fallback to Python search engine if preloaded search fails
      const searchResults = await callPythonSearchEngine(query, searchTypes, topK);
      
      // Process and enhance results
      const enhancedResults = await enhanceSearchResults(searchResults);
      
      // Log search in database (optional)
      if (userId) {
        await logSearchQuery(userId, query, enhancedResults.length);
      }
      
      return NextResponse.json({
        query,
        results: enhancedResults,
        totalResults: enhancedResults.length,
        searchTypes,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
    } catch (searchError) {
      console.error('Search engine error:', searchError);
      return NextResponse.json(
        { 
          error: 'Search engine temporarily unavailable',
          details: process.env.NODE_ENV === 'development' ? searchError.message : undefined
        },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('Medical search API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    // Get search statistics and available datasets
    const stats = await getSearchEngineStats();
    
    return NextResponse.json({
      stats,
      availableSearchTypes: ['csv', 'text', 'image'],
      supportedDatasets: [
        'breast-cancer',
        'diabetes', 
        'stroke',
        'medical-transcriptions',
        'pubmedqa',
        'brain-scans',
        'covid-xray',
        'ecg-heartbeat'
      ],
      status: 'available'
    });
    
  } catch (error) {
    console.error('Search stats error:', error);
    return NextResponse.json(
      { error: 'Unable to get search statistics' },
      { status: 500 }
    );
  }
}

// Call Python search engine
async function callPythonSearchEngine(query, searchTypes, topK) {
  // First try minimal search as it's more reliable
  try {
    console.log('Using fallback minimal search for:', query);
    const minimalResults = await getMinimalSearchResults(query, topK);
    if (minimalResults && minimalResults.length > 0) {
      return minimalResults;
    }
  } catch (minimalError) {
    console.log('Minimal search failed:', minimalError.message);
  }

  // If minimal search fails, try advanced search
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(process.cwd(), 'src', 'lib', 'searchEngine.py');
    
    // Check if Python script exists
    if (!fs.existsSync(pythonScriptPath)) {
      console.log('Python search engine not found, using built-in fallback');
      resolve(getBuiltInFallbackResults(query, topK));
      return;
    }
    
    // Prepare search parameters
    const searchParams = {
      query,
      search_types: searchTypes,
      top_k: topK,
      datasets_dir: path.join(process.cwd(), 'datasets'),
      mongo_uri: process.env.MONGODB_URI
    };
    
    // Try advanced search first, fallback to minimal search
    const searchScript = `
import sys
import json
import asyncio
import os
sys.path.append('${path.join(process.cwd(), 'src', 'lib')}')

# Try advanced search engine first
try:
    from searchEngine import create_search_engine
    
    async def search_main():
        try:
            params = json.loads(sys.argv[1])
            
            engine = await create_search_engine(
                datasets_dir=params['datasets_dir'],
                mongo_uri=params.get('mongo_uri'),
                force_rebuild=False
            )
            
            results = await engine.search(
                query=params['query'],
                top_k=params['top_k'],
                search_types=params['search_types']
            )
            
            # Convert results to JSON-serializable format
            json_results = []
            for result in results:
                json_result = {
                    'id': result['id'],
                    'dataset': result['dataset'],
                    'type': result['type'],
                    'content': result['content'],
                    'snippet': result['snippet'],
                    'metadata': result['metadata'],
                    'file_path': result['file_path'],
                    'relevance_score': float(result['relevance_score']),
                    'search_type': result['search_type']
                }
                json_results.append(json_result)
            
            print(json.dumps(json_results))
            
        except Exception as e:
            print(json.dumps({'error': str(e)}), file=sys.stderr)
            sys.exit(1)
    
    if __name__ == "__main__":
        asyncio.run(search_main())
        
except ImportError as import_error:
    # Fallback to minimal search if ML dependencies are missing
    try:
        from minimal_search_engine import fallback_search
        
        params = json.loads(sys.argv[1])
        results = fallback_search(params['query'], params['top_k'])
        
        # Format results for compatibility
        json_results = []
        for i, result in enumerate(results):
            json_result = {
                'id': f"minimal_{i}",
                'dataset': result.get('dataset', 'unknown'),
                'type': result.get('type', 'text'),
                'content': result.get('content', ''),
                'snippet': result.get('snippet', ''),
                'metadata': {},
                'file_path': result.get('source', ''),
                'relevance_score': result.get('relevance_score', 0.5),
                'search_type': 'minimal_fallback'
            }
            json_results.append(json_result)
        
        print(json.dumps(json_results))
        
    except Exception as fallback_error:
        print(json.dumps({
            'error': f'Both advanced and minimal search failed. Advanced: {str(import_error)}, Minimal: {str(fallback_error)}',
            'suggestion': 'Run: python install_dependencies.py'
        }), file=sys.stderr)
        sys.exit(1)
      `;
    
    // Spawn Python process
    const pythonProcess = spawn('python', [
      '-c',
      searchScript,
      JSON.stringify(searchParams)
    ]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const results = JSON.parse(stdout);
          if (results.error) {
            console.log('Python search failed, using built-in fallback');
            resolve(getBuiltInFallbackResults(query, topK));
          } else {
            resolve(results);
          }
        } catch (parseError) {
          console.log('Parse error, using built-in fallback:', parseError.message);
          resolve(getBuiltInFallbackResults(query, topK));
        }
      } else {
        console.log('Python process failed, using built-in fallback. Code:', code, 'Error:', stderr);
        resolve(getBuiltInFallbackResults(query, topK));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.log('Python spawn failed, using built-in fallback:', error.message);
      resolve(getBuiltInFallbackResults(query, topK));
    });
    
    // Set timeout
    setTimeout(() => {
      pythonProcess.kill();
      console.log('Python search timeout, using built-in fallback');
      resolve(getBuiltInFallbackResults(query, topK));
    }, 10000); // 10 second timeout (reduced)
  });
}
}

// Enhance search results with additional metadata
async function enhanceSearchResults(results) {
  return results.map(result => {
    // Add display-friendly information
    const enhanced = {
      ...result,
      displayTitle: generateDisplayTitle(result),
      displayCategory: getDisplayCategory(result.dataset, result.type),
      fileLink: generateFileLink(result),
      relevancePercentage: Math.round(result.relevance_score * 100),
      datasetDescription: getDatasetDescription(result.dataset)
    };
    
    // Clean up content for display
    if (enhanced.snippet && enhanced.snippet.length > 200) {
      enhanced.snippet = enhanced.snippet.substring(0, 200) + '...';
    }
    
    return enhanced;
  });
}

// Generate display title for search result
function generateDisplayTitle(result) {
  const { dataset, type, metadata, data } = result;
  
  // Handle preloaded dataset results
  if (result.search_type === 'preloaded_dataset' && data) {
    switch (dataset) {
      case 'breast-cancer':
        return `Breast Cancer Analysis - ${data.diagnosis || data.target || 'Diagnostic Data'}`;
      case 'diabetes':
        return `Diabetes Risk Assessment - ${data.Outcome === '1' || data.Outcome === 1 ? 'High Risk' : 'Low Risk'}`;
      case 'stroke':
        return `Stroke Risk Data - ${data.stroke === '1' || data.stroke === 1 ? 'Stroke History' : 'No Stroke History'}`;
      case 'ecg-heartbeat':
        return `ECG Analysis - ${data.category || 'Heart Rhythm Data'}`;
      case 'medical-transcriptions':
        return `Medical Record - ${data.medical_specialty || data.description || 'Clinical Documentation'}`;
      case 'pubmedqa':
        return `Medical Research - ${data.question || data.QUESTION || 'Research Finding'}`;
      case 'brain-scans':
        return `Brain Imaging - ${data.category || 'Neurological Scan'}`;
      case 'covid-xray':
        return `Chest X-ray - ${data.category || 'Respiratory Imaging'}`;
      case 'medical-reports':
        return `Medical Report - ${data.filename || 'Clinical Document'}`;
      default:
        return `${dataset} - Medical Data`;
    }
  }
  
  // Handle legacy results from Python search engine
  switch (dataset) {
    case 'breast-cancer':
      return `Breast Cancer Data - ${metadata?.diagnosis || 'Unknown'}`;
    case 'diabetes':
      return `Diabetes Risk Assessment - ${metadata?.Outcome === '1' ? 'Positive' : 'Negative'}`;
    case 'stroke':
      return `Stroke Risk Data - ${metadata?.stroke === '1' ? 'Yes' : 'No'}`;
    case 'medical-transcriptions':
      return `Medical Transcription - ${metadata?.medical_specialty || 'General'}`;
    case 'pubmedqa':
      return `PubMed Q&A - ${metadata?.answer || 'Medical Question'}`;
    case 'brain-scans':
      return `Brain MRI - ${metadata?.category || 'Unknown'}`;
    case 'covid-xray':
      return `Chest X-ray - ${metadata?.category || 'Unknown'}`;
    default:
      return `${dataset} - ${type}`;
  }
}

// Get display category
function getDisplayCategory(dataset, type) {
  const categories = {
    'breast-cancer': 'Cancer Research',
    'diabetes': 'Metabolic Disorders',
    'stroke': 'Cardiovascular',
    'medical-transcriptions': 'Clinical Notes',
    'pubmedqa': 'Medical Literature',
    'brain-scans': 'Neuroimaging',
    'covid-xray': 'Radiology',
    'ecg-heartbeat': 'Cardiology'
  };
  
  return categories[dataset] || 'Medical Data';
}

// Generate file access link
function generateFileLink(result) {
  if (result.type === 'image' && result.file_path) {
    // Create relative path for image viewing
    const relativePath = result.file_path.replace(process.cwd() + '\\', '').replace(/\\/g, '/');
    return `/api/datasets/view?file=${encodeURIComponent(relativePath)}`;
  } else if (result.type === 'csv') {
    return `/api/datasets/csv?dataset=${result.dataset}&row=${result.metadata.row_index || 0}`;
  }
  return null;
}

// Get dataset description
function getDatasetDescription(dataset) {
  const descriptions = {
    'breast-cancer': 'Breast cancer diagnostic data with tumor characteristics',
    'diabetes': 'Diabetes risk factors and diagnostic indicators',
    'stroke': 'Stroke prediction data with patient health metrics',
    'medical-transcriptions': 'Clinical transcriptions across medical specialties',
    'pubmedqa': 'PubMed biomedical question-answer pairs',
    'brain-scans': 'Brain MRI scans for tumor detection',
    'covid-xray': 'Chest X-ray images for COVID-19 and pneumonia detection',
    'ecg-heartbeat': 'ECG data for heart rhythm analysis'
  };
  
  return descriptions[dataset] || 'Medical dataset';
}

// Get search engine statistics
async function getSearchEngineStats() {
  try {
    const statsResult = await callPythonSearchEngine('', [], 0); // Empty query for stats
    return {
      indexed_datasets: 8,
      total_records: 'Available',
      last_updated: new Date().toISOString(),
      search_engine_status: 'operational'
    };
  } catch (error) {
    return {
      indexed_datasets: 0,
      total_records: 0,
      last_updated: null,
      search_engine_status: 'error',
      error: error.message
    };
  }
}

// Log search query (optional)
async function logSearchQuery(userId, query, resultCount) {
  try {
    // You can implement search logging here
    console.log(`Search logged: User ${userId} searched "${query}" (${resultCount} results)`);
  } catch (error) {
    console.error('Search logging error:', error);
  }
}

// Built-in fallback search results for medical queries
function getBuiltInFallbackResults(query, topK = 5) {
  const queryLower = query.toLowerCase();
  
  // Enhanced medical knowledge base
  const medicalKnowledge = [
    {
      id: 'chest_pain_1',
      dataset: 'medical-knowledge',
      type: 'text',
      content: 'Chest pain can be caused by heart disease, muscle strain, acid reflux, or lung conditions. Heart-related chest pain often feels like pressure or squeezing.',
      snippet: 'Chest pain evaluation should consider cardiac, musculoskeletal, and gastrointestinal causes',
      metadata: { specialty: 'cardiology', urgency: 'moderate' },
      file_path: 'medical_guidelines.txt',
      relevance_score: 0.9,
      search_type: 'built_in_fallback'
    },
    {
      id: 'respiratory_1',
      dataset: 'medical-knowledge',
      type: 'text', 
      content: 'Shortness of breath (dyspnea) can indicate respiratory infections, asthma, heart problems, or anxiety. Accompanied by fever and cough suggests pneumonia.',
      snippet: 'Respiratory symptoms including dyspnea, cough, fever require systematic evaluation',
      metadata: { specialty: 'pulmonology', urgency: 'moderate' },
      file_path: 'respiratory_symptoms.txt',
      relevance_score: 0.85,
      search_type: 'built_in_fallback'
    },
    {
      id: 'diabetes_1',
      dataset: 'diabetes',
      type: 'text',
      content: 'Diabetes symptoms include excessive thirst (polydipsia), frequent urination (polyuria), unexplained weight loss, and blurred vision. Early detection is crucial.',
      snippet: 'Classic diabetes symptoms: polydipsia, polyuria, weight loss, blurred vision',
      metadata: { specialty: 'endocrinology', urgency: 'moderate' },
      file_path: 'diabetes_symptoms.txt',
      relevance_score: 0.8,
      search_type: 'built_in_fallback'
    },
    {
      id: 'heart_1',
      dataset: 'ecg-heartbeat',
      type: 'text',
      content: 'Heart palpitations can result from anxiety, caffeine intake, dehydration, or cardiac arrhythmias. Regular palpitations warrant ECG evaluation.',
      snippet: 'Palpitations may indicate anxiety, stimulants, or cardiac rhythm disturbances',
      metadata: { specialty: 'cardiology', urgency: 'low' },
      file_path: 'heart_conditions.txt',
      relevance_score: 0.75,
      search_type: 'built_in_fallback'
    },
    {
      id: 'headache_1',
      dataset: 'brain-scans',
      type: 'text',
      content: 'Headaches can be primary (tension, migraine, cluster) or secondary to other conditions. Sudden severe headache requires immediate evaluation.',
      snippet: 'Headache classification: tension-type, migraine, cluster, secondary causes',
      metadata: { specialty: 'neurology', urgency: 'variable' },
      file_path: 'headache_types.txt',
      relevance_score: 0.7,
      search_type: 'built_in_fallback'
    },
    {
      id: 'skin_1',
      dataset: 'medical-knowledge',
      type: 'text',
      content: 'Skin rashes may indicate allergic reactions, infections, autoimmune conditions, or drug reactions. Note distribution, appearance, and associated symptoms.',
      snippet: 'Skin rash differential: allergic, infectious, autoimmune, drug-related',
      metadata: { specialty: 'dermatology', urgency: 'low' },
      file_path: 'skin_conditions.txt',
      relevance_score: 0.65,
      search_type: 'built_in_fallback'
    },
    {
      id: 'abdominal_1',
      dataset: 'medical-knowledge',
      type: 'text',
      content: 'Abdominal pain location and characteristics help determine cause. Right upper quadrant suggests gallbladder, left lower suggests diverticulitis.',
      snippet: 'Abdominal pain assessment by location, quality, timing, associated symptoms',
      metadata: { specialty: 'gastroenterology', urgency: 'moderate' },
      file_path: 'abdominal_pain.txt',
      relevance_score: 0.6,
      search_type: 'built_in_fallback'
    },
    {
      id: 'mental_health_1',
      dataset: 'medical-knowledge',
      type: 'text',
      content: 'Depression symptoms include persistent sadness, loss of interest, fatigue, sleep changes, and difficulty concentrating. Professional help is available.',
      snippet: 'Major depression: persistent low mood, anhedonia, fatigue, sleep disturbances',
      metadata: { specialty: 'psychiatry', urgency: 'moderate' },
      file_path: 'mental_health.txt',
      relevance_score: 0.55,
      search_type: 'built_in_fallback'
    },
    {
      id: 'fever_1',
      dataset: 'medical-knowledge',
      type: 'text',
      content: 'Fever is a natural immune response to infection. High fever (>101.3°F) with severe symptoms requires medical attention.',
      snippet: 'Fever management: hydration, rest, monitoring, medical evaluation for high fever',
      metadata: { specialty: 'general_medicine', urgency: 'moderate' },
      file_path: 'fever_management.txt',
      relevance_score: 0.5,
      search_type: 'built_in_fallback'
    },
    {
      id: 'fatigue_1',
      dataset: 'medical-knowledge',
      type: 'text',
      content: 'Chronic fatigue can result from sleep disorders, anemia, thyroid problems, depression, or chronic illnesses. Comprehensive evaluation needed.',
      snippet: 'Fatigue evaluation: sleep, laboratory studies, psychological assessment',
      metadata: { specialty: 'general_medicine', urgency: 'low' },
      file_path: 'fatigue_causes.txt',
      relevance_score: 0.45,
      search_type: 'built_in_fallback'
    }
  ];
  
  // Score results based on keyword matches
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  const scoredResults = [];
  
  for (const item of medicalKnowledge) {
    let score = 0;
    const contentLower = item.content.toLowerCase();
    const snippetLower = item.snippet.toLowerCase();
    
    // Check for exact query substring match
    if (contentLower.includes(queryLower)) {
      score += 0.5;
    }
    
    // Count keyword matches
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 0.2;
      }
      if (snippetLower.includes(word)) {
        score += 0.1;
      }
    }
    
    // Bonus for multiple word matches
    const wordMatches = queryWords.filter(word => contentLower.includes(word)).length;
    if (wordMatches > 1) {
      score += wordMatches * 0.1;
    }
    
    if (score > 0) {
      scoredResults.push({
        ...item,
        relevance_score: Math.min(score, 1.0)
      });
    }
  }
  
  // Sort by relevance and return top results
  return scoredResults
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, topK);
}

// Get minimal search results (JavaScript-based fallback)
async function getMinimalSearchResults(query, topK = 5) {
  try {
    // Try to read actual dataset files if available
    const datasetsDir = path.join(process.cwd(), 'datasets');
    if (!fs.existsSync(datasetsDir)) {
      return getBuiltInFallbackResults(query, topK);
    }
    
    const results = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    // Search through text files in datasets
    const searchDirs = ['medical-transcriptions', 'pubmedqa', 'breast-cancer', 'diabetes'];
    
    for (const dirName of searchDirs) {
      const dirPath = path.join(datasetsDir, dirName);
      if (fs.existsSync(dirPath)) {
        try {
          const files = fs.readdirSync(dirPath);
          for (const file of files.slice(0, 5)) { // Limit files to check
            const filePath = path.join(dirPath, file);
            if (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.json')) {
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                const contentLower = content.toLowerCase();
                
                // Check for keyword matches
                const matchCount = queryWords.filter(word => contentLower.includes(word)).length;
                if (matchCount > 0) {
                  const snippet = extractSnippet(content, queryLower);
                  results.push({
                    id: `file_${dirName}_${file}`,
                    dataset: dirName,
                    type: 'text',
                    content: content.substring(0, 500),
                    snippet: snippet,
                    metadata: { file: file, matches: matchCount },
                    file_path: filePath,
                    relevance_score: Math.min(matchCount / queryWords.length, 1.0),
                    search_type: 'file_search'
                  });
                }
              } catch (fileError) {
                // Skip files that can't be read
                continue;
              }
            }
          }
        } catch (dirError) {
          // Skip directories that can't be read
          continue;
        }
      }
    }
    
    // If we found results from files, return them
    if (results.length > 0) {
      return results
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, topK);
    }
    
    // Otherwise return built-in fallback
    return getBuiltInFallbackResults(query, topK);
    
  } catch (error) {
    console.log('Minimal search error:', error.message);
    return getBuiltInFallbackResults(query, topK);
  }
}

// Extract relevant snippet from content
function extractSnippet(content, query) {
  const queryWords = query.split(/\s+/);
  const sentences = content.split(/[.!?]+/);
  
  // Find sentence with most query words
  let bestSentence = '';
  let maxMatches = 0;
  
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const matches = queryWords.filter(word => sentenceLower.includes(word)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestSentence = sentence.trim();
    }
  }
  
  return bestSentence.substring(0, 200) + (bestSentence.length > 200 ? '...' : '');
}