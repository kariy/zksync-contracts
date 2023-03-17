// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import {SimpleAccount} from "./SimpleAccount.sol";

import "./zksync/system-contracts/Constants.sol";
import {L2ContractHelper} from "./zksync/contracts/L2ContractHelper.sol";
import {Transaction} from "./zksync/system-contracts/libraries/TransactionHelper.sol";
import {IPaymasterFlow} from "./zksync/system-contracts/interfaces/IPaymasterFlow.sol";
import {IContractDeployer} from "./zksync/system-contracts/interfaces/IContractDeployer.sol";
import {SystemContractsCaller} from "./zksync/system-contracts/libraries/SystemContractsCaller.sol";
import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC} from "./zksync/system-contracts/interfaces/IPaymaster.sol";

// Factory for creating Account Contract
// It is also a paymaster that will pay the contract deployment.
contract WalletFactory is IPaymaster {
    event CreateWallet(address indexed account, bytes owners);

    address private operator;
    bytes32 private walletContractHash;

    constructor(bytes32 bytecodeHash) {
        operator = msg.sender;
        walletContractHash = bytecodeHash;
    }

    function getAccountBytecodeHash() external view returns (bytes32) {
        return walletContractHash;
    }

    function getOperator() external view returns (address) {
        return operator;
    }

    function deployWallet(
        bytes32 _salt,
        // address[] memory owners
        address owner
    ) external returns (address accountAddress) {
        (bool success, bytes memory returnData) = SystemContractsCaller
            .systemCallWithReturndata(
                uint32(gasleft()),
                address(DEPLOYER_SYSTEM_CONTRACT),
                uint128(0),
                abi.encodeCall(
                    DEPLOYER_SYSTEM_CONTRACT.create2Account,
                    (
                        _salt,
                        walletContractHash,
                        abi.encode(owner),
                        IContractDeployer.AccountAbstractionVersion.Version1
                    )
                )
            );

        require(success, "Contract deployment failed");

        (accountAddress) = abi.decode(returnData, (address));
        emit CreateWallet(accountAddress, abi.encode(owner));
    }

    function validateAndPayForPaymasterTransaction(
        bytes32,
        bytes32,
        Transaction calldata _transaction
    ) external payable returns (bytes4 magic, bytes memory context) {
        // By default we consider the transaction as accepted.
        magic = PAYMASTER_VALIDATION_SUCCESS_MAGIC;
        require(
            msg.sender == BOOTLOADER_FORMAL_ADDRESS,
            "Only bootloader can call this contract"
        );
        require(
            _transaction.paymasterInput.length >= 4,
            "The standard paymaster input must be at least 4 bytes long"
        );

        // get the total fee needed to complete the transaction
        uint256 requiredETH = _transaction.gasLimit * _transaction.maxFeePerGas;

        // The bootloader never returns any data, so it can safely be ignored here.
        (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{
            value: requiredETH
        }("");
        require(success, "Failed to transfer funds to the bootloader");
    }

    function postTransaction(
        bytes calldata _context,
        Transaction calldata _transaction,
        bytes32,
        bytes32,
        ExecutionResult _txResult,
        uint256 _maxRefundedGas
    ) external payable override {
        // Refunds are not supported yet.
    }

    receive() external payable {}
}
