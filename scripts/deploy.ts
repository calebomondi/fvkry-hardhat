import { ethers } from 'hardhat';

async function main() {
  const fvkry = await ethers.deployContract('Fvkry');

  await fvkry.waitForDeployment();

  console.log('Fvkry Contract Deployed at ' + fvkry.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});