import { ethers } from 'hardhat';

async function main() {
  const mockToken = await ethers.deployContract('MockERC20Token');

  await mockToken.waitForDeployment();

  console.log('mockToken Contract Deployed at ' + mockToken.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});