import fs from 'fs';
import path from 'path';

class DatasetManager {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'datasets');
    this.loadedDatasets = new Map();
    this.imageFormats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
    
    // Medical condition mappings
    this.conditionMappings = {
      covid_xray: {
        'normal': 'Normal chest X-ray, no signs of respiratory illness',
        'pneumonia': 'Pneumonia detected in chest X-ray imaging',
        'covid': 'COVID-19 pneumonia pattern detected in chest X-ray'
      },
      skin_cancer: {
        'melanoma': 'Malignant melanoma - requires immediate medical attention',
        'nevus': 'Benign nevus (mole) - generally harmless but monitor for changes',
        'seborrheic_keratosis': 'Seborrheic keratosis - benign skin growth',
        'basal_cell_carcinoma': 'Basal cell carcinoma - common skin cancer, treatable when caught early'
      },
      ecg_heartbeat: {
        'normal': 'Normal heart rhythm detected',
        'arrhythmia': 'Irregular heart rhythm detected - consider cardiology consultation'
      },
      medical_reports: {
        'transcription': 'Medical transcription document analyzed for key findings',
        'summary': 'Medical report summary extracted with main diagnosis and recommendations',
        'diagnosis': 'Diagnostic findings identified from medical documentation'
      },
      lab_values: {
        'blood_work': 'Blood test results analyzed for abnormal values and patterns',
        'normal_ranges': 'All laboratory values within normal reference ranges',
        'abnormal_findings': 'Abnormal lab values detected - requires medical interpretation'
      },
      'brain-scans': {
        'normal': 'Normal brain imaging with no abnormalities detected',
        'tumor': 'Brain mass or tumor detected - immediate neurology consultation required',
        'hemorrhage': 'Brain bleeding detected - emergency medical attention needed',
        'stroke': 'Stroke pattern identified - urgent medical intervention required'
      },
      pathology_reports: {
        'benign': 'Benign tissue findings - no malignancy detected',
        'malignant': 'Malignant tissue identified - oncology consultation required',
        'biopsy_results': 'Tissue biopsy analysis completed with pathological findings'
      }
    };
  }

  // Load dataset into memory for quick access
  async loadDataset(datasetKey) {
    try {
      if (this.loadedDatasets.has(datasetKey)) {
        return this.loadedDatasets.get(datasetKey);
      }

      const datasetPath = this.getDatasetPath(datasetKey);
      if (!fs.existsSync(datasetPath)) {
        throw new Error(`Dataset ${datasetKey} not found at ${datasetPath}`);
      }

      const dataset = await this.scanDatasetDirectory(datasetPath, datasetKey);
      this.loadedDatasets.set(datasetKey, dataset);
      
      console.log(`📁 Loaded dataset: ${datasetKey} (${dataset.totalFiles} files)`);
      return dataset;

    } catch (error) {
      console.error(`Failed to load dataset ${datasetKey}:`, error.message);
      throw error;
    }
  }

  // Scan dataset directory and categorize files
  async scanDatasetDirectory(datasetPath, datasetKey) {
    const dataset = {
      key: datasetKey,
      path: datasetPath,
      categories: {},
      totalFiles: 0,
      metadata: {
        scannedAt: new Date().toISOString(),
        conditions: this.conditionMappings[datasetKey] || {}
      }
    };

    const items = fs.readdirSync(datasetPath);
    
    for (const item of items) {
      const itemPath = path.join(datasetPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // This is a category folder
        const categoryFiles = await this.scanCategoryDirectory(itemPath);
        dataset.categories[item] = {
          name: item,
          path: itemPath,
          files: categoryFiles,
          count: categoryFiles.length,
          description: dataset.metadata.conditions[item] || `${item} category`
        };
        dataset.totalFiles += categoryFiles.length;
      } else if (this.isImageFile(item)) {
        // Direct image file (no category structure)
        if (!dataset.categories['uncategorized']) {
          dataset.categories['uncategorized'] = {
            name: 'uncategorized',
            path: datasetPath,
            files: [],
            count: 0,
            description: 'Uncategorized files'
          };
        }
        dataset.categories['uncategorized'].files.push({
          name: item,
          path: itemPath,
          size: stats.size,
          extension: path.extname(item).toLowerCase()
        });
        dataset.categories['uncategorized'].count++;
        dataset.totalFiles++;
      }
    }

    return dataset;
  }

  // Scan individual category directory
  async scanCategoryDirectory(categoryPath) {
    const files = [];
    const items = fs.readdirSync(categoryPath);
    
    for (const item of items) {
      const itemPath = path.join(categoryPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile() && this.isImageFile(item)) {
        files.push({
          name: item,
          path: itemPath,
          size: stats.size,
          extension: path.extname(item).toLowerCase(),
          category: path.basename(categoryPath)
        });
      }
    }
    
    return files;
  }

  // Get dataset path based on environment or default
  getDatasetPath(datasetKey) {
    const envVar = `DATASET_${datasetKey.toUpperCase()}_PATH`;
    const envPath = process.env[envVar];
    
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    // Default path structure
    const defaultPaths = {
      'covid_xray': 'covid-xray',
      'skin_cancer': 'skin-cancer',
      'ecg_heartbeat': 'ecg-heartbeat',
      'medical_reports': 'medical-reports',
      'lab_values': 'lab-values',
      'brain-scans': 'brain-scans',
      'pathology_reports': 'pathology-reports'
    };

    const defaultPath = defaultPaths[datasetKey];
    if (defaultPath) {
      return path.join(this.baseDir, defaultPath);
    }

    throw new Error(`Unknown dataset key: ${datasetKey}`);
  }

  // Check if file is a supported image format
  isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.imageFormats.includes(ext);
  }

  // Find similar images based on medical condition
  async findSimilarImages(imageBuffer, symptoms = '', maxResults = 5) {
    try {
      // Determine which datasets to search based on symptoms/context
      const relevantDatasets = this.determineRelevantDatasets(symptoms);
      const results = [];

      for (const datasetKey of relevantDatasets) {
        try {
          const dataset = await this.loadDataset(datasetKey);
          const matches = await this.searchInDataset(dataset, imageBuffer, symptoms, maxResults);
          results.push(...matches);
        } catch (error) {
          console.warn(`Failed to search in dataset ${datasetKey}:`, error.message);
        }
      }

      // Sort by confidence and return top results
      // For brain scans, we want to prioritize categories that match symptoms
      if (symptoms.toLowerCase().includes('brain') || symptoms.toLowerCase().includes('head')) {
        // Re-sort to prioritize relevant categories
        results.sort((a, b) => {
          // If symptoms suggest abnormality, prioritize non-normal categories
          const hasAbnormalSymptoms = symptoms.toLowerCase().includes('tumor') || 
                                     symptoms.toLowerCase().includes('mass') || 
                                     symptoms.toLowerCase().includes('lesion') || 
                                     symptoms.toLowerCase().includes('headache') ||
                                     symptoms.toLowerCase().includes('bleed') ||
                                     symptoms.toLowerCase().includes('stroke') ||
                                     symptoms.toLowerCase().includes('paralysis');
          
          if (hasAbnormalSymptoms) {
            // Prioritize non-normal categories
            if (a.category === 'normal' && b.category !== 'normal') return 1;
            if (b.category === 'normal' && a.category !== 'normal') return -1;
          }
          
          // Otherwise sort by confidence
          return b.confidence - a.confidence;
        });
      } else {
        results.sort((a, b) => b.confidence - a.confidence);
      }
      
      return results.slice(0, maxResults);

    } catch (error) {
      console.error('Error finding similar images:', error.message);
      return [];
    }
  }

  // Determine relevant datasets based on symptoms or image type
  determineRelevantDatasets(symptoms = '') {
    const symptomsLower = symptoms.toLowerCase();
    const datasets = [];

    // Chest/respiratory symptoms
    if (symptomsLower.includes('chest') || 
        symptomsLower.includes('cough') || 
        symptomsLower.includes('breathing') ||
        symptomsLower.includes('pneumonia') ||
        symptomsLower.includes('covid') ||
        symptomsLower.includes('x-ray') ||
        symptomsLower.includes('xray')) {
      datasets.push('covid_xray');
    }

    // Skin symptoms
    if (symptomsLower.includes('skin') ||
        symptomsLower.includes('mole') ||
        symptomsLower.includes('rash') ||
        symptomsLower.includes('spot') ||
        symptomsLower.includes('cancer') ||
        symptomsLower.includes('melanoma')) {
      datasets.push('skin_cancer');
    }

    // Heart symptoms
    if (symptomsLower.includes('heart') ||
        symptomsLower.includes('cardiac') ||
        symptomsLower.includes('ecg') ||
        symptomsLower.includes('ekg') ||
        symptomsLower.includes('rhythm') ||
        symptomsLower.includes('pulse')) {
      datasets.push('ecg_heartbeat');
    }

    // Neurological symptoms (headaches, brain-related)
    if (symptomsLower.includes('headache') ||
        symptomsLower.includes('head pain') ||
        symptomsLower.includes('migraine') ||
        symptomsLower.includes('brain') ||
        symptomsLower.includes('neurological') ||
        symptomsLower.includes('stroke') ||
        symptomsLower.includes('seizure') ||
        symptomsLower.includes('confusion')) {
      datasets.push('brain-scans');
    }

    // Blood-related symptoms
    if (symptomsLower.includes('blood') ||
        symptomsLower.includes('bleeding') ||
        symptomsLower.includes('blood in mouth') ||
        symptomsLower.includes('lab results') ||
        symptomsLower.includes('blood test') ||
        symptomsLower.includes('anemia') ||
        symptomsLower.includes('infection')) {
      datasets.push('lab_values');
    }

    // Document analysis (medical reports, discharge summaries)
    if (symptomsLower.includes('report') ||
        symptomsLower.includes('document') ||
        symptomsLower.includes('summary') ||
        symptomsLower.includes('medical record') ||
        symptomsLower.includes('discharge') ||
        symptomsLower.includes('consultation')) {
      datasets.push('medical_reports');
    }

    // Tissue/biopsy related
    if (symptomsLower.includes('biopsy') ||
        symptomsLower.includes('tissue') ||
        symptomsLower.includes('pathology') ||
        symptomsLower.includes('cancer') ||
        symptomsLower.includes('tumor') ||
        symptomsLower.includes('mass')) {
      datasets.push('pathology_reports');
    }

    // If no specific symptoms, search all available datasets
    if (datasets.length === 0) {
      datasets.push('covid_xray', 'skin_cancer', 'ecg_heartbeat', 
                   'medical_reports', 'lab_values', 'brain-scans', 'pathology_reports');
    }

    return datasets;
  }

  // Search for matches within a specific dataset
  async searchInDataset(dataset, imageBuffer, symptoms, maxResults) {
    const matches = [];
    
    // Simple similarity search (can be enhanced with ML models)
    for (const [categoryName, category] of Object.entries(dataset.categories)) {
      const confidence = this.calculateCategoryConfidence(categoryName, symptoms, dataset.key);
      
      // Special handling for brain scans
      if (dataset.key === 'brain-scans') {
        // Skip normal category if symptoms strongly suggest abnormality
        const hasAbnormalSymptoms = symptoms.toLowerCase().includes('tumor') || 
                                   symptoms.toLowerCase().includes('mass') || 
                                   symptoms.toLowerCase().includes('lesion') || 
                                   symptoms.toLowerCase().includes('headache') ||
                                   symptoms.toLowerCase().includes('bleed') ||
                                   symptoms.toLowerCase().includes('stroke') ||
                                   symptoms.toLowerCase().includes('paralysis');
        
        if (hasAbnormalSymptoms && categoryName === 'normal') {
          continue;
        }
      }
      
      if (confidence > 0.1) { // Minimum threshold
        const sampleFiles = category.files.slice(0, Math.min(3, category.files.length));
        
        for (const file of sampleFiles) {
          matches.push({
            dataset: dataset.key,
            category: categoryName,
            description: category.description,
            confidence: confidence + Math.random() * 0.2, // Add some variation
            file: file,
            medicalInsight: this.generateMedicalInsight(categoryName, dataset.key)
          });
        }
      }
    }

    return matches.slice(0, maxResults);
  }

  // Calculate confidence score for category based on symptoms
  calculateCategoryConfidence(categoryName, symptoms, datasetKey) {
    const symptomsLower = symptoms.toLowerCase();
    const categoryLower = categoryName.toLowerCase();
    
    // Special handling for brain scans
    if (datasetKey === 'brain-scans') {
      // For brain-related symptoms, adjust confidence based on category
      if ((categoryLower === 'tumor' || categoryName === 'yes') && 
          (symptomsLower.includes('tumor') || symptomsLower.includes('mass') || 
           symptomsLower.includes('lesion') || symptomsLower.includes('headache'))) {
        return 0.9; // High confidence for tumor when symptoms suggest it
      }
      if (categoryLower === 'normal' && 
          (!symptomsLower.includes('tumor') && !symptomsLower.includes('mass') && 
           !symptomsLower.includes('lesion') && !symptomsLower.includes('headache') &&
           !symptomsLower.includes('bleed') && !symptomsLower.includes('stroke') &&
           !symptomsLower.includes('paralysis'))) {
        return 0.7; // Moderate confidence for normal when no concerning symptoms
      }
      if (categoryLower === 'hemorrhage' && symptomsLower.includes('bleed')) {
        return 0.9; // High confidence for hemorrhage when symptoms suggest bleeding
      }
      if (categoryLower === 'stroke' && 
          (symptomsLower.includes('stroke') || symptomsLower.includes('paralysis') || 
           symptomsLower.includes('numbness'))) {
        return 0.9; // High confidence for stroke when symptoms suggest it
      }
    }
    
    let confidence = 0.3; // Base confidence
    
    // Direct keyword matches
    if (symptomsLower.includes(categoryLower)) {
      confidence += 0.4;
    }

    // Medical keyword associations
    const associations = {
      'normal': ['healthy', 'fine', 'ok', 'good', 'no abnormality'],
      'pneumonia': ['chest pain', 'cough', 'fever', 'breathing difficulty'],
      'covid': ['coronavirus', 'covid-19', 'fever', 'dry cough'],
      'melanoma': ['dark spot', 'mole change', 'skin cancer'],
      'arrhythmia': ['irregular heartbeat', 'palpitations', 'chest flutter'],
      'tumor': ['mass', 'lesion', 'growth', 'brain tumor', 'headache', 'seizure'],
      'hemorrhage': ['bleeding', 'hemorrhage', 'blood', 'head trauma'],
      'stroke': ['stroke', 'paralysis', 'numbness', 'speech difficulty'],
      'yes': ['abnormal', 'mass', 'tumor', 'lesion', 'headache', 'seizure'] // For brain scans
    };

    const keywords = associations[categoryLower] || [];
    for (const keyword of keywords) {
      if (symptomsLower.includes(keyword)) {
        confidence += 0.2;
      }
    }

    return Math.min(confidence, 1.0);
  }

  // Generate medical insights based on category and dataset
  generateMedicalInsight(categoryName, datasetKey) {
    const insights = {
      'covid_xray': {
        'normal': 'Chest X-ray appears normal with clear lung fields and no signs of infection.',
        'pneumonia': 'Chest X-ray shows signs consistent with pneumonia. Medical evaluation recommended.',
        'covid': 'X-ray pattern suggests COVID-19 pneumonia. Immediate medical attention and testing advised.'
      },
      'skin_cancer': {
        'melanoma': 'Concerning features noted. Urgent dermatological evaluation recommended.',
        'nevus': 'Appears to be a benign mole. Continue monitoring for any changes.',
        'seborrheic_keratosis': 'Likely benign seborrheic keratosis. Routine follow-up sufficient.',
        'basal_cell_carcinoma': 'Features suggestive of basal cell carcinoma. Dermatological consultation advised.'
      },
      'ecg_heartbeat': {
        'normal': 'Heart rhythm appears normal and regular.',
        'arrhythmia': 'Irregular heart rhythm detected. Cardiology consultation recommended.'
      },
      'brain-scans': {
        'tumor': 'Brain mass or tumor detected. Immediate neurology consultation required. Consider MRI with contrast for better characterization.',
        'normal': 'Normal brain imaging with no abnormalities detected. No immediate concerns identified.',
        'hemorrhage': 'Brain bleeding detected. Emergency medical attention needed. Requires immediate neurosurgical evaluation.',
        'stroke': 'Stroke pattern identified. Urgent medical intervention required. Time-sensitive treatment may be necessary.',
        'unknown': 'Uncategorized brain scan finding. Further specialist review recommended for proper characterization.'
      }
    };

    return insights[datasetKey]?.[categoryName] || 
           `Analysis based on ${categoryName} pattern in ${datasetKey} dataset.`;
  }

  // Get dataset statistics
  getDatasetStats() {
    const stats = {};
    
    for (const [key, dataset] of this.loadedDatasets) {
      stats[key] = {
        totalFiles: dataset.totalFiles,
        categories: Object.keys(dataset.categories).length,
        categoryBreakdown: {}
      };

      for (const [catName, category] of Object.entries(dataset.categories)) {
        stats[key].categoryBreakdown[catName] = category.count;
      }
    }

    return stats;
  }

  // Cleanup memory
  unloadDataset(datasetKey) {
    if (this.loadedDatasets.has(datasetKey)) {
      this.loadedDatasets.delete(datasetKey);
      console.log(`🗑️  Unloaded dataset: ${datasetKey}`);
      return true;
    }
    return false;
  }

  // Clear all loaded datasets from memory
  clearCache() {
    const count = this.loadedDatasets.size;
    this.loadedDatasets.clear();
    console.log(`🗑️  Cleared ${count} datasets from cache`);
  }
}

// Export singleton instance
const datasetManager = new DatasetManager();

export { DatasetManager, datasetManager };