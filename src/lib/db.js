import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Setup environment paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envLocalPath = path.resolve(__dirname, '../../.env.local');
const envPath = path.resolve(__dirname, '../../.env');

// Try to load environment from .env.local first, then .env
if (fs.existsSync(envLocalPath)) {
  console.log(`Loading environment from: ${envLocalPath}`);
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
}

// Get MongoDB connection string
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Check if mock mode is explicitly enabled (but we'll prefer real MongoDB)
const USE_MOCK = process.env.FORCE_MOCK_DB === 'true';
if (USE_MOCK) {
  console.log('Note: FORCE_MOCK_DB is enabled but we will try real MongoDB first');
}

/**
 * Connect to MongoDB database
 * Returns the mongoose connection
 */
export async function connectDB() {
  try {
    // Check if we're already connected
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    if (mongoose.connection.readyState === 2) {
      console.log("⏳ MongoDB connection is in progress...");
      // Wait for connection to complete or fail
      return new Promise((resolve, reject) => {
        mongoose.connection.once('connected', () => resolve(mongoose.connection));
        mongoose.connection.once('error', (err) => reject(err));
      });
    }

    console.log(`🔄 Connecting to MongoDB: ${MONGO_URI.substring(0, 20)}...`);

    // Configure Mongoose options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, options);
    console.log("✅ Connected to MongoDB successfully");
    
    // Add connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    
    // Fall back to mock mode only if explicitly enabled
    if (USE_MOCK) {
      console.warn('⚠️ Falling back to mock mode due to connection failure');
      global.mockMongoDB = true;
      return { readyState: 1, mock: true };
    }
    
    throw error;
  }
}
