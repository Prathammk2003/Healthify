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

  async initialize() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      for (const dataset of Object.values(DATASETS)) {
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

  async checkKaggleConfig() {
    try {
      await execAsync('kaggle datasets list --max-size 1');
      this.log('Kaggle API configured successfully');
      return true;
    } catch {
      this.log('Kaggle API not configured. Please run: pip install kaggle', 'error');
      this.log('Then add your Kaggle credentials to environment variables', 'error');
      return false;
    }
  }

  async downloadDataset(datasetKey, onProgress = null) {
    const dataset = DATASETS[datasetKey];
    if (!dataset) throw new Error(`Dataset ${datasetKey} not found`);
    this.log(`Starting download: ${dataset.name} (${dataset.size})`);
    if (onProgress) this.progressCallbacks.set(datasetKey, onProgress);
    try {
      const downloadPath = path.join(this.baseDir, dataset.downloadPath);
      if (this.isDatasetDownloaded(datasetKey)) {
        this.log(`Dataset ${dataset.name} already exists, skipping download`);
        onProgress && onProgress({ status: 'completed', progress: 100 });
        return { success: true, path: downloadPath, cached: true };
      }
      onProgress && onProgress({ status: 'downloading', progress: 10 });
      const command = `kaggle datasets download -d ${dataset.kaggleId} -p "${downloadPath}" --unzip`;
      this.log(`Executing: ${command}`);
      const { stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
      if (stderr && !stderr.includes('100%')) {
        throw new Error(`Download failed: ${stderr}`);
      }
      onProgress && onProgress({ status: 'extracting', progress: 80 });
      if (this.isDatasetDownloaded(datasetKey)) {
        this.log(`Successfully downloaded: ${dataset.name}`);
        onProgress && onProgress({ status: 'completed', progress: 100 });
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

  async downloadAllDatasets(onProgress = null) {
    this.log('Starting automatic download of all medical datasets');
    const results = {};
    const total = Object.keys(DATASETS).length;
    let done = 0;
    for (const key of Object.keys(DATASETS)) {
      const progress = (p) => {
        const overallProgress = Math.round((done / total + p.progress / 100 / total) * 100);
        onProgress && onProgress({ currentDataset: DATASETS[key].name, datasetProgress: p, overallProgress, completed: done, total });
      };
      results[key] = await this.downloadDataset(key, progress);
      done++;
      if (done < total) await this.delay(2000);
    }
    this.log('Automatic download completed');
    return results;
  }

  isDatasetDownloaded(datasetKey) {
    const dataset = DATASETS[datasetKey];
    const datasetPath = path.join(this.baseDir, dataset.downloadPath);
    if (!fs.existsSync(datasetPath)) return false;
    const files = fs.readdirSync(datasetPath);
    return files.length > 0;
  }

  getDatasetStatus() {
    const status = {};
    for (const [key, dataset] of Object.entries(DATASETS)) {
      const downloaded = this.isDatasetDownloaded(key);
      const p = downloaded ? path.join(this.baseDir, dataset.downloadPath) : null;
      status[key] = { name: dataset.name, size: dataset.size, downloaded, path: p, description: dataset.description, type: dataset.type, categories: dataset.categories };
    }
    return status;
  }

  async updateEnvConfig(datasetKey, datasetPath) {
    try {
      const envVar = `DATASET_${datasetKey.toUpperCase()}_PATH`;
      const envLine = `${envVar}=${datasetPath}`;
      let envContent = '';
      if (fs.existsSync(this.configPath)) envContent = fs.readFileSync(this.configPath, 'utf8');
      const lines = envContent.split('\n');
      const idx = lines.findIndex(line => line.startsWith(`${envVar}=`));
      if (idx !== -1) lines[idx] = envLine; else lines.push(envLine);
      fs.writeFileSync(this.configPath, lines.join('\n'));
      this.log(`Updated environment variable: ${envVar}`);
    } catch (error) {
      this.log(`Failed to update environment config: ${error.message}`, 'error');
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
    try { fs.appendFileSync(this.downloadLog, logMessage + '\n'); } catch (e) { console.error('Failed to write to log file:', e.message); }
  }

  delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  getProgress(datasetKey) { return this.progressCallbacks.get(datasetKey) || null; }
  async cleanupDataset(datasetKey) {
    const dataset = DATASETS[datasetKey];
    if (!dataset) throw new Error(`Dataset ${datasetKey} not found`);
    const datasetPath = path.join(this.baseDir, dataset.downloadPath);
    if (fs.existsSync(datasetPath)) { fs.rmSync(datasetPath, { recursive: true, force: true }); this.log(`Cleaned up dataset: ${dataset.name}`); return true; }
    return false;
  }
}

const downloader = new DatasetDownloader();
module.exports = { DatasetDownloader, downloader, DATASETS };


