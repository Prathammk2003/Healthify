// This file serves as an entry point for the scheduler
// Import the scheduler from the renamed file
import { startReminderScheduler, manuallyCheckReminders, checkMedicationReminders, isSchedulerRunning } from './reminder.js';

console.log('✅ Scheduler initialized - index.js');

// Function to start all scheduler services
export const startAllSchedulers = () => {
  console.log('Starting all scheduler services...');
  
  try {
    // Start the medication reminder scheduler
    const reminderJob = startReminderScheduler();
    
    // Add more schedulers here if needed
    
    console.log('All scheduler services started');
    
    return {
      reminderJob,
      // Add other job references here
    };
  } catch (error) {
    console.error('❌ Error starting schedulers:', error);
    throw error;
  }
};

// Export other utilities
export { manuallyCheckReminders, checkMedicationReminders, isSchedulerRunning };

// Default export
export default {
  startAllSchedulers,
  manuallyCheckReminders,
  checkMedicationReminders,
  isSchedulerRunning
}; 