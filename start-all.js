import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local
const envFilePath = '.env.local';
let envVars = {};

try {
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    envVars = dotenv.parse(envContent);
    console.log(`Environment variables loaded from ${envFilePath}`);
  } else {
    console.warn(`Warning: ${envFilePath} file not found`);
  }
} catch (error) {
  console.error(`Error loading environment variables: ${error.message}`);
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Function to spawn a process with colored output
function spawnProcess(command, args, name, color, env = {}) {
  console.log(`${color}Starting ${name}...${colors.reset}`);
  
  const childProcess = spawn(command, args, { 
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, ...env } // Merge with current environment variables
  });
  
  childProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`${color}[${name}] ${line}${colors.reset}`);
    });
  });
  
  childProcess.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      console.log(`${color}[${name} ERROR] ${line}${colors.reset}`);
    });
  });
  
  childProcess.on('error', (error) => {
    console.log(`${colors.red}[${name}] Failed to start process: ${error.message}${colors.reset}`);
  });
  
  childProcess.on('close', (code) => {
    console.log(`${color}[${name}] Process exited with code ${code}${colors.reset}`);
  });
  
  return childProcess;
}

// Start Next.js app
const nextApp = spawnProcess('npm', ['run', 'dev'], 'Next.js App', colors.cyan);

// Start scheduler service with environment variables
const schedulerService = spawnProcess('node', ['src/server.js'], 'Scheduler Service', colors.magenta, envVars);

// Handle process termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down all services...${colors.reset}`);
  
  nextApp.kill();
  schedulerService.kill();
  
  process.exit(0);
});

console.log(`${colors.green}All services started successfully!${colors.reset}`);
console.log(`${colors.green}Press Ctrl+C to stop all services${colors.reset}`);
console.log(`${colors.yellow}Next.js App: http://localhost:3000${colors.reset}`);
console.log(`${colors.yellow}Scheduler Service: http://localhost:3001${colors.reset}`); 