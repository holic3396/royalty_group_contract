
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract RoyaltyGroup {

  uint256 internal constant SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT = 20000;

  bool private _initializing;
  bool private _entered;

  mapping(address => uint256) private _pendingWithdrawals;
  
  uint32 private _total;
  struct Member {
    address account;
    uint32 value;
  }
  
  Member[] private _members;

  modifier initializer() {
    require(!_initializing, "RoyaltyGroup: contract is not initializing");
    _;
  }
  modifier nonReentrant() {
    require(!_entered, "reentrant call");
    _entered = true;
    _;
    _entered = false;
  }

/***************************************************************************************************
* @notice Called once to configure the contract after the initial proxy deployment.
****************************************************************************************************/
  function initialize(Member[] calldata memberData) external initializer {
    require(memberData.length > 0, "RoyaltyGroup: must have at least one member");
    
    for(uint16 i = 0; i < memberData.length; i++) {
      require(memberData[i].account != address(0), "RoyaltyGroup: invalid address");
      require(memberData[i].value > 0, "RoyaltyGroup: value must be greater than zero");

      _members.push(memberData[i]);
      _total += memberData[i].value;
    }
 
    _initializing = true;
  }

/***************************************************************************************************
* @notice When you receive Ethereum, you will send Ethereum to the members.
****************************************************************************************************/
  receive () external payable {
    require(_members.length > 0, "RoyaltyGroup: contract is not initialized");
    
    for(uint i=0; i<_members.length; i++) {
      Member memory member = _members[i];
      _transfer(member.account, (msg.value * member.value) / _total);
    }
  }

/***************************************************************************************************
* @notice If the transmission fails, it is stored in the withdrawal account and can be withdrawn through this function.
****************************************************************************************************/
  function withdrawFor(address payable user) external nonReentrant {
    uint256 amount = _pendingWithdrawals[user];
    require(amount != 0, "RoyaltyGroup: No Funds Available"); 
    
    _pendingWithdrawals[user] = 0;
    // solhint-disable-next-line avoid-low-level-calls
    (bool success, ) = user.call{ value: amount, gas: SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT }("");
    if (!success) {
      revert("RoyaltyGroup: withdrawFor failed");
    }
  }

/***************************************************************************************************
* @notice Returns the members from this contract.
****************************************************************************************************/
  function getMembers() external view returns (address[] memory account, uint32[] memory value) {
    account = new address[](_members.length);
    value = new uint32[](_members.length);
    for(uint i=0; i<_members.length; i++) {
      account[i] = _members[i].account;
      value[i] = _members[i].value;
    }
  }

/***************************************************************************************************
* @notice Inquiry to see if the address has a withdrawal balance.
****************************************************************************************************/
  function getPendingWithdrawal(address user) external view returns (uint256 balance) {
    return _pendingWithdrawals[user];
  }

/***************************************************************************************************
* @dev Transfer amount to the member
****************************************************************************************************/
  function _transfer(address to, uint256 amount) internal nonReentrant {
    // solhint-disable-next-line avoid-low-level-calls
    (bool success, ) = to.call{ value: amount, gas: SEND_VALUE_GAS_LIMIT_SINGLE_RECIPIENT }("");
    
    if (!success) {
      _pendingWithdrawals[to] += amount;
    }
  }
}