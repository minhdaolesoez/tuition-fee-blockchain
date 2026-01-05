const { loadData } = require('./data-manager');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const data = loadData();
  
  if (!data.students?.length && !data.feeSchedules?.length && !data.scholarships?.length) {
    console.log('[RESTORE] No saved data to restore');
    return;
  }

  console.log('[RESTORE] Restoring saved data...');
  
  // Get deployed contract
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error('[RESTORE] CONTRACT_ADDRESS not set');
    return;
  }

  // Use pure ethers.js with JSON-RPC provider
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // Hardhat's first account private key (well-known test key)
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const signer = new ethers.Wallet(privateKey, provider);
  
  // Read ABI from compiled artifact
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'TuitionFeeContract.sol', 'TuitionFeeContract.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // Use getAddress to ensure proper checksum and avoid ENS resolution
  const contract = new ethers.Contract(ethers.getAddress(contractAddress), artifact.abi, signer);

  // Get current nonce
  let nonce = await provider.getTransactionCount(signer.address);

  // Restore fee schedules first
  if (data.feeSchedules?.length) {
    console.log(`[RESTORE] Restoring ${data.feeSchedules.length} fee schedules...`);
    for (const fee of data.feeSchedules) {
      try {
        // Set deadline to 1 year from now if expired
        let deadline = fee.deadline;
        const now = Math.floor(Date.now() / 1000);
        if (deadline <= now) {
          deadline = now + 365 * 24 * 60 * 60; // 1 year from now
        }
        
        const tx = await contract.setFeeSchedule(fee.semester, BigInt(fee.amount), deadline, { nonce: nonce++ });
        await tx.wait();
        console.log(`  ✓ Fee schedule: ${fee.semester}`);
      } catch (err) {
        console.log(`  ✗ Fee schedule ${fee.semester}: ${err.reason || err.message}`);
      }
    }
  }

  // Restore students
  if (data.students?.length) {
    console.log(`[RESTORE] Restoring ${data.students.length} students...`);
    for (const student of data.students) {
      try {
        // Use getAddress to avoid ENS resolution
        const walletAddr = ethers.getAddress(student.wallet);
        const tx = await contract.registerStudent(walletAddr, student.studentId, { nonce: nonce++ });
        await tx.wait();
        console.log(`  ✓ Student: ${student.studentId} (${student.wallet.slice(0,10)}...)`);
      } catch (err) {
        console.log(`  ✗ Student ${student.studentId}: ${err.reason || err.message}`);
      }
    }
  }

  // Restore scholarships
  if (data.scholarships?.length) {
    console.log(`[RESTORE] Restoring ${data.scholarships.length} scholarships...`);
    for (const scholarship of data.scholarships) {
      try {
        // Use getAddress to avoid ENS resolution
        const walletAddr = ethers.getAddress(scholarship.wallet);
        const tx = await contract.applyScholarship(walletAddr, scholarship.percent, { nonce: nonce++ });
        await tx.wait();
        console.log(`  ✓ Scholarship: ${scholarship.wallet.slice(0,10)}... = ${scholarship.percent}%`);
      } catch (err) {
        console.log(`  ✗ Scholarship: ${err.reason || err.message}`);
      }
    }
  }

  // Restore payments (after students and scholarships)
  if (data.payments?.length) {
    console.log(`[RESTORE] Restoring ${data.payments.length} payments...`);
    for (const payment of data.payments) {
      try {
        const walletAddr = ethers.getAddress(payment.wallet);
        const tx = await contract.restorePayment(
          walletAddr,
          payment.semester,
          BigInt(payment.amount),
          payment.timestamp,
          { nonce: nonce++ }
        );
        await tx.wait();
        console.log(`  ✓ Payment: ${payment.wallet.slice(0,10)}... - HK ${payment.semester}`);
      } catch (err) {
        console.log(`  ✗ Payment ${payment.semester}: ${err.reason || err.message}`);
      }
    }
  }

  console.log('[RESTORE] Data restoration complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
