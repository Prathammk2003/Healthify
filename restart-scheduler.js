/**
 * Scheduler service restart script
 * 
 * This script is designed to restart the scheduler service
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the server.js file
const serverPath = path.join(__dirname, 'src', 'server.js');

console.log('============================================');
console.log('🔄 Restarting Scheduler Service');
console.log('============================================');

// Check if server.js exists
if (!fs.existsSync(serverPath)) {
  console.error(`❌ Error: server.js not found at ${serverPath}`);
  process.exit(1);
}

// Kill any existing scheduler process (on Windows)
try {
  console.log('Stopping any existing scheduler services...');
  const stopCmd = spawn('cmd.exe', ['/c', 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq scheduler*"'], { 
    shell: true, 
    stdio: 'inherit'
  });
  
  stopCmd.on('error', (error) => {
    console.log('Note: No existing scheduler service found or could not be stopped');
  });
  
  // Start a new scheduler process after a short delay
  setTimeout(() => {
    console.log('\n📡 Starting scheduler service...');
    
    const env = { ...process.env, NODE_ENV: 'production' };
    const serverProcess = spawn('node', [serverPath], { 
      env,
      shell: true,
      stdio: 'inherit',
      windowsHide: false,
      windowsVerbatimArguments: true,
      detached: true
    });
    
    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start scheduler service:', error);
    });
    
    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Scheduler service exited with code ${code}`);
      }
    });
    
    // Detach the process to keep it running after this script exits
    serverProcess.unref();
    
    console.log('✅ Scheduler service started');
    console.log('============================================');
  }, 2000);
  
} catch (error) {
  console.error('❌ Error restarting scheduler service:', error);
} 