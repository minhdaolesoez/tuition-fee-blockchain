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
