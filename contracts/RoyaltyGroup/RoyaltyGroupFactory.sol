

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./RoyaltyGroup.sol";

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract RoyaltyGroupFactory {
  using Address for address;

  address public contractAdmin;
  
  address public implementationRoyaltyGroup;
  uint256 public versionRoyaltyGroup;

  event RoyaltyGroupCreated(address indexed contractAddress, address indexed creator, uint256 indexed id, uint256 version);
  event UpdatedRoyaltyGroup(address implementation, uint256 version);

  modifier onlyAdmin() {
    require(contractAdmin == msg.sender, "RoyaltyGroupFactory: Only the admin can call this function");
    _;
  }
/***************************************************************************************************
* @title Set initialization when creating contracts
****************************************************************************************************/
  constructor(address _contractAdmin) {
    require(! _contractAdmin.isContract(), "RoyaltyGroupFactory: contract admin should not be a contract");
    
    contractAdmin = _contractAdmin;
  }

/***************************************************************************************************
* @notice Update the Admin contract.
****************************************************************************************************/
  function updateAdmin(address newContractAdmin) external onlyAdmin {
    require(!newContractAdmin.isContract(), "RoyaltyGroupFactory: contract admin should not be a contract");
    contractAdmin = newContractAdmin;
  }
  
/***************************************************************************************************
* @notice Create a new RoyaltyGroup contract.
****************************************************************************************************/
  function contractRoyaltyGroup(uint256 id, RoyaltyGroup.Member[] calldata members) external onlyAdmin returns (address) {
    require(versionRoyaltyGroup > 0, "RoyaltyGroupFactory: RoyaltyGroup contract is not initialized");

    address payable contractAddress = payable(Clones.clone(implementationRoyaltyGroup));
    RoyaltyGroup rg = RoyaltyGroup(contractAddress);
    rg.initialize(members);

    emit RoyaltyGroupCreated(contractAddress, msg.sender, id, versionRoyaltyGroup);
    return contractAddress;
  }

/***************************************************************************************************
* @notice Update the RoyaltyGroup contract.
****************************************************************************************************/
  function updateImplementationRoyaltyGroup(address implementation) external onlyAdmin {
    require( implementation.isContract(), "RoyaltyGroupFactory: must be a contract");
    implementationRoyaltyGroup = implementation;
    unchecked {
      versionRoyaltyGroup++;
    }

    emit UpdatedRoyaltyGroup(implementation, versionRoyaltyGroup);
  }
}