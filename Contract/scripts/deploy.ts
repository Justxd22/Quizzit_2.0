import { ethers, run, network } from "hardhat";

async function main() {

  const trustedBackend = "0xC27d4CcC62E64791c5B321C38E2aF647F091ddf5";

  const Contract = await ethers.getContractFactory("EscrowRefund");
  const contract = await Contract.deploy(trustedBackend);
  
  // Wait for the contract to be mined
  const tx = await contract.deploymentTransaction()?.wait();
  console.log("Transaction Hash:", tx?.hash);
  
  // Now that the contract is deployed, you can get the contract address
  const address = contract.target;
  console.log("Contract deployed to:", address);
  
  // Wait for 5 confirmations (optional but recommended)
  await contract.deploymentTransaction()?.wait(5);
  console.log("5 confirmations done");
  
  const txReceipt = await ethers.provider.getTransactionReceipt(tx?.hash);

if (txReceipt) {
  console.log('Transaction receipt:', txReceipt);
  console.log('Block number:', txReceipt.blockNumber);
  console.log('Status:', txReceipt.status ? 'Success' : 'Failure');
} else {
  console.log('Transaction not yet mined or not found');
}
  // Run the verification task
  await run("verify:verify", {
    address,
    constructorArguments: [trustedBackend], // Add any constructor arguments if needed
  });
  console.log("Verified on Etherscan!");
}

main().catch((error: Error) => {
  console.error(error);
  process.exit(1);
});