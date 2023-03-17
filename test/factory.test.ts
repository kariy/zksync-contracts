import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Wallet, Provider, utils } from "zksync-web3";
import * as hre from "hardhat";
import { Deployer } from "@matterlabs/hardhat-zksync-toolbox";
import { BigNumber, ethers } from "ethers";
import { encodeAbiParameters, parseAbiParameters } from "viem";

import { RICH_WALLET_PK } from "./utils";

describe("WalletFactory", function () {
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

	it("Should deploy account contract", async function () {
		const { factory, eoa, provider, accountArtifact, factoryArtifact } =
			await setup();

		// const inputs = encodeAbiParameters(parseAbiParameters("address owners"), [
		// 	eoa.address as `0x${string}`,
		// ]);

		const salt = ethers.constants.HashZero;

		const tx = await factory.deployWallet(salt, eoa.address);
		await tx.wait();

		const bytecodeHash = utils.hashBytecode(accountArtifact.bytecode);
		const fromFactory = await factory.getAccountBytecodeHash();

		expect(ethers.utils.hexlify(bytecodeHash)).to.equal(fromFactory);

		// const accountAddress = utils.create2Address(
		// 	factory.address,
		// 	fromFactory,
		// 	ethers.constants.HashZero,
		// 	inputs
		// );

		// 	const accountContract = new ethers.Contract(
		// 		accountAddress,
		// 		[
		// 			{
		// 				inputs: [],
		// 				name: "isWallet",
		// 				outputs: [
		// 					{
		// 						internalType: "bool",
		// 						name: "",
		// 						type: "bool",
		// 					},
		// 				],
		// 				stateMutability: "view",
		// 				type: "function",
		// 			},
		// 		],
		// 		provider
		// 	);

		// 	expect(accountContract.isWallet()).to.equal(true);
	});
});
