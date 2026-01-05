const { ethers } = require("hardhat");

async function main() {
  console.log("DEMO: Tuition Fee Payment System\n");
  console.log("=".repeat(50));
  
  // Get signers
  const [owner, student1, student2, universityWallet] = await ethers.getSigners();
  
  console.log("\nACCOUNTS:");
  console.log(`   Owner (Admin):     ${owner.address}`);
  console.log(`   Student 1:         ${student1.address}`);
  console.log(`   Student 2:         ${student2.address}`);
  console.log(`   University Wallet: ${universityWallet.address}`);
  
  // Deploy contract
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOYING CONTRACT...");
  const TuitionFeeContract = await ethers.getContractFactory("TuitionFeeContract");
  const contract = await TuitionFeeContract.deploy(universityWallet.address);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  console.log(`   [OK] Contract deployed at: ${contractAddress}`);
  
  // Check initial university wallet balance
  const initialUniBalance = await ethers.provider.getBalance(universityWallet.address);
  console.log(`   University initial balance: ${ethers.formatEther(initialUniBalance)} ETH`);
  
  // ============ ADMIN SETUP ============
  console.log("\n" + "=".repeat(50));
  console.log("ADMIN: Setting up system...\n");
  
  // Register students
  console.log("   Registering students...");
  await contract.registerStudent(student1.address, "SV001");
  console.log(`      [OK] Registered: SV001 -> ${student1.address}`);
  
  await contract.registerStudent(student2.address, "SV002");
  console.log(`      [OK] Registered: SV002 -> ${student2.address}`);
  
  // Set fee schedule
  const SEMESTER = "2024-1";
  const FEE_AMOUNT = ethers.parseEther("0.5"); // 0.5 ETH
  const deadline = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  
  console.log("\n   Setting fee schedule...");
  await contract.setFeeSchedule(SEMESTER, FEE_AMOUNT, deadline);
  console.log(`      [OK] Semester ${SEMESTER}: ${ethers.formatEther(FEE_AMOUNT)} ETH`);
  
  // Apply scholarship to student2
  console.log("\n   Applying scholarship...");
  await contract.applyScholarship(student2.address, 50); // 50% scholarship
  console.log(`      [OK] SV002 receives 50% scholarship`);
  
  // ============ STUDENT PAYMENTS ============
  console.log("\n" + "=".repeat(50));
  console.log("STUDENTS: Making payments...\n");
  
  // Student 1 pays full fee
  const fee1 = await contract.calculateFee(student1.address, SEMESTER);
  console.log(`   Student 1 (SV001):`);
  console.log(`      Fee to pay: ${ethers.formatEther(fee1)} ETH`);
  
  const tx1 = await contract.connect(student1).payTuition(SEMESTER, { value: fee1 });
  await tx1.wait();
  console.log(`      [OK] Payment successful! TX: ${tx1.hash.slice(0, 20)}...`);
  
  // Student 2 pays with scholarship
  const fee2 = await contract.calculateFee(student2.address, SEMESTER);
  console.log(`\n   Student 2 (SV002) with 50% scholarship:`);
  console.log(`      Fee to pay: ${ethers.formatEther(fee2)} ETH (50% off)`);
  
  const tx2 = await contract.connect(student2).payTuition(SEMESTER, { value: fee2 });
  await tx2.wait();
  console.log(`      [OK] Payment successful! TX: ${tx2.hash.slice(0, 20)}...`);
  
  // ============ VERIFICATION ============
  console.log("\n" + "=".repeat(50));
  console.log("VERIFICATION:\n");
  
  // Check payment status
  const paid1 = await contract.hasStudentPaid(student1.address, SEMESTER);
  const paid2 = await contract.hasStudentPaid(student2.address, SEMESTER);
  console.log(`   Payment Status:`);
  console.log(`      SV001: ${paid1 ? "[PAID]" : "[NOT PAID]"}`);
  console.log(`      SV002: ${paid2 ? "[PAID]" : "[NOT PAID]"}`);
  
  // Check university wallet balance
  const finalUniBalance = await ethers.provider.getBalance(universityWallet.address);
  const received = finalUniBalance - initialUniBalance;
  console.log(`\n   University Wallet:`);
  console.log(`      Received: ${ethers.formatEther(received)} ETH`);
  console.log(`      New Balance: ${ethers.formatEther(finalUniBalance)} ETH`);
  
  // Get payment history
  console.log("\n   Payment History (on-chain):");
  const history = await contract.getPaymentHistory(1, 10);
  history.forEach((p, i) => {
    console.log(`      #${i + 1}: ${p.studentId} | ${p.semester} | ${ethers.formatEther(p.amount)} ETH | ${p.refunded ? "REFUNDED" : "ACTIVE"}`);
  });
  
  // ============ REFUND DEMO ============
  console.log("\n" + "=".repeat(50));
  console.log("REFUND DEMO:\n");
  
  // Deposit to refund pool
  console.log("   Admin depositing to refund pool...");
  await contract.depositForRefund({ value: ethers.parseEther("1") });
  const poolBalance = await contract.getRefundPoolBalance();
  console.log(`      [OK] Refund pool: ${ethers.formatEther(poolBalance)} ETH`);
  
  // Process refund for student1
  const student1BalanceBefore = await ethers.provider.getBalance(student1.address);
  console.log(`\n   Processing refund for SV001...`);
  await contract.processRefund(1); // Payment ID 1
  const student1BalanceAfter = await ethers.provider.getBalance(student1.address);
  console.log(`      [OK] Refunded: ${ethers.formatEther(student1BalanceAfter - student1BalanceBefore)} ETH`);
  
  // Final status
  const paid1After = await contract.hasStudentPaid(student1.address, SEMESTER);
  console.log(`      SV001 status: ${paid1After ? "[PAID]" : "[REFUNDED]"}`);
  
  // ============ SUMMARY ============
  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY:\n");
  const stats = {
    totalStudents: await contract.getRegisteredStudentsCount(),
    totalPayments: await contract.paymentCounter(),
  };
  console.log(`   Total Students: ${stats.totalStudents}`);
  console.log(`   Total Payments: ${stats.totalPayments}`);
  console.log(`   Contract Address: ${contractAddress}`);
  console.log("\n" + "=".repeat(50));
  console.log("DEMO COMPLETED!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
