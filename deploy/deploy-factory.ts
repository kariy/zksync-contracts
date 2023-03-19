import { ethers } from "ethers";
import { Wallet, Provider, utils } from "zksync-web3";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

// Get private key from the environment variable
const PRIVATE_KEY: string =
	process.env.ZKS_PRIVATE_KEY ||
	"0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110"; // privkey from the local testnet https://github.com/matter-labs/local-setup/blob/main/rich-wallets.json

export default async function (hre: HardhatRuntimeEnvironment) {
	const provider = Provider.getDefaultProvider();
	const eoa = new Wallet(PRIVATE_KEY, provider);
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

	await fundFactoryContractForPaymasterReason(eoa, factory);

	console.log(`AA factory address deployed at : ${factory.address}`);
}

async function fundFactoryContractForPaymasterReason(
	wallet: Wallet,
	factory: ethers.Contract
) {
	await (
		await wallet.sendTransaction({
			to: factory.address,
			// You can increase the amount of ETH sent to the multisig
			value: ethers.utils.parseEther("2"),
		})
	).wait();

	console.log(
		"Factory has been funded.",
		await wallet._providerL2().getBalance(factory.address)
	);
}
