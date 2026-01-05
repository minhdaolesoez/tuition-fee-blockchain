const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('='.repeat(60));
console.log('  TUITION FEE BLOCKCHAIN - STARTING PROJECT');
console.log('='.repeat(60));
console.log('');

let contractAddress = null;
let dataServer = null;

// Step 0: Start data server
console.log('[1/5] Starting data server...');
dataServer = spawn('node', ['scripts/data-server.js'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

dataServer.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('[DATA API]')) {
    console.log('[OK] Data server running on http://localhost:3001');
    console.log('');
    startHardhatNode();
  }
});

dataServer.stderr.on('data', (data) => {
  console.error('[Data Server Error]', data.toString());
});

// Step 1: Start Hardhat node
function startHardhatNode() {
  console.log('[2/5] Starting Hardhat node...');
  var hardhatNode = spawn('npx', ['hardhat', 'node'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  global.hardhatNode = hardhatNode;

  let nodeReady = false;

  hardhatNode.stdout.on('data', (data) => {
    const output = data.toString();
    if (!nodeReady && output.includes('Started HTTP')) {
      nodeReady = true;
      console.log('[OK] Hardhat node is running on http://127.0.0.1:8545');
      console.log('');
      deployContract();
    }
  });

  hardhatNode.stderr.on('data', (data) => {
    console.error('[Hardhat Error]', data.toString());
  });
}

// Step 2: Deploy contract
function deployContract() {
  console.log('[3/5] Deploying smart contract...');
  
  const deploy = spawn('npx', ['hardhat', 'run', 'scripts/deploy.js', '--network', 'localhost'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  let deployOutput = '';
  
  deploy.stdout.on('data', (data) => {
    deployOutput += data.toString();
  });

  deploy.stderr.on('data', (data) => {
    // Hardhat outputs to stderr sometimes
    deployOutput += data.toString();
  });

  deploy.on('close', (code) => {
    if (code === 0) {
      // Extract contract address from output
      const match = deployOutput.match(/deployed to[:\s]+(0x[a-fA-F0-9]{40})/i);
      if (match) {
        contractAddress = match[1];
        console.log('[OK] Contract deployed at:', contractAddress);
      } else {
        // Fallback: default Hardhat deploy address
        contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
        console.log('[OK] Contract deployed (using default address):', contractAddress);
      }
      console.log('');
      restoreData();
    } else {
      console.error('[ERROR] Deploy failed with code', code);
      process.exit(1);
    }
  });
}

// Step 3: Restore saved data
function restoreData() {
  console.log('[4/5] Restoring saved data...');
  
  // Run with plain node instead of hardhat to avoid HardhatEthersProvider issues
  const restore = spawn('node', ['scripts/restore-data.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, CONTRACT_ADDRESS: contractAddress }
  });

  let restoreOutput = '';
  
  restore.stdout.on('data', (data) => {
    restoreOutput += data.toString();
  });

  restore.stderr.on('data', (data) => {
    // Ignore compilation messages
    const msg = data.toString();
    if (!msg.includes('Compiled') && !msg.includes('Nothing to compile')) {
      console.error('[Restore Error]', msg);
    }
  });

  restore.on('close', (code) => {
    // Show restore output
    const lines = restoreOutput.split('\n').filter(l => l.includes('[RESTORE]') || l.includes('✓') || l.includes('✗'));
    lines.forEach(line => console.log(line));
    
    if (code === 0) {
      console.log('[OK] Data restored');
    } else {
      console.log('[WARN] Restore finished with code', code);
    }
    console.log('');
    startFrontend();
  });
}

// Step 4: Start frontend
function startFrontend() {
  console.log('[5/5] Starting frontend...');
  console.log('');
  
  const clientPath = path.join(process.cwd(), 'client');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: clientPath,
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    console.error('[Frontend Error]', err.message);
  });
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  if (global.hardhatNode) global.hardhatNode.kill();
  if (dataServer) dataServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (global.hardhatNode) global.hardhatNode.kill();
  if (dataServer) dataServer.kill();
  process.exit(0);
});
