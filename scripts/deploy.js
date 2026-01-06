const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying TuitionFeeContract...");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // University wallet - in production, use a separate secure wallet
  const universityWallet = process.env.UNIVERSITY_WALLET_ADDRESS || deployer.address;
  
  const TuitionFeeContract = await ethers.getContractFactory("TuitionFeeContract");
  const contract = await TuitionFeeContract.deploy(universityWallet);
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("\n[OK] TuitionFeeContract deployed!");
  console.log("Contract address:", contractAddress);
  console.log("University wallet:", universityWallet);

  // Fund contract with initial ETH for refunds (only on localhost)
  const network = await ethers.provider.getNetwork();
  if (network.chainId === 31337n) { // Hardhat localhost
    const fundAmount = ethers.parseEther("100"); // 100 ETH initial balance
    await deployer.sendTransaction({
      to: contractAddress,
      value: fundAmount
    });
    console.log(`\n[OK] Funded contract with ${ethers.formatEther(fundAmount)} ETH for refunds`);
  }
  
  console.log("\nNext steps:");
  console.log("1. Update TUITION_CONTRACT_ADDRESS in .env");
  console.log("2. Update client/src/config/contracts.js");
  console.log("3. Copy ABI from artifacts/contracts/TuitionFeeContract.sol/TuitionFeeContract.json");
  
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
