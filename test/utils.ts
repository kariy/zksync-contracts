import { utils } from "ethers";

export const RICH_WALLET_PK =
	"0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110";

export function computeContractBytecodeHash(bytecode: string): string {
	const bytecodeHash = utils.arrayify("0x0100");

	// check if hex string
	if (!utils.isHexString(bytecode)) {
		throw Error("bytecode is not a hex string");
	}

	const bytes = utils.arrayify(bytecode);
	let bytecodeLen = utils.arrayify(Math.ceil(bytes.length / 32));

	if (bytecodeLen.length < 2) {
		bytecodeLen = Uint8Array.from([0, bytecodeLen[0]]);
	}

	const last28bytesOfHash = utils.arrayify(utils.sha256(bytes)).subarray(4);
	const full = utils.concat([bytecodeHash, bytecodeLen, last28bytesOfHash]);

	return utils.hexlify(full);
}
