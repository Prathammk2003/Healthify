import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { connectDB } from '@/lib/db';

// Model training status cache
let trainingStatus = {
  isTraining: false,
  progress: 0,
  currentModel: null,
  lastTrained: null,
  logs: []
};

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { action, modelType } = body;

    if (action === 'train') {
      return await startTraining(modelType);
    } else if (action === 'status') {
      return NextResponse.json(await getTrainingStatus());
    } else if (action === 'models') {
      return NextResponse.json(await getTrainedModels());
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Model training API error:', error);
    return NextResponse.json({ 
      error: 'Training API failed', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'status';

    if (action === 'status') {
      return NextResponse.json(await getTrainingStatus());
    } else if (action === 'models') {
      return NextResponse.json(await getTrainedModels());
    } else if (action === 'logs') {
      return NextResponse.json(await getTrainingLogs());
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Model training GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to get training status', 
      details: error.message 
    }, { status: 500 });
  }
}

async function startTraining(modelType = 'all') {
  if (trainingStatus.isTraining) {
    return NextResponse.json({ 
      error: 'Training already in progress',
      status: trainingStatus
    }, { status: 409 });
  }

  try {
    // Reset training status
    trainingStatus = {
      isTraining: true,
      progress: 0,
      currentModel: 'initializing',
      startTime: new Date().toISOString(),
      logs: ['Training started...']
    };

    // Start training process
    const pythonScript = path.join(process.cwd(), 'src', 'lib', 'model-trainer.py');
    
    const trainingProcess = spawn('python', [pythonScript], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle training output
    trainingProcess.stdout.on('data', (data) => {
      const output = data.toString();
      trainingStatus.logs.push(output);
      
      // Parse progress from output
      if (output.includes('Training')) {
        if (output.includes('ECG')) {
          trainingStatus.currentModel = 'ECG Heartbeat';
          trainingStatus.progress = 25;
        } else if (output.includes('Diabetes')) {
          trainingStatus.currentModel = 'Diabetes Prediction';
          trainingStatus.progress = 50;
        } else if (output.includes('Medical')) {
          trainingStatus.currentModel = 'Medical Text Classification';
          trainingStatus.progress = 75;
        }
      }
      
      if (output.includes('completed')) {
        trainingStatus.progress = 100;
      }
    });

    trainingProcess.stderr.on('data', (data) => {
      trainingStatus.logs.push(`Error: ${data.toString()}`);
    });

    trainingProcess.on('close', (code) => {
      trainingStatus.isTraining = false;
      trainingStatus.currentModel = null;
      trainingStatus.endTime = new Date().toISOString();
      
      if (code === 0) {
        trainingStatus.lastTrained = new Date().toISOString();
        trainingStatus.logs.push('Training completed successfully!');
      } else {
        trainingStatus.logs.push(`Training failed with code ${code}`);
      }
    });

    return NextResponse.json({
      message: 'Training started',
      status: trainingStatus
    });

  } catch (error) {
    trainingStatus.isTraining = false;
    trainingStatus.logs.push(`Training error: ${error.message}`);
    
    return NextResponse.json({ 
      error: 'Failed to start training',
      details: error.message
    }, { status: 500 });
  }
}

async function getTrainingStatus() {
  try {
    const modelsDir = path.join(process.cwd(), 'trained_models');
    const summaryPath = path.join(modelsDir, 'training_summary.json');
    
    let trainingSummary = null;
    if (fs.existsSync(summaryPath)) {
      trainingSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    }

    return {
      ...trainingStatus,
      trainingSummary,
      datasetsAvailable: await checkDatasetsAvailable()
    };

  } catch (error) {
    return {
      ...trainingStatus,
      error: error.message
    };
  }
}

async function getTrainedModels() {
  try {
    const modelsDir = path.join(process.cwd(), 'trained_models');
    
    if (!fs.existsSync(modelsDir)) {
      return { models: [], count: 0 };
    }

    const models = [];
    const metadataFiles = [
      'ecg_heartbeat_metadata.json',
      'diabetes_metadata.json',
      'medical_text_metadata.json'
    ];

    for (const file of metadataFiles) {
      const filePath = path.join(modelsDir, file);
      if (fs.existsSync(filePath)) {
        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        models.push({
          ...metadata,
          size: await getModelSize(metadata.model_path)
        });
      }
    }

    return {
      models,
      count: models.length,
      totalSize: models.reduce((sum, model) => sum + (model.size || 0), 0)
    };

  } catch (error) {
    return {
      error: error.message,
      models: [],
      count: 0
    };
  }
}

async function getTrainingLogs() {
  try {
    const modelsDir = path.join(process.cwd(), 'trained_models');
    const logPath = path.join(modelsDir, 'training.log');
    
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf8');
      return {
        logs: logs.split('\n').filter(line => line.trim()),
        currentLogs: trainingStatus.logs
      };
    }

    return {
      logs: [],
      currentLogs: trainingStatus.logs
    };

  } catch (error) {
    return {
      error: error.message,
      logs: [],
      currentLogs: trainingStatus.logs
    };
  }
}

async function checkDatasetsAvailable() {
  try {
    const datasetsDir = path.join(process.cwd(), 'datasets');
    
    if (!fs.existsSync(datasetsDir)) {
      return { available: false, reason: 'Datasets directory not found' };
    }

    const requiredDatasets = [
      'ecg-heartbeat/mitbih_train.csv',
      'diabetes/diabetes.csv',
      'medical-transcriptions/mtsamples.csv'
    ];

    const availableDatasets = [];
    const missingDatasets = [];

    for (const dataset of requiredDatasets) {
      const datasetPath = path.join(datasetsDir, dataset);
      if (fs.existsSync(datasetPath)) {
        availableDatasets.push(dataset);
      } else {
        missingDatasets.push(dataset);
      }
    }

    return {
      available: missingDatasets.length === 0,
      availableDatasets,
      missingDatasets,
      totalRequired: requiredDatasets.length,
      totalAvailable: availableDatasets.length
    };

  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}

async function getModelSize(modelPath) {
  try {
    if (modelPath && fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath);
      return stats.size;
    }
    return 0;
  } catch {
    return 0;
  }
}