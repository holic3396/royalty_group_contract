const util = require("./util");


async function createGroup(hre, id) {
  groups = util.getRoyaltyGroups(hre.network.name, id);

  [deployer,...addrs] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address)
  const adminAddress = deployer.address;
  const beforeRoyaltyGroupFactory = util.getConfig(hre.network.name, 'RoyaltyGroupFactory') || 'none';
  // console.log("admin contract Address:", adminAddress);
  // console.log("before Factory Address:", beforeRoyaltyGroupFactory);
  
  if (! beforeRoyaltyGroupFactory) {
    util.exit("RoyaltyGroupFactory contract is null ");
  }

  const factory = (await hre.ethers.getContractFactory('RoyaltyGroupFactory')).attach(beforeRoyaltyGroupFactory);
  
  admin = await factory.contractAdmin();
  if ( adminAddress != admin ) {
    util.exit("contractAdmin : " + admin + ", deployer : " + adminAddress);
  }

  createdAddress = await factory.contractRoyaltyGroup( id, groups );

  console.log("RoyaltyGroup contract Address:", createdAddress);
}

module.exports = {
  createGroup,
}