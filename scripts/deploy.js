// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
require("dotenv").config();
const { WHITELIST_CONTRACT_ADDRESS, METADATA_URL } = require("../constants");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // Address of the whitelist contract that was deployed previously
  const whitelistContract = WHITELIST_CONTRACT_ADDRESS;
  // URL from where the METADATA is
  const metadataURL = METADATA_URL;

  // We get the contract to deploy
  const muddedNFTContract = await hre.ethers.getContractFactory("MuddedNFT");
  const muddedNFTDeployer = await muddedNFTContract.deploy(
    metadataURL,
    whitelistContract
  );

  await muddedNFTDeployer.deployed();

  console.log("Mudded NFT contract Address:", muddedNFTDeployer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
