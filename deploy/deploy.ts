import { Wallet, utils } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// Get private key from the environment variable
const PRIVATE_KEY: string =
	process.env.ZKS_PRIVATE_KEY ||
	"0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110"; // privkey from the local testnet https://github.com/matter-labs/local-setup/blob/main/rich-wallets.json

if (!PRIVATE_KEY) {
	throw new Error("Please set ZKS_PRIVATE_KEY in the environment variables.");
}

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
	console.log(`Running deploy script for the Greeter contract`);

	// Initialize the wallet.
	const wallet = new Wallet(PRIVATE_KEY);

	// Create deployer object and load the artifact of the contract you want to deploy.
	const deployer = new Deployer(hre, wallet);
	const artifact = await deployer.loadArtifact("Greeter");

	// Estimate contract deployment fee
	const greeting = "Hi there!";
	const deploymentFee = await deployer.estimateDeployFee(artifact, [greeting]);

	// Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
	// `greeting` is an argument for contract constructor.
	const parsedFee = ethers.utils.formatEther(deploymentFee.toString());
	console.log(`The deployment is estimated to cost ${parsedFee} ETH`);

	const greeterContract = await deployer.deploy(artifact, [greeting]);

	//obtain the Constructor Arguments
	console.log("constructor args:" + greeterContract.interface.encodeDeploy([greeting]));

	// Show the contract info.
	const contractAddress = greeterContract.address;
	console.log(`${artifact.contractName} was deployed to ${contractAddress}`);
}
