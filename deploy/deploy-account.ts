import { Wallet, Provider, utils } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import { expect } from "chai";

// Get private key from the environment variable
const PRIVATE_KEY: string =
	process.env.ZKS_PRIVATE_KEY ||
	"0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110"; // privkey from the local testnet https://github.com/matter-labs/local-setup/blob/main/rich-wallets.json

export default async function (hre: HardhatRuntimeEnvironment) {
	const provider = Provider.getDefaultProvider();
	const signer = new Wallet(PRIVATE_KEY, provider);
	const deployer = new Deployer(hre, signer);

	const factoryArtifact = await deployer.loadArtifact("WalletFactory");
	const accountArtifact = await deployer.loadArtifact("SimpleAccount");
	const factoryContract = new ethers.Contract(
		"0x4B5DF730c2e6b28E17013A1485E5d9BC41Efe021",
		factoryArtifact.abi,
		signer
	);

	const salt = ethers.constants.HashZero;

	const tx = await factoryContract.deployWallet(salt, signer.address, {
		gasLimit: "0x99999999",
	});
	await tx.wait();

	const bytecodeHash = utils.hashBytecode(accountArtifact.bytecode);
	const fromFactory = await factoryContract.getAccountBytecodeHash();

	expect(ethers.utils.hexlify(bytecodeHash)).to.equal(fromFactory);

	const abiCoder = new ethers.utils.AbiCoder();
	const accountAddress = utils.create2Address(
		factoryContract.address,
		fromFactory,
		ethers.constants.HashZero,
		abiCoder.encode(["address"], [signer.address])
	);

	console.log(`Account contract deployed on address ${accountAddress}`);
}
