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

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("Please define the MONGO_URI or MONGODB_URI environment variable inside .env or .env.local");
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    console.log("✅ Using existing MongoDB connection");
    return mongoose.connection.db;
  }

  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");
    return conn.connection.db;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}
