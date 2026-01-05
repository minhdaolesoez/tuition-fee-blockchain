const { spawn, exec } = require('child_process');
const path = require('path');

console.log('='.repeat(60));
console.log('  TUITION FEE BLOCKCHAIN - STARTING PROJECT');
console.log('='.repeat(60));
console.log('');

// Step 1: Start Hardhat node
console.log('[1/3] Starting Hardhat node...');
const hardhatNode = spawn('npx', ['hardhat', 'node'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

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

// Step 2: Deploy contract
function deployContract() {
  console.log('[2/3] Deploying smart contract...');
  
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
    console.error('[Deploy Error]', data.toString());
  });

  deploy.on('close', (code) => {
    if (code === 0) {
      // Extract contract address from output
      const match = deployOutput.match(/Contract deployed to: (0x[a-fA-F0-9]+)/);
      if (match) {
        console.log('[OK] Contract deployed at:', match[1]);
      } else {
        console.log('[OK] Contract deployed successfully');
      }
      console.log('');
      startFrontend();
    } else {
      console.error('[ERROR] Deploy failed with code', code);
      process.exit(1);
    }
  });
}

// Step 3: Start frontend
function startFrontend() {
  console.log('[3/3] Starting frontend...');
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
  hardhatNode.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  hardhatNode.kill();
  process.exit(0);
});
