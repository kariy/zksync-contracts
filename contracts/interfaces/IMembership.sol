// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

interface IMembership {
    function getMembershipStatus(address user) external view returns (uint256);

    /// @dev Ideally, user's membership status should be upgraded sequentially.
    /// e.g., Tier 1 -> Tier 2, instead of straight away from Tier 1 -> Tier 3
    function upgradeUserMembership(address user) external returns (uint256);

    function downgradeUserMembership(address user) external returns (uint256);

    /**
     * @notice Initialize user into the membership. Membership status will only be recorded after user has subscribed.
     * @dev Generally, user should be given the default tier when they first subscribe.
     */
    function subscribe() external;

    /**
     * @notice Remove user from the membership.
     * @dev Only 'subscribed' user can call this function.
     * @dev Depends on the membership rules, you may or may not decide to delete the user's record when they unsubscribe.
     */
    function unsubscribe() external;
}
