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
 * Global cached connection to prevent multiple connections
 * This is critical for serverless/Next.js environments
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB database with connection pooling and caching
 * Returns the mongoose connection
 */
export async function connectDB() {
  try {
    // Return cached connection if available
    if (cached.conn) {
      return cached.conn;
    }

    // If connection is in progress, wait for it
    if (cached.promise) {
      cached.conn = await cached.promise;
      return cached.conn;
    }

    console.log(`🔄 Connecting to MongoDB: ${MONGO_URI.substring(0, 20)}...`);

    // Configure Mongoose options with connection pooling
    const options = {
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Create connection promise and cache it
    cached.promise = mongoose.connect(MONGO_URI, options).then((mongoose) => {
      console.log("✅ Connected to MongoDB successfully");
      return mongoose;
    });

    // Wait for connection
    cached.conn = await cached.promise;

    // Add connection event handlers (only once)
    if (!mongoose.connection._eventsRegistered) {
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        // Clear cache on error so next request will retry
        cached.conn = null;
        cached.promise = null;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected - will reconnect on next request');
        // Clear cache so next request will reconnect
        cached.conn = null;
        cached.promise = null;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected successfully');
      });

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
      });

      // Mark events as registered
      mongoose.connection._eventsRegistered = true;
    }

    return cached.conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);

    // Clear cache on error
    cached.conn = null;
    cached.promise = null;

    // Fall back to mock mode only if explicitly enabled
    if (USE_MOCK) {
      console.warn('⚠️ Falling back to mock mode due to connection failure');
      global.mockMongoDB = true;
      return { readyState: 1, mock: true };
    }

    throw error;
  }
}

/**
 * Retry wrapper for database operations
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in ms
 */
export async function withRetry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);

      if (i === retries - 1) {
        throw error; // Last attempt failed, throw error
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Try to reconnect before next attempt
      try {
        await connectDB();
      } catch (reconnectError) {
        console.error('Reconnection attempt failed:', reconnectError.message);
      }
    }
  }
}
