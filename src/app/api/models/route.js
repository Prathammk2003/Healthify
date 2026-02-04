import { NextResponse } from 'next/server';
import { modelLoader } from '@/lib/model-loader';
import { medicalAnalysisPipeline } from '@/lib/medical-analysis-pipeline';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function POST(req) {
  try {
    // Parse form data
    const formData = await req.formData();
    const modality = formData.get('modality');
    const file = formData.get('file');
    const symptoms = formData.get('symptoms') || '';
    
    if (!modality) {
      return NextResponse.json({ error: 'Modality is required' }, { status: 400 });
    }
    
    console.log(`Processing ${modality} analysis request`);
    
    // Handle different modalities for raw patient inputs
    if (modality === 'brain-scan' || modality === 'breast-cancer') {
      // Handle medical images (MRI, X-ray, CT scans)
      if (!file) {
        return NextResponse.json({ error: 'File is required for image modalities' }, { status: 400 });
      }
      
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      return await processMedicalImage(fileBuffer, modality, symptoms);
    } 
    else if (modality === 'ecg') {
      // Handle ECG signal data
      if (!file) {
        return NextResponse.json({ error: 'File is required for ECG modality' }, { status: 400 });
      }
      
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const csvData = fileBuffer.toString();
      return await processECGData(csvData, symptoms);
    } 
    else if (modality === 'diabetes' || modality === 'stroke' || modality === 'heart-disease') {
      // Handle tabular medical data
      if (!file) {
        // If no file, try to parse symptoms as JSON
        try {
          const features = JSON.parse(symptoms);
          return await processTabularData(features, modality);
        } catch (e) {
          return NextResponse.json({ error: 'File or JSON features are required for tabular data modalities' }, { status: 400 });
        }
      }
      
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const csvData = fileBuffer.toString();
      return await processTabularDataFromCSV(csvData, modality);
    } 
    else if (modality === 'medical-report') {
      // Handle text-based medical reports
      let textContent = symptoms;
      if (file) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        textContent = fileBuffer.toString();
      }
      
      if (!textContent) {
        return NextResponse.json({ error: 'Text content is required for medical reports' }, { status: 400 });
      }
      
      return await processMedicalText(textContent, modality);
    }
    else {
      return NextResponse.json({ error: `Unsupported modality: ${modality}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Model inference error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Process medical images (brain scans, breast cancer, etc.)
async function processMedicalImage(fileBuffer, modality, symptoms) {
  try {
    console.log(`Preprocessing ${modality} image`);
    
    // Use the medical analysis pipeline to process the image
    const file = {
      name: `${modality}_upload.jpg`,
      buffer: fileBuffer,
      type: 'image/jpeg'
    };
    
    const analysisResult = await medicalAnalysisPipeline.analyzeMedicalFile(file, symptoms);
    
    if (!analysisResult.success) {
      throw new Error(`Analysis failed: ${analysisResult.error}`);
    }
    
    // Extract prediction and confidence from findings
    const findings = analysisResult.analysis.findings || [];
    let prediction = 'normal';
    let confidence = 0;
    
    if (findings.length > 0) {
      // Get the finding with highest confidence
      const topFinding = findings.reduce((prev, current) => 
        (prev.confidence > current.confidence) ? prev : current
      );
      prediction = topFinding.label.toLowerCase().replace(/\s+/g, '_');
      confidence = topFinding.confidence;
    }
    
    // Simple risk stratification
    let risk = "Low";
    if (confidence > 0.75) risk = "High";
    else if (confidence > 0.5) risk = "Moderate";
    
    // Patient-friendly text
    const patientSummary = {
      'brain_tumor': "Possible brain tumor detected. Please consult a neurologist for confirmation.",
      'tumor': "Possible brain tumor detected. Please consult a neurologist for confirmation.",
      'normal': "No significant abnormalities detected. Continue routine monitoring.",
      'malignant': "Signs of breast tissue abnormality found. Follow-up imaging is recommended.",
      'benign': "Benign tissue pattern detected. Continue routine monitoring.",
      'arrhythmia': "Irregular heart rhythm detected. May require cardiology review.",
      'tachycardia': "Fast heart rate detected. May require cardiology review.",
      'bradycardia': "Slow heart rate detected. May require cardiology review."
    };
    
    const summaryText = patientSummary[prediction] || 
      "Analysis complete. Please consult with your healthcare provider for detailed interpretation.";
    
    // Clinical note (for doctors)
    const clinicalNote = `Model indicates "${prediction}" with confidence ${(confidence * 100).toFixed(2)}%. Risk stratification: ${risk}.`;
    
    // Generate structured summary using the pipeline
    const structuredSummary = await medicalAnalysisPipeline.generateStructuredSummary(
      analysisResult.analysis, 
      null, 
      symptoms
    );
    
    return NextResponse.json({
      prediction: prediction,
      confidence: (confidence * 100).toFixed(2) + "%",
      risk,
      patientSummary: summaryText,
      clinicalNote,
      structuredSummary, // Detailed structured summary
      raw: analysisResult // keep original result for debugging
    });
  } catch (error) {
    console.error(`Error processing ${modality} image:`, error);
    return NextResponse.json({ 
      error: `Failed to process ${modality} image: ${error.message}` 
    }, { status: 500 });
  }
}

// Process ECG data
async function processECGData(csvData, symptoms) {
  try {
    console.log('Preprocessing ECG data');
    
    // Parse CSV data
    const lines = csvData.trim().split('\n');
    let signal = [];
    
    for (const line of lines) {
      const values = line.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
      signal.push(...values);
    }
    
    // Pad or truncate to fixed length (5000 samples is common for ECG)
    const targetLength = 5000;
    if (signal.length < targetLength) {
      signal = signal.concat(Array(targetLength - signal.length).fill(0));
    } else if (signal.length > targetLength) {
      signal = signal.slice(0, targetLength);
    }
    
    // Normalize signal
    const maxVal = Math.max(...signal.map(Math.abs)) || 1;
    const normalizedSignal = signal.map(val => val / maxVal);
    
    // For ECG, we'll use structured data analysis
    const analysisResult = await medicalAnalysisPipeline.analyzeStructuredData(
      'ecg', 
      normalizedSignal, 
      symptoms
    );
    
    // Extract prediction and confidence from findings
    const findings = analysisResult.findings || [];
    let prediction = 'normal';
    let confidence = 0;
    
    if (findings.length > 0) {
      // Get the finding with highest confidence
      const topFinding = findings.reduce((prev, current) => 
        (prev.confidence > current.confidence) ? prev : current
      );
      prediction = topFinding.label.toLowerCase().replace(/\s+/g, '_');
      confidence = topFinding.confidence;
    }
    
    // Simple risk stratification
    let risk = "Low";
    if (confidence > 0.75) risk = "High";
    else if (confidence > 0.5) risk = "Moderate";
    
    // Patient-friendly text
    const patientSummary = {
      'arrhythmia': "Irregular heart rhythm detected. May require cardiology review.",
      'tachycardia': "Fast heart rate detected. May require cardiology review.",
      'bradycardia': "Slow heart rate detected. May require cardiology review.",
      'normal': "Normal heart rhythm detected. No immediate concerns identified."
    };
    
    const summaryText = patientSummary[prediction] || 
      "ECG analysis complete. Please consult with your healthcare provider for detailed interpretation.";
    
    // Clinical note (for doctors)
    const clinicalNote = `Model indicates "${prediction}" with confidence ${(confidence * 100).toFixed(2)}%. Risk stratification: ${risk}.`;
    
    return NextResponse.json({
      prediction: prediction,
      confidence: (confidence * 100).toFixed(2) + "%",
      risk,
      patientSummary: summaryText,
      clinicalNote,
      raw: analysisResult // keep original result for debugging
    });
  } catch (error) {
    console.error('Error processing ECG data:', error);
    return NextResponse.json({ 
      error: `Failed to process ECG data: ${error.message}` 
    }, { status: 500 });
  }
}

// Process tabular data from CSV
async function processTabularDataFromCSV(csvData, modality) {
  try {
    console.log(`Preprocessing ${modality} tabular data from CSV`);
    
    // Parse CSV data (assuming single row of features)
    const lines = csvData.trim().split('\n');
    const firstLine = lines[0];
    const features = firstLine.split(',').map(val => parseFloat(val.trim())).filter(val => !isNaN(val));
    
    return await processTabularData(features, modality);
  } catch (error) {
    console.error(`Error processing ${modality} CSV data:`, error);
    return NextResponse.json({ 
      error: `Failed to process ${modality} CSV data: ${error.message}` 
    }, { status: 500 });
  }
}

// Process tabular data directly
async function processTabularData(features, modality) {
  try {
    console.log(`Processing ${modality} tabular data`);
    
    // Use the medical analysis pipeline to process structured data
    const analysisResult = await medicalAnalysisPipeline.analyzeStructuredData(
      modality, 
      features, 
      ''
    );
    
    // Extract prediction and confidence from findings
    const findings = analysisResult.findings || [];
    let prediction = 'low_risk';
    let confidence = 0;
    
    if (findings.length > 0) {
      // Get the finding with highest confidence
      const topFinding = findings.reduce((prev, current) => 
        (prev.confidence > current.confidence) ? prev : current
      );
      prediction = topFinding.label.toLowerCase().replace(/\s+/g, '_');
      confidence = topFinding.confidence;
    }
    
    // Simple risk stratification
    let risk = "Low";
    if (confidence > 0.75) risk = "High";
    else if (confidence > 0.5) risk = "Moderate";
    
    // Patient-friendly text
    const patientSummary = {
      'diabetes_risk': "High probability of diabetes based on test values. Consider lifestyle and treatment options.",
      'stroke_risk': "Elevated risk of stroke identified. Preventive measures strongly recommended.",
      'heart_disease_risk': "Indicators of heart disease detected. Cardiologist consultation advised.",
      'low_risk': "Low risk assessment. Continue routine monitoring."
    };
    
    const summaryText = patientSummary[prediction] || 
      `${modality.replace(/_/g, ' ')} analysis complete. Please consult with your healthcare provider for detailed interpretation.`;
    
    // Clinical note (for doctors)
    const clinicalNote = `Model indicates "${prediction}" with confidence ${(confidence * 100).toFixed(2)}%. Risk stratification: ${risk}.`;
    
    return NextResponse.json({
      prediction: prediction,
      confidence: (confidence * 100).toFixed(2) + "%",
      risk,
      patientSummary: summaryText,
      clinicalNote,
      raw: analysisResult // keep original result for debugging
    });
  } catch (error) {
    console.error(`Error processing ${modality} data:`, error);
    return NextResponse.json({ 
      error: `Failed to process ${modality} data: ${error.message}` 
    }, { status: 500 });
  }
}

// Process medical text reports
async function processMedicalText(textContent, modality) {
  try {
    console.log('Processing medical text report');
    
    // For text reports, we'll create a mock file object for the pipeline
    const file = {
      name: 'medical_report.txt',
      buffer: Buffer.from(textContent),
      type: 'text/plain'
    };
    
    // Use the medical analysis pipeline to process the text
    const analysisResult = await medicalAnalysisPipeline.analyzeMedicalFile(file, textContent);
    
    if (!analysisResult.success) {
      throw new Error(`Text analysis failed: ${analysisResult.error}`);
    }
    
    // For text reports, we'll provide a general summary
    const prediction = 'medical_report';
    const confidence = 0.85; // Default confidence for text analysis
    const risk = "Low"; // Text reports don't typically indicate risk directly
    
    const summaryText = "Important clinical details extracted from medical record. Please review with your healthcare provider.";
    const clinicalNote = "Medical report analyzed for key findings and clinical insights.";
    
    // Generate structured summary using the pipeline
    const structuredSummary = await medicalAnalysisPipeline.generateStructuredSummary(
      analysisResult.analysis, 
      { cleaned: textContent }, 
      textContent
    );
    
    return NextResponse.json({
      prediction: prediction,
      confidence: (confidence * 100).toFixed(2) + "%",
      risk,
      patientSummary: summaryText,
      clinicalNote,
      structuredSummary, // Detailed structured summary
      raw: analysisResult // keep original result for debugging
    });
  } catch (error) {
    console.error('Error processing medical text:', error);
    return NextResponse.json({ 
      error: `Failed to process medical text: ${error.message}` 
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  try {
    // Get model information
    const modelInfo = modelLoader.getModelInfo();
    const loadedModels = Object.keys(modelInfo);
    
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      modelsLoaded: modelLoader.isLoaded,
      loadedModels: loadedModels,
      modelDetails: modelInfo,
      message: 'ONNX Medical Models API is running'
    });
  } catch (err) {
    console.error('Health check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}