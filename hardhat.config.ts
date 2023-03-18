import { HardhatUserConfig } from "hardhat/config";
import "@matterlabs/hardhat-zksync-toolbox";

// dynamically changes endpoints for local tests
const zkSyncTestnet =
	process.env.NODE_ENV == "test"
		? {
				url: "http://localhost:3050",
				ethNetwork: "http://localhost:8545",
				zksync: true,
		  }
		: {
				url: "https://zksync2-testnet.zksync.dev",
				ethNetwork: "goerli",
				zksync: true,
		  };

const config: HardhatUserConfig = {
	zksolc: {
		version: "1.3.1",
		compilerSource: "binary", // binary or docker (deprecated)
		settings: {
			isSystem: true,
		},
	},
	// defaults to zkSync network
	defaultNetwork: "zkSyncTestnet",

	networks: {
		hardhat: {
			zksync: true,
		},
		// load test network details
		zkSyncTestnet,
	},
	solidity: {
		version: "0.8.16",
	},
};

export default config;
