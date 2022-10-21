const hre = require("hardhat");
const util = require("./util");

const RoyaltyGroupContractName = "RoyaltyGroup";
const RoyaltyGroupFactoryContractName = "RoyaltyGroupFactory";

async function main() {
  [deployer,...addrs] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address)
  const adminAddress = deployer.address;
  const beforeRoyaltyGroupFactory = util.getConfig(hre.network.name, 'RoyaltyGroupFactory') || 'none';
  const beforeRoyaltyGroup = util.getConfig(hre.network.name, 'RoyaltyGroup') || 'none';
  console.log("admin contract Address(Proxy):", adminAddress);
  console.log("before Address:", beforeRoyaltyGroup);
  console.log("before Factory Address:", beforeRoyaltyGroupFactory);
  
/*
// RoyaltyGroup 만 배포하고 팩토리에 업데이트 하려는 경우 사용.
const RoyaltyGroup = await hre.ethers.getContractFactory(RoyaltyGroupContractName);
const royalty = await RoyaltyGroup.deploy();
await royalty.deployed();

console.log(RoyaltyGroupContractName, "deployed to:", royalty.address);

await util.updateABI(RoyaltyGroupContractName);

await util.updateConfig(hre.network.name, 'RoyaltyGroup', royalty.address);

const factory = (await hre.ethers.getContractFactory('RoyaltyGroupFactory')).attach(beforeRoyaltyGroupFactory);
await util.updateRoyaltyGroupFactoryContract(factory);

*///

  const RoyaltyGroupFactory = await hre.ethers.getContractFactory(RoyaltyGroupFactoryContractName);
  const factory = await RoyaltyGroupFactory.deploy(adminAddress)
  await factory.deployed();

  console.log(RoyaltyGroupFactoryContractName, "deployed to:", factory.address);

  await util.updateABI(RoyaltyGroupFactoryContractName);

  await util.updateConfig(hre.network.name, 'RoyaltyGroupFactory', factory.address);

  const RoyaltyGroup = await hre.ethers.getContractFactory(RoyaltyGroupContractName);
  const royalty = await RoyaltyGroup.deploy();
  await royalty.deployed();

  console.log(RoyaltyGroupContractName, "deployed to:", royalty.address);

  await util.updateABI(RoyaltyGroupContractName);

  await util.updateConfig(hre.network.name, 'RoyaltyGroup', royalty.address);

  await util.updateRoyaltyGroupFactoryContract(factory);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
