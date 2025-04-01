import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Path to active sessions flag file
const sessionsFlagPath = path.resolve(rootDir, '.active_sessions');

// Create sessions flag
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

// Create initial sessions flag
createSessionsFlag();

// Array to store all child processes
const processes = [];

// Start Next.js app
console.log('🚀 Starting Next.js app...');
const nextApp = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});
processes.push(nextApp);

// Start scheduler service
console.log('🚀 Starting scheduler service...');
const scheduler = spawn('node', ['src/server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});
processes.push(scheduler);

// Handle process exit
const cleanup = () => {
  console.log('\n🛑 Shutting down all services...');
  
  // Remove sessions flag to trigger user logouts
  removeSessionsFlag();
  
  // Kill all child processes
  processes.forEach(process => {
    if (!process.killed) {
      process.kill();
    }
  });
  
  console.log('✅ All services shut down');
  console.log('✅ All users will be automatically logged out');
  
  // Exit after a short delay to allow processes to clean up
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

// Handle interrupt signals (Ctrl+C)
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Log startup message
console.log('\n✅ All services started');
console.log('📌 Press Ctrl+C to shutdown all services and log out all users'); 