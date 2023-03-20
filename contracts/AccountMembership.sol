// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import {IMembership} from "./interfaces/IMembership.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";

/**
 * @notice Stores the list of subscribed memberships.
 */
abstract contract AccountMembership {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private subscribedMemberships;

    function subscribeToMembership(address membership) external {
        IMembership(membership).subscribe();
        subscribedMemberships.add(membership);
    }

    function unsubscribeToMembership(address membership) external {
        IMembership(membership).unsubscribe();
        subscribedMemberships.remove(membership);
    }

    function isSubscribed(address membership) external view returns (bool) {
        return subscribedMemberships.contains(membership);
    }

    /// @notice Will go through all the subscribed memberships' `validateTransaction` method
    function _executeMemberships(Transaction calldata _transaction) internal {
        uint total = subscribedMemberships.length();

        for (uint i = 0; i < total; i++) {
            address membership = subscribedMemberships.at(i);
            IMembership(membership).validateAndExecuteMembership(_transaction);
        }
    }
}
