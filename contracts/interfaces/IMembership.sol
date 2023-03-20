// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import {Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";

interface IMembership {
    function getMembershipStatus(address user) external view returns (uint256);

    /**
     * @notice Initialize user into the membership. Membership status will only be recorded after user has subscribed.
     * @dev Generally, user should be given the default tier when they first subscribe.
     * @dev Should revert if unable to subscribe.
     */
    function subscribe() external;

    /**
     * @notice Remove user from the membership.
     * @dev Only 'subscribed' user can call this function.
     * @dev Depends on the membership rules, you may or may not decide to delete the user's record when they unsubscribe.
     * @dev Should revert if unable to unsubscribe.
     */
    function unsubscribe() external;

    /**
     *
     * IMPORTANT: THIS IS NOT VERY SAFE AS USER CAN CALL THIS FUNCTION WITH FAKE `_transaction`.
     *
     * @dev Should run the membership validation logic to update the user's membership status.
     * @dev This function is to be called in every transaction.
     */
    function validateAndExecuteMembership(
        Transaction calldata _transaction
    ) external returns (bool);
}
