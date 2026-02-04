/**
 * Dataset Loader - Preloads all medical datasets at application startup
 * This ensures immediate response from real dataset content
 */

import fs from 'fs';
import path from 'path';

class MedicalDatasetLoader {
  constructor() {
    this.datasets = new Map();
    this.isLoaded = false;
    this.loadingPromise = null;
    this.datasetPath = path.join(process.cwd(), 'datasets');
    
    console.log('🏥 Medical Dataset Loader initialized');
  }

  // Load all datasets at startup (epoch-style loading)
  async loadAllDatasetsAtStartup() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this._performDatasetLoading();
    return this.loadingPromise;
  }

  async _performDatasetLoading() {
    console.log('🔄 Starting epoch-style dataset loading...');
    const startTime = Date.now();

    try {
      // Check if datasets directory exists
      if (!fs.existsSync(this.datasetPath)) {
        console.log('📁 Dataset path does not exist:', this.datasetPath);
        console.log('Creating dataset path...');
        fs.mkdirSync(this.datasetPath, { recursive: true });
      }

      // Load each dataset type
      await Promise.all([
        this.loadBreastCancerDataset(),
        this.loadDiabetesDataset(),
        this.loadStrokeDataset(),
        this.loadECGDataset(),
        this.loadBrainScansDataset(),
        this.loadMedicalTranscriptionsDataset(),
        this.loadPubMedDataset(),
        this.loadCovidXrayDataset(),
        this.loadMedicalReportsDataset()
      ]);

      this.isLoaded = true;
      const loadTime = Date.now() - startTime;
      
      console.log(`✅ All datasets loaded successfully in ${loadTime}ms`);
      console.log(`📊 Loaded ${this.datasets.size} datasets with ${this.getTotalRecords()} total records`);
      
      // Log dataset summary
      this.logDatasetSummary();
      
      return true;
    } catch (error) {
      console.error('❌ Dataset loading failed:', error);
      this.isLoaded = false;
      return false;
    }
  }

  // Load Breast Cancer Dataset
  async loadBreastCancerDataset() {
    const datasetDir = path.join(this.datasetPath, 'breast-cancer');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating breast-cancer directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const records = [];
      for (const file of csvFiles) {
        const filePath = path.join(datasetDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',');
          for (let i = 1; i < lines.length && i < 1000; i++) { // Limit to 1000 records
            const values = lines[i].split(',');
            if (values.length === headers.length) {
              const record = {};
              headers.forEach((header, index) => {
                record[header.trim()] = values[index].trim();
              });
              records.push({
                type: 'breast-cancer',
                data: record,
                searchText: `Breast cancer data: ${Object.values(record).join(' ')}`,
                metadata: { source: file, dataset: 'breast-cancer' }
              });
            }
          }
        }
      }
      
      this.datasets.set('breast-cancer', records);
      console.log(`📋 Loaded ${records.length} breast cancer records`);
      
    } catch (error) {
      console.error('Error loading breast cancer dataset:', error);
    }
  }

  // Load Diabetes Dataset
  async loadDiabetesDataset() {
    const datasetDir = path.join(this.datasetPath, 'diabetes');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating diabetes directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const records = [];
      for (const file of csvFiles) {
        const filePath = path.join(datasetDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',');
          for (let i = 1; i < lines.length && i < 1000; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
              const record = {};
              headers.forEach((header, index) => {
                record[header.trim()] = values[index].trim();
              });
              
              // Create meaningful search text for diabetes
              const searchText = `Diabetes risk factors: glucose ${record.Glucose || 'N/A'}, BMI ${record.BMI || 'N/A'}, age ${record.Age || 'N/A'}, outcome ${record.Outcome || 'N/A'}`;
              
              records.push({
                type: 'diabetes',
                data: record,
                searchText: searchText,
                metadata: { source: file, dataset: 'diabetes' }
              });
            }
          }
        }
      }
      
      this.datasets.set('diabetes', records);
      console.log(`🩸 Loaded ${records.length} diabetes records`);
      
    } catch (error) {
      console.error('Error loading diabetes dataset:', error);
    }
  }

  // Load Stroke Dataset
  async loadStrokeDataset() {
    const datasetDir = path.join(this.datasetPath, 'stroke');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating stroke directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const records = [];
      for (const file of csvFiles) {
        const filePath = path.join(datasetDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',');
          for (let i = 1; i < lines.length && i < 1000; i++) {
            const values = lines[i].split(',');
            if (values.length === headers.length) {
              const record = {};
              headers.forEach((header, index) => {
                record[header.trim()] = values[index].trim();
              });
              
              const searchText = `Stroke risk: age ${record.age || 'N/A'}, hypertension ${record.hypertension || 'N/A'}, heart disease ${record.heart_disease || 'N/A'}, stroke ${record.stroke || 'N/A'}`;
              
              records.push({
                type: 'stroke',
                data: record,
                searchText: searchText,
                metadata: { source: file, dataset: 'stroke' }
              });
            }
          }
        }
      }
      
      this.datasets.set('stroke', records);
      console.log(`🧠 Loaded ${records.length} stroke records`);
      
    } catch (error) {
      console.error('Error loading stroke dataset:', error);
    }
  }

  // Load ECG Dataset
  async loadECGDataset() {
    const datasetDir = path.join(this.datasetPath, 'ecg-heartbeat');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating ecg-heartbeat directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      const records = [];
      for (const file of csvFiles) {
        const filePath = path.join(datasetDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headers = lines[0].split(',');
          for (let i = 1; i < lines.length && i < 500; i++) { // Limit ECG data
            const values = lines[i].split(',');
            if (values.length >= 2) {
              const category = values[values.length - 1]; // Last column is usually category
              const searchText = `ECG heartbeat analysis: category ${category}, heart rhythm data, cardiac monitoring`;
              
              records.push({
                type: 'ecg',
                data: { category, rawData: values.slice(0, -1) },
                searchText: searchText,
                metadata: { source: file, dataset: 'ecg-heartbeat' }
              });
            }
          }
        }
      }
      
      this.datasets.set('ecg-heartbeat', records);
      console.log(`❤️ Loaded ${records.length} ECG records`);
      
    } catch (error) {
      console.error('Error loading ECG dataset:', error);
    }
  }

  // Load Brain Scans Dataset
  async loadBrainScansDataset() {
    const datasetDir = path.join(this.datasetPath, 'brain-scans');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating brain-scans directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const records = [];
      
      // Check for brain tumor dataset structure
      const brainTumorDir = path.join(datasetDir, 'brain_tumor_dataset');
      if (fs.existsSync(brainTumorDir)) {
        // Process 'yes' directory (tumor cases)
        const yesDir = path.join(brainTumorDir, 'yes');
        if (fs.existsSync(yesDir)) {
          const yesFiles = fs.readdirSync(yesDir);
          for (const file of yesFiles) {
            if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
              const filePath = path.join(yesDir, file);
              records.push({
                type: 'brain-scan',
                data: { filename: file, category: 'tumor', path: filePath },
                searchText: `Brain MRI scan: tumor, brain tumor, neurological imaging, brain analysis, head scan, abnormal, mass, lesion`,
                metadata: { source: file, dataset: 'brain-scans', type: 'image', category: 'tumor' }
              });
            }
          }
        }
        
        // Process 'no' directory (normal cases)
        const noDir = path.join(brainTumorDir, 'no');
        if (fs.existsSync(noDir)) {
          const noFiles = fs.readdirSync(noDir);
          for (const file of noFiles) {
            if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
              const filePath = path.join(noDir, file);
              records.push({
                type: 'brain-scan',
                data: { filename: file, category: 'normal', path: filePath },
                searchText: `Brain MRI scan: normal, healthy brain, neurological imaging, brain analysis, head scan, no abnormality`,
                metadata: { source: file, dataset: 'brain-scans', type: 'image', category: 'normal' }
              });
            }
          }
        }
      }
      
      // Also check for direct files in brain-scans directory
      const directFiles = fs.readdirSync(datasetDir);
      for (const file of directFiles) {
        const filePath = path.join(datasetDir, file);
        const stats = fs.statSync(filePath);
        
        // Skip directories we've already processed
        if (stats.isDirectory() && file === 'brain_tumor_dataset') {
          continue;
        }
        
        if (stats.isFile() && (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'))) {
          const category = this.extractBrainScanCategory(file);
          records.push({
            type: 'brain-scan',
            data: { filename: file, category, path: filePath },
            searchText: `Brain MRI scan: ${category}, neurological imaging, brain analysis, head scan`,
            metadata: { source: file, dataset: 'brain-scans', type: 'image', category }
          });
        }
      }
      
      this.datasets.set('brain-scans', records);
      console.log(`🧠 Loaded ${records.length} brain scan records`);
      
    } catch (error) {
      console.error('Error loading brain scans dataset:', error);
    }
  }

  // Load Medical Transcriptions
  async loadMedicalTranscriptionsDataset() {
    const datasetDir = path.join(this.datasetPath, 'medical-transcriptions');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating medical-transcriptions directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const records = [];
      
      for (const file of files) {
        const filePath = path.join(datasetDir, file);
        
        if (file.endsWith('.csv')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          if (lines.length > 1) {
            const headers = lines[0].split(',');
            for (let i = 1; i < lines.length && i < 1000; i++) {
              const values = this.parseCSVLine(lines[i]);
              if (values.length >= headers.length) {
                const record = {};
                headers.forEach((header, index) => {
                  record[header.trim()] = values[index] ? values[index].trim() : '';
                });
                
                const searchText = `Medical transcription: ${record.description || ''} ${record.medical_specialty || ''} ${record.transcription || ''}`.substring(0, 500);
                
                records.push({
                  type: 'medical-transcription',
                  data: record,
                  searchText: searchText,
                  metadata: { source: file, dataset: 'medical-transcriptions' }
                });
              }
            }
          }
        }
      }
      
      this.datasets.set('medical-transcriptions', records);
      console.log(`📄 Loaded ${records.length} medical transcription records`);
      
    } catch (error) {
      console.error('Error loading medical transcriptions:', error);
    }
  }

  // Load PubMed Dataset
  async loadPubMedDataset() {
    const datasetDir = path.join(this.datasetPath, 'pubmedqa');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating pubmedqa directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const records = [];
      
      for (const file of files) {
        const filePath = path.join(datasetDir, file);
        
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(filePath, 'utf8');
          try {
            const data = JSON.parse(content);
            
            // Handle different JSON structures
            if (Array.isArray(data)) {
              data.forEach((item, index) => {
                if (index < 500) { // Limit records
                  const searchText = `PubMed research: ${item.question || ''} ${item.context || ''} ${item.answer || ''}`.substring(0, 500);
                  records.push({
                    type: 'pubmed',
                    data: item,
                    searchText: searchText,
                    metadata: { source: file, dataset: 'pubmedqa', index }
                  });
                }
              });
            } else if (typeof data === 'object') {
              Object.keys(data).forEach((key, index) => {
                if (index < 500) {
                  const item = data[key];
                  const searchText = `PubMed research: ${item.QUESTION || item.question || ''} ${item.CONTEXTS || item.context || ''} ${item.final_decision || item.answer || ''}`.substring(0, 500);
                  records.push({
                    type: 'pubmed',
                    data: item,
                    searchText: searchText,
                    metadata: { source: file, dataset: 'pubmedqa', key }
                  });
                }
              });
            }
          } catch (parseError) {
            console.warn(`Could not parse JSON file ${file}:`, parseError.message);
          }
        }
      }
      
      this.datasets.set('pubmedqa', records);
      console.log(`📚 Loaded ${records.length} PubMed records`);
      
    } catch (error) {
      console.error('Error loading PubMed dataset:', error);
    }
  }

  // Load COVID X-ray Dataset
  async loadCovidXrayDataset() {
    const datasetDir = path.join(this.datasetPath, 'covid-xray');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating covid-xray directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const records = [];
      
      for (const file of files) {
        const filePath = path.join(datasetDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile() && (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg'))) {
          const category = this.extractXrayCategory(file);
          records.push({
            type: 'covid-xray',
            data: { filename: file, category, path: filePath },
            searchText: `COVID chest X-ray: ${category}, lung imaging, respiratory analysis, pneumonia detection`,
            metadata: { source: file, dataset: 'covid-xray', type: 'image' }
          });
        }
      }
      
      this.datasets.set('covid-xray', records);
      console.log(`🫁 Loaded ${records.length} COVID X-ray records`);
      
    } catch (error) {
      console.error('Error loading COVID X-ray dataset:', error);
    }
  }

  // Load Medical Reports Dataset
  async loadMedicalReportsDataset() {
    const datasetDir = path.join(this.datasetPath, 'medical-reports');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(datasetDir)) {
      console.log(`📁 Creating medical-reports directory at ${datasetDir}`);
      fs.mkdirSync(datasetDir, { recursive: true });
      return;
    }

    try {
      const files = fs.readdirSync(datasetDir);
      const records = [];
      
      for (const file of files) {
        const filePath = path.join(datasetDir, file);
        
        if (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.csv')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const searchText = `Medical report: ${content.substring(0, 500)}`;
          
          records.push({
            type: 'medical-report',
            data: { filename: file, content },
            searchText: searchText,
            metadata: { source: file, dataset: 'medical-reports' }
          });
        }
      }
      
      this.datasets.set('medical-reports', records);
      console.log(`📋 Loaded ${records.length} medical report records`);
      
    } catch (error) {
      console.error('Error loading medical reports:', error);
    }
  }

  // Search across all loaded datasets
  searchDatasets(query, options = {}) {
    if (!this.isLoaded) {
      console.warn('⚠️ Datasets not loaded yet, returning empty results');
      return [];
    }

    const {
      maxResults = 10,
      datasetTypes = null, // null means search all
      minScore = 0.1
    } = options;

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const results = [];

    // Search through all datasets
    for (const [datasetName, records] of this.datasets) {
      if (datasetTypes && !datasetTypes.includes(datasetName)) {
        continue; // Skip if specific dataset types requested
      }

      for (const record of records) {
        const score = this.calculateRelevanceScore(record.searchText, queryWords, queryLower);
        
        if (score > minScore) {
          results.push({
            id: `${datasetName}_${Math.random().toString(36).substr(2, 9)}`,
            dataset: datasetName,
            type: record.type,
            content: record.searchText,
            snippet: this.extractSnippet(record.searchText, queryLower),
            data: record.data,
            metadata: record.metadata,
            relevance_score: score,
            search_type: 'preloaded_dataset'
          });
        }
      }
    }

    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);
  }

  // Calculate relevance score
  calculateRelevanceScore(text, queryWords, fullQuery) {
    const textLower = text.toLowerCase();
    let score = 0;

    // Exact phrase match
    if (textLower.includes(fullQuery)) {
      score += 0.5;
    }

    // Individual word matches
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        score += 0.2;
      }
    }

    // Bonus for multiple word matches
    const matchCount = queryWords.filter(word => textLower.includes(word)).length;
    score += (matchCount / queryWords.length) * 0.3;

    return Math.min(score, 1.0);
  }

  // Extract relevant snippet
  extractSnippet(text, query, maxLength = 200) {
    const sentences = text.split(/[.!?]+/);
    const queryWords = query.split(/\s+/);
    
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
    
    return bestSentence.substring(0, maxLength) + (bestSentence.length > maxLength ? '...' : '');
  }

  // Helper methods
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  extractBrainScanCategory(filename) {
    const name = filename.toLowerCase();
    if (name.includes('tumor') || name.includes('mass') || name.includes('lesion')) return 'tumor';
    if (name.includes('normal') || name.includes('healthy')) return 'normal';
    if (name.includes('hemorrhage') || name.includes('bleed')) return 'hemorrhage';
    if (name.includes('stroke')) return 'stroke';
    return 'unknown';
  }

  extractXrayCategory(filename) {
    const name = filename.toLowerCase();
    if (name.includes('covid') || name.includes('coronavirus')) return 'covid';
    if (name.includes('pneumonia')) return 'pneumonia';
    if (name.includes('normal')) return 'normal';
    if (name.includes('viral')) return 'viral';
    if (name.includes('bacterial')) return 'bacterial';
    return 'unknown';
  }

  getTotalRecords() {
    let total = 0;
    for (const records of this.datasets.values()) {
      total += records.length;
    }
    return total;
  }

  logDatasetSummary() {
    console.log('\n📊 Dataset Loading Summary:');
    for (const [name, records] of this.datasets) {
      console.log(`   ${name}: ${records.length} records`);
    }
    console.log(`   Total: ${this.getTotalRecords()} records across ${this.datasets.size} datasets\n`);
  }

  // Get dataset statistics
  getStats() {
    return {
      isLoaded: this.isLoaded,
      totalDatasets: this.datasets.size,
      totalRecords: this.getTotalRecords(),
      datasets: Array.from(this.datasets.keys()),
      recordCounts: Object.fromEntries(
        Array.from(this.datasets.entries()).map(([name, records]) => [name, records.length])
      )
    };
  }
}

// Create singleton instance
const datasetLoader = new MedicalDatasetLoader();

export { datasetLoader, MedicalDatasetLoader };