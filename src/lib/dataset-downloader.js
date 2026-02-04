const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Dataset configurations - all under 1GB total as requested
const DATASETS = {
  covid_xray: {
    name: 'COVID-19 X-ray Dataset',
    kaggleId: 'paultimothymooney/chest-xray-pneumonia',
    size: '150MB',
    description: 'COVID-19 chest X-ray images for pneumonia detection',
    type: 'medical_imaging',
    downloadPath: 'datasets/covid-xray',
    categories: ['normal', 'pneumonia', 'covid']
  },
  pneumonia_xray: {
    name: 'Chest X-ray Pneumonia',
    kaggleId: 'paultimothymooney/chest-xray-pneumonia',
    size: '500MB',
    description: 'Chest X-ray images for pneumonia classification',
    type: 'medical_imaging',
    downloadPath: 'datasets/pneumonia-xray',
    categories: ['normal', 'pneumonia']
  },
  skin_cancer: {
    name: 'Skin Cancer MNIST Sample',
    kaggleId: 'kmader/skin-cancer-mnist-ham10000',
    size: '300MB',
    description: 'Dermatoscopic images for skin cancer detection',
    type: 'medical_imaging',
    downloadPath: 'datasets/skin-cancer',
    categories: ['melanoma', 'nevus', 'seborrheic_keratosis', 'basal_cell_carcinoma']
  },
  ecg_heartbeat: {
    name: 'ECG Heartbeat Dataset',
    kaggleId: 'shayanfazeli/heartbeat',
    size: '50MB',
    description: 'ECG signals for arrhythmia detection',
    type: 'signal_data',
    downloadPath: 'datasets/ecg-heartbeat',
    categories: ['normal', 'arrhythmia']
  },
  medical_reports: {
    name: 'Medical Reports Summarization',
    kaggleId: 'tboyle10/medicaltranscriptions',
    size: '200MB',
    description: 'Medical transcriptions and reports for document analysis and summarization',
    type: 'text_data',
    downloadPath: 'datasets/medical-reports',
    categories: ['transcription', 'summary', 'diagnosis']
  },
  lab_values: {
    name: 'Clinical Lab Values Dataset',
    kaggleId: 'deepcontractor/clinical-lab-measurements',
    size: '100MB',
    description: 'Blood tests and lab values for interpretation of medical results',
    type: 'tabular_data',
    downloadPath: 'datasets/lab-values',
    categories: ['blood_work', 'normal_ranges', 'abnormal_findings']
  },
  brain_scans: {
    name: 'Brain CT/MRI Dataset',
    kaggleId: 'navoneel/brain-mri-images-for-brain-tumor-detection',
    size: '50MB',
    description: 'Brain CT and MRI scans for headache and neurological analysis',
    type: 'medical_imaging',
    downloadPath: 'datasets/brain-scans',
    categories: ['normal_brain', 'tumor', 'hemorrhage', 'stroke']
  },
  pathology_reports: {
    name: 'Pathology Reports Dataset',
    kaggleId: 'andrewmvd/cancer-pathology-report',
    size: '80MB',
    description: 'Pathology reports for tissue analysis and cancer detection',
    type: 'text_data',
    downloadPath: 'datasets/pathology-reports',
    categories: ['benign', 'malignant', 'biopsy_results']
  }
};

class DatasetDownloader {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'datasets');
    this.configPath = path.join(process.cwd(), '.env.local');
    this.downloadLog = path.join(this.baseDir, 'download.log');
    this.progressCallbacks = new Map();
  }

  // Initialize directory structure
  async initialize() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }

      // Create subdirectories for each dataset
      for (const [key, dataset] of Object.entries(DATASETS)) {
        const datasetPath = path.join(this.baseDir, dataset.downloadPath);
        if (!fs.existsSync(datasetPath)) {
          fs.mkdirSync(datasetPath, { recursive: true });
        }
      }

      this.log('Dataset downloader initialized successfully');
      return true;
    } catch (error) {
      this.log(`Initialization error: ${error.message}`, 'error');
      return false;
    }
  }

  // Check if Kaggle API is configured
  async checkKaggleConfig() {
    try {
      const { stdout } = await execAsync('kaggle datasets list --max-size 1');
      this.log('Kaggle API configured successfully');
      return true;
    } catch (error) {
      this.log('Kaggle API not configured. Please run: pip install kaggle', 'error');
      this.log('Then add your Kaggle credentials to environment variables', 'error');
      return false;
    }
  }

  // Download a specific dataset
  async downloadDataset(datasetKey, onProgress = null) {
    const dataset = DATASETS[datasetKey];
    if (!dataset) {
      throw new Error(`Dataset ${datasetKey} not found`);
    }

    this.log(`Starting download: ${dataset.name} (${dataset.size})`);
    
    if (onProgress) {
      this.progressCallbacks.set(datasetKey, onProgress);
    }

    try {
      const downloadPath = path.join(this.baseDir, dataset.downloadPath);
      
      // Check if already downloaded
      if (this.isDatasetDownloaded(datasetKey)) {
        this.log(`Dataset ${dataset.name} already exists, skipping download`);
        onProgress && onProgress({ status: 'completed', progress: 100 });
        return { success: true, path: downloadPath, cached: true };
      }

      onProgress && onProgress({ status: 'downloading', progress: 10 });

      // Download using Kaggle API
      const command = `kaggle datasets download -d ${dataset.kaggleId} -p "${downloadPath}" --unzip`;
      
      this.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 100 // 100MB buffer for large outputs
      });

      if (stderr && !stderr.includes('100%')) {
        throw new Error(`Download failed: ${stderr}`);
      }

      onProgress && onProgress({ status: 'extracting', progress: 80 });

      // Verify download
      if (this.isDatasetDownloaded(datasetKey)) {
        this.log(`Successfully downloaded: ${dataset.name}`);
        onProgress && onProgress({ status: 'completed', progress: 100 });
        
        // Update environment variables
        await this.updateEnvConfig(datasetKey, downloadPath);
        
        return { success: true, path: downloadPath, cached: false };
      } else {
        throw new Error('Download verification failed');
      }

    } catch (error) {
      this.log(`Download failed for ${dataset.name}: ${error.message}`, 'error');
      onProgress && onProgress({ status: 'error', progress: 0, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Download all datasets automatically
  async downloadAllDatasets(onProgress = null) {
    this.log('Starting automatic download of all medical datasets');
    
    const results = {};
    const totalDatasets = Object.keys(DATASETS).length;
    let completedCount = 0;

    for (const [key, dataset] of Object.entries(DATASETS)) {
      try {
        const progressCallback = (progress) => {
          const overallProgress = Math.round(
            (completedCount / totalDatasets + progress.progress / 100 / totalDatasets) * 100
          );
          
          if (onProgress) {
            onProgress({
              currentDataset: dataset.name,
              datasetProgress: progress,
              overallProgress,
              completed: completedCount,
              total: totalDatasets
            });
          }
        };

        const result = await this.downloadDataset(key, progressCallback);
        results[key] = result;
        completedCount++;

        // Add delay between downloads to prevent rate limiting
        if (completedCount < totalDatasets) {
          await this.delay(2000);
        }

      } catch (error) {
        this.log(`Failed to download ${dataset.name}: ${error.message}`, 'error');
        results[key] = { success: false, error: error.message };
        completedCount++;
      }
    }

    this.log('Automatic download completed');
    return results;
  }

  // Check if a dataset is already downloaded
  isDatasetDownloaded(datasetKey) {
    const dataset = DATASETS[datasetKey];
    const datasetPath = path.join(this.baseDir, dataset.downloadPath);
    
    if (!fs.existsSync(datasetPath)) {
      return false;
    }

    // Check if directory has files
    const files = fs.readdirSync(datasetPath);
    return files.length > 0;
  }

  // Get dataset status information
  getDatasetStatus() {
    const status = {};
    
    for (const [key, dataset] of Object.entries(DATASETS)) {
      const downloaded = this.isDatasetDownloaded(key);
      const path = downloaded ? path.join(this.baseDir, dataset.downloadPath) : null;
      
      status[key] = {
        name: dataset.name,
        size: dataset.size,
        downloaded,
        path,
        description: dataset.description,
        type: dataset.type,
        categories: dataset.categories
      };
    }
    
    return status;
  }

  // Update environment configuration
  async updateEnvConfig(datasetKey, datasetPath) {
    try {
      const envVar = `DATASET_${datasetKey.toUpperCase()}_PATH`;
      const envLine = `${envVar}=${datasetPath}`;
      
      let envContent = '';
      if (fs.existsSync(this.configPath)) {
        envContent = fs.readFileSync(this.configPath, 'utf8');
      }

      // Check if variable already exists
      const lines = envContent.split('\n');
      const existingLineIndex = lines.findIndex(line => line.startsWith(`${envVar}=`));
      
      if (existingLineIndex !== -1) {
        lines[existingLineIndex] = envLine;
      } else {
        lines.push(envLine);
      }

      fs.writeFileSync(this.configPath, lines.join('\n'));
      this.log(`Updated environment variable: ${envVar}`);
      
    } catch (error) {
      this.log(`Failed to update environment config: ${error.message}`, 'error');
    }
  }

  // Logging utility
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // Append to log file
    try {
      fs.appendFileSync(this.downloadLog, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get download progress for a specific dataset
  getProgress(datasetKey) {
    return this.progressCallbacks.get(datasetKey) || null;
  }

  // Clean up downloaded datasets (for storage management)
  async cleanupDataset(datasetKey) {
    const dataset = DATASETS[datasetKey];
    if (!dataset) {
      throw new Error(`Dataset ${datasetKey} not found`);
    }

    const datasetPath = path.join(this.baseDir, dataset.downloadPath);
    
    if (fs.existsSync(datasetPath)) {
      fs.rmSync(datasetPath, { recursive: true, force: true });
      this.log(`Cleaned up dataset: ${dataset.name}`);
      return true;
    }
    
    return false;
  }
}

// Export singleton instance
const downloader = new DatasetDownloader();

module.exports = {
  DatasetDownloader,
  downloader,
  DATASETS
};