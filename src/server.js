import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db.js';
import { startAllSchedulers, manuallyCheckReminders, isSchedulerRunning } from './scheduler/index.js';
import fs from 'fs';
import mongoose from 'mongoose';
import { modelLoader } from './lib/model-loader.js';
import { medicalAnalysisPipeline } from './lib/medical-analysis-pipeline.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Set up logging
const logDir = path.resolve(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'app.log');

// Redirect console output to file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Function to log to file and console
function logToFileAndConsole(type, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  
  // Write to log file
  fs.appendFileSync(logFile, logMessage);
  
  // Also log to original console based on type
  if (type === 'ERROR') {
    originalConsoleError(...args);
  } else if (type === 'WARN') {
    originalConsoleWarn(...args);
  } else {
    originalConsoleLog(...args);
  }
}

// Override console methods
console.log = (...args) => logToFileAndConsole('INFO', ...args);
console.error = (...args) => logToFileAndConsole('ERROR', ...args);
console.warn = (...args) => logToFileAndConsole('WARN', ...args);

// Log environment variables (without exposing secrets)
console.log('Environment variables loaded:');
console.log('- MONGODB_URI present:', !!process.env.MONGODB_URI);
console.log('- TWILIO_ACCOUNT_SID present:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('- TWILIO_AUTH_TOKEN present:', !!process.env.TWILIO_AUTH_TOKEN);
console.log('- TWILIO_PHONE_NUMBER present:', !!process.env.TWILIO_PHONE_NUMBER);

// Create Express server
const app = express();
const port = process.env.SCHEDULER_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// File path for active sessions
const sessionsFlagPath = path.resolve(__dirname, '../.active_sessions');

// Update active sessions file
const createSessionsFlag = () => {
  try {
    fs.writeFileSync(sessionsFlagPath, 'active', 'utf8');
    console.log('✅ Sessions flag created - users can log in');
  } catch (error) {
    console.error('Error creating sessions flag:', error);
  }
};

// Remove sessions flag to trigger logouts
const removeSessionsFlag = () => {
  try {
    if (fs.existsSync(sessionsFlagPath)) {
      fs.unlinkSync(sessionsFlagPath);
      console.log('✅ Sessions flag removed - users will be logged out');
    }
  } catch (error) {
    console.error('Error removing sessions flag:', error);
  }
};

// Connect to database
(async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Initialize medical analysis pipeline
    try {
      console.log('Initializing medical analysis pipeline...');
      await medicalAnalysisPipeline.initialize();
      console.log('✅ Medical analysis pipeline initialized successfully');
    } catch (initError) {
      console.error('❌ Failed to initialize medical analysis pipeline:', initError);
    }
    
    // Initialize ONNX model loader
    try {
      console.log('Initializing ONNX model loader...');
      const modelsLoaded = await modelLoader.loadAllModels();
      console.log(`✅ ONNX model loader initialized: ${modelsLoaded ? 'Models loaded' : 'No models found'}`);
    } catch (modelError) {
      console.error('❌ Failed to initialize ONNX model loader:', modelError);
    }
    
    // Create sessions flag on startup
    createSessionsFlag();
    
    // Start all schedulers
    try {
      console.log('Starting scheduler services...');
      const schedulers = startAllSchedulers();
      console.log('✅ All schedulers started successfully');
    } catch (schedulerError) {
      console.error('❌ Failed to start schedulers:', schedulerError);
    }
    
    // Basic health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Scheduler service is running',
        mongoDbConnected: mongoose.connection.readyState === 1,
        schedulerActive: isSchedulerRunning,
        modelsLoaded: modelLoader.isLoaded,
        loadedModels: modelLoader.getModelInfo()
      });
    });
    
    // Manual trigger endpoint for testing
    app.post('/trigger/medication-reminder', async (req, res) => {
      try {
        const { time } = req.body;
        console.log(`Manually triggering medication reminders for time: ${time || 'current time'}`);
        
        // Use the imported manuallyCheckReminders function
        await manuallyCheckReminders(time);
        res.json({ success: true, message: 'Medication reminders triggered' });
      } catch (error) {
        console.error('Error triggering medication reminders:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
    
    // Start the server with error handling
    const server = app.listen(port, () => {
      console.log(`✅ Scheduler service is running on port ${port}`);
      console.log(`   Health check: http://localhost:${port}/health`);
      console.log(`   Trigger endpoint: http://localhost:${port}/trigger/medication-reminder`);
      console.log('\n📌 Press Ctrl+C to shutdown services and log out all users');
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please try a different port or stop the service using this port.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', err);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 SIGINT signal received (Ctrl+C). Shutting down...');
      
      // Remove sessions flag to trigger logouts
      removeSessionsFlag();
      
      // Close the server
      server.close(() => {
        console.log('✅ HTTP server closed');
        console.log('✅ All users will be automatically logged out');
        process.exit(0);
      });
      
      // Force exit after 3 seconds if something is hanging
      setTimeout(() => {
        console.log('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 3000);
    });
  } catch (error) {
    console.error('❌ Failed to start scheduler service:', error);
    process.exit(1);
  }
})();