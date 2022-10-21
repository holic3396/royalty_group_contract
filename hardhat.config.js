require("dotenv").config({ path: ".env" });

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require('@nomiclabs/hardhat-truffle5');
require('solidity-coverage');
//const royaltygroup = require("./scripts/create_royaltygroup");
const util = require("./scripts/util");


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task('createGroup', 'Create Royalty group')
  .addPositionalParam(
    'id',
    'Royalty group ID',
    undefined,
    types.string,
    false
  ).setAction(async (taskArgs, hre) => {
    console.log(taskArgs)
    console.log(taskArgs.id)
    // groups = royaltygroup.createGroup(hre, taskArgs.id);
    
    groups = util.getRoyaltyGroups(hre.network.name, taskArgs.id);
    console.log("groups address:", groups);

    [deployer,...addrs] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address)
    const adminAddress = deployer.address;
    const beforeRoyaltyGroupFactory = util.getConfig(hre.network.name, 'RoyaltyGroupFactory') || 'none';
    console.log("admin contract Address:", adminAddress);
    console.log("before Factory Address:", beforeRoyaltyGroupFactory);
    
    if (! beforeRoyaltyGroupFactory) {
      util.exit("RoyaltyGroupFactory contract is null ");
    }

    const factory = (await hre.ethers.getContractFactory('RoyaltyGroupFactory')).attach(beforeRoyaltyGroupFactory);
    
    admin = await factory.contractAdmin();
    console.log("RoyaltyGroup admin Address:", admin);
    if ( adminAddress != admin ) {
      util.exit("contractAdmin : " + admin + ", deployer : " + adminAddress);
    }

    createdAddress = await factory.contractRoyaltyGroup(taskArgs.id, groups);
    console.log("Created. Transaction hash:", createdAddress.hash);

  })

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    goerli: {
      url: process.env.GOERLI_URL|| "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_URL|| "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    main: {
      url: process.env.MAIN_URL|| "",
      accounts:
        process.env.PRIVATE_KEY_MAIN !== undefined ? [process.env.PRIVATE_KEY_MAIN] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
