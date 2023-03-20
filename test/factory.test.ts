import { expect } from "chai";
import { Wallet, Provider, utils, types, EIP712Signer } from "zksync-web3";
import * as hre from "hardhat";
import { Deployer } from "@matterlabs/hardhat-zksync-toolbox";
import { ethers } from "ethers";

import { RICH_WALLET_PK } from "./utils";

async function setup() {
	const provider = Provider.getDefaultProvider();
	const eoa = new Wallet(RICH_WALLET_PK, provider);
	const deployer = new Deployer(hre, eoa);

	const factoryArtifact = await deployer.loadArtifact("WalletFactory");
	const accountArtifact = await deployer.loadArtifact("SimpleAccount");

	const factory = await deployer.deploy(
		factoryArtifact,
		[utils.hashBytecode(accountArtifact.bytecode)],
		undefined,
		[
			// Since the factory requires the code of the multisig to be available,
			// we should pass it here as well.
			accountArtifact.bytecode,
		]
	);

	return { factory, factoryArtifact, eoa, provider, accountArtifact };
}

describe("WalletFactory", function () {
	it("Should deploy account contract", async function () {
		const { factory, eoa, provider, accountArtifact } = await setup();

		const salt = ethers.constants.HashZero;

		const owner1 = Wallet.createRandom();
		const owner2 = Wallet.createRandom();

		const tx = await factory.deployWallet(salt, [owner1.address, owner2.address]);
		await tx.wait();

		const bytecodeHash = utils.hashBytecode(accountArtifact.bytecode);
		const fromFactory = await factory.getAccountBytecodeHash();

		expect(ethers.utils.hexlify(bytecodeHash)).to.equal(fromFactory);

		const abiCoder = new ethers.utils.AbiCoder();
		const accountAddress = utils.create2Address(
			factory.address,
			fromFactory,
			salt,
			abiCoder.encode(["address[]"], [[owner1.address, owner2.address]])
		);

		const accountContract = new ethers.Contract(
			accountAddress,
			accountArtifact.abi,
			provider
		);

		expect(await accountContract.isOwner(owner1.address)).to.equal(true);
	});

	it("Factory should pay for deployment", async function () {
		const { factory, eoa, provider, accountArtifact } = await setup();

		const salt = ethers.constants.HashZero;
		const owner1 = Wallet.createRandom();
		const owner2 = Wallet.createRandom();

		await (
			await eoa.sendTransaction({
				to: factory.address,
				// You can increase the amount of ETH sent to the multisig
				value: ethers.utils.parseEther("1"),
			})
		).wait();

		console.log(
			"Factory has been funded.",
			await provider.getBalance(factory.address)
		);

		const beforeTxBalance = await eoa.getBalance();

		let deployTx = await factory.populateTransaction.deployWallet(salt, [
			owner1.address,
			owner2.address,
		]);

		const paymasterInterface = new ethers.utils.Interface([
			"function general(bytes data)",
		]);

		const gasLimit = await provider.estimateGas(deployTx);
		const gasPrice = await provider.getGasPrice();

		// Creating transaction that utilizes paymaster feature
		deployTx = {
			...deployTx,
			from: eoa.address,
			gasLimit: gasLimit,
			gasPrice: gasPrice,
			chainId: (await provider.getNetwork()).chainId,
			nonce: await provider.getTransactionCount(eoa.address),
			type: 113,
			customData: {
				gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
				paymasterParams: {
					paymaster: factory.address,
					paymasterInput: paymasterInterface.encodeFunctionData("general", [
						[],
					]),
				},
			} as types.Eip712Meta,
			value: ethers.BigNumber.from(0),
		};

		const sentTx = await eoa.sendTransaction(deployTx);
		await sentTx.wait();

		const afterTxBalance = await eoa.getBalance();

		// tx sender balance should be the same before and after sending the tx
		expect(beforeTxBalance._hex).to.equal(afterTxBalance._hex);
	});
});
