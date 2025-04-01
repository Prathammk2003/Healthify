import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function listUsers() {
  try {
    await connectDB();
    
    const users = await User.find({});
    
    console.log('\nAll Users:');
    console.log('==========');
    
    for (const user of users) {
      console.log(`ID: ${user._id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Is Admin: ${user.isAdmin}`);
      console.log('----------');
    }
    
    console.log('\nDoctor Users:');
    console.log('============');
    
    const doctors = users.filter(u => u.role === 'doctor');
    if (doctors.length === 0) {
      console.log('No doctor users found!');
    } else {
      for (const doctor of doctors) {
        console.log(`ID: ${doctor._id}`);
        console.log(`Name: ${doctor.name}`);
        console.log(`Email: ${doctor.email}`);
        console.log('----------');
      }
    }
    
    console.log('\nPatient Users:');
    console.log('=============');
    
    const patients = users.filter(u => u.role !== 'doctor');
    if (patients.length === 0) {
      console.log('No patient users found!');
    } else {
      for (const patient of patients) {
        console.log(`ID: ${patient._id}`);
        console.log(`Name: ${patient.name}`);
        console.log(`Email: ${patient.email}`);
        console.log('----------');
      }
    }
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
listUsers(); 