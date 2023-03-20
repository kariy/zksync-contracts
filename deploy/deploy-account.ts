import { Wallet, Provider, utils, types } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import { expect } from "chai";

import { RICH_WALLET_PK } from "../test/utils";

// Get private key from the environment variable
const PRIVATE_KEY: string = process.env.ZKS_PRIVATE_KEY || RICH_WALLET_PK; // privkey from the local testnet https://github.com/matter-labs/local-setup/blob/main/rich-wallets.json

// IMPORTANT: THIS SCRIPT ASSUMES THAT THE FACTORY CONTRACT HAS BEEN FUNDED
export default async function (hre: HardhatRuntimeEnvironment) {
	// @ts-ignore
	const provider = new Provider(hre.network.zkSyncTestnet.url);
	const wallet = new Wallet(PRIVATE_KEY, provider);

	const deployer = new Deployer(hre, wallet);

	const factoryArtifact = await deployer.loadArtifact("WalletFactory");
	const accountArtifact = await deployer.loadArtifact("SimpleAccount");
	const factoryContract = new ethers.Contract(
		"0x950630d37c0f535E672536DC493b76C5F6cB3B65",
		factoryArtifact.abi,
		wallet
	);

	const salt = ethers.constants.HashZero;

	let deployTx = await factoryContract.populateTransaction.deployWallet(salt, [
		wallet.address,
	]);

	const paymasterInterface = new ethers.utils.Interface([
		"function general(bytes data)",
	]);

	const gasLimit = await provider.estimateGas(deployTx);
	const gasPrice = await provider.getGasPrice();

	// Creating transaction that utilizes paymaster feature
	deployTx = {
		...deployTx,
		from: wallet.address,
		gasLimit: gasLimit,
		gasPrice: gasPrice,
		chainId: (await provider.getNetwork()).chainId,
		nonce: await provider.getTransactionCount(wallet.address),
		type: 113,
		customData: {
			gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
			paymasterParams: {
				paymaster: factoryContract.address,
				paymasterInput: paymasterInterface.encodeFunctionData("general", [[]]),
			},
		} as types.Eip712Meta,
		value: ethers.BigNumber.from(0),
	};

	const sentTx = await wallet.sendTransaction(deployTx);
	await sentTx.wait();

	// calculate deployed account address

	const abiCoder = new ethers.utils.AbiCoder();
	const accountAddress = utils.create2Address(
		factoryContract.address,
		utils.hashBytecode(accountArtifact.bytecode),
		salt,
		abiCoder.encode(["address[]"], [[wallet.address]])
	);

	const accountContract = new ethers.Contract(
		accountAddress,
		accountArtifact.abi,
		provider
	);

	expect(await accountContract.isOwner(wallet.address)).to.equal(true);

	console.log(`Transaction ${sentTx.hash} submitted.`);
	console.log(`Wallet is deployed at ${accountAddress}.`);
}
