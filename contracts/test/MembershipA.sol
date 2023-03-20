// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import {IMembership} from "../interfaces/IMembership.sol";

import "@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol";
import {Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";
import {IPaymasterFlow} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymasterFlow.sol";
import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymaster.sol";

/**
 * @notice This example membership has tier 1, 2, 3.
 *
 */
contract MembershipA is IMembership, IPaymaster {
    /**
     *
     *
     *  MEMBERSHIP
     *
     *
     */

    //*///////////////////////////////////////////////////////////////
    //    CONSTANTS
    ///////////////////////////////////////////////////////////////*/

    uint256 SWAP_THRESHOLD_AMOUNT = 500;
    uint256 TIER2_MIN_TX = 2;
    uint256 TIER3_MIN_TX = 4;

    //*///////////////////////////////////////////////////////////////
    //    EVENTS
    ///////////////////////////////////////////////////////////////*/

    event UserSubscribe(address indexed user);
    event UserUnsubscribe(address indexed user, uint256 lastTier);
    event TierUpgrade(address indexed user, uint256 indexed newTier);

    //*///////////////////////////////////////////////////////////////
    //    STORAGES
    ///////////////////////////////////////////////////////////////*/

    mapping(address => uint256) userTier;
    mapping(address => uint256) userTxCount;

    address private protocolContract;
    bytes4 private swapFunctionSelector;

    constructor(address protocolContractAddress, bytes4 functionSelector) {
        protocolContract = protocolContractAddress;
        swapFunctionSelector = functionSelector;
    }

    //*///////////////////////////////////////////////////////////////
    //    VIEWS
    ///////////////////////////////////////////////////////////////*/

    function getMembershipStatus(address user) external view returns (uint256) {
        return userTier[user];
    }

    //*///////////////////////////////////////////////////////////////
    //    EXXTERNALS
    ///////////////////////////////////////////////////////////////*/

    function subscribe() external {
        userTier[msg.sender] = 1;
        emit UserSubscribe(msg.sender);
    }

    function unsubscribe() external {
        uint lastTier = userTier[msg.sender];

        require(lastTier > 0, "USER IS NOT SUBSCRIBED");

        userTier[msg.sender] = 0;
        emit UserUnsubscribe(msg.sender, lastTier);
    }

    function benefits(uint256 tier) external pure returns (uint256) {
        if (tier < 1 || tier > 3) {
            return 0;
        } else {
            return 20 * (tier - 1);
        }
    }

    function validateAndExecuteMembership(
        Transaction calldata _transaction
    ) external returns (bool) {
        return _validateAndExecuteMembership(_transaction);
    }

    //*///////////////////////////////////////////////////////////////
    //    INTERNALS
    ///////////////////////////////////////////////////////////////*/

    // Update user tx count and upgrade to next tier if pass the tiers threshold
    function _updateUserMembership(address user) internal {
        uint256 newCount = userTxCount[user] + 1;
        userTxCount[user] = newCount;

        uint256 currentTier = userTier[user];

        if (currentTier == 1 && newCount >= TIER2_MIN_TX) {
            userTier[user] = 2;
            emit TierUpgrade(user, 2);
        } else if (currentTier == 2 && newCount >= TIER3_MIN_TX) {
            userTier[user] = 3;
            emit TierUpgrade(user, 3);
        }
    }

    // check that the tx calldata is of a specific format
    // 1. get the function sig (the first 4 bytes of calldata)
    // 2. parse the rest so that it conforms to the function parameters encoding

    // TODO: build a toy swap protocol and check if user call the `swap` function and get the
    // amount being swapped. If swapped amount past certain threshold, then increment the user's tx count.

    function _validateAndExecuteMembership(
        Transaction calldata _transaction
    ) internal returns (bool) {
        address to = address(uint160(_transaction.to));
        bytes4 functionSelector = bytes4(_transaction.data[0:4]);
        uint256 amount = abi.decode(_transaction.data[4:], (uint256));

        if (
            to == protocolContract &&
            functionSelector == swapFunctionSelector &&
            amount > SWAP_THRESHOLD_AMOUNT
        ) {
            address user = address(uint160(_transaction.from));
            _updateUserMembership(user);
            return true;
        } else {
            return false;
        }
    }

    /**
     *
     *
     *  PAYMASTER
     *
     *
     */

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

        bool isValid = _validateAndExecuteMembership(_transaction);
        require(isValid, "Transaction doesn't qualify to use this paymaster");

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
