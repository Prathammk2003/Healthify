/**
 * Simple test script for medication reminder scheduler
 */
import dotenv from 'dotenv';
import { connectDB } from './src/lib/db.js';
import { manuallyCheckReminders } from './src/scheduler/reminder.js';
import mongoose from 'mongoose';

dotenv.config();

console.log('=== Medication Reminder Test ===');
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('FORCE_MOCK_DB enabled:', process.env.FORCE_MOCK_DB === 'true');

// Function to test the medication reminder
async function testMedicationReminder() {
  try {
    console.log('Connecting to MongoDB or using mock mode...');
    await connectDB();
    console.log('Connection successful!');
    
    // Current time in HH:MM format
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    console.log(`Running check for medication reminders at ${currentTime} for ALL USERS`);
    console.log('This will check all active reminders in the system, not just those matching current time');
    
    await manuallyCheckReminders(currentTime);
    console.log('Reminder check completed');
    
    // Close the connection if not in mock mode
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testMedicationReminder(); 