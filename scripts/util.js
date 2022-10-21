const fs = require('fs');
const prompts = require('prompts');

async function updateABI(contractName) {
  const abiDir = `${__dirname}/../abi`;
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir);
  }
  const Artifact = artifacts.readArtifactSync(contractName);
  fs.writeFileSync(
    `${abiDir}/${contractName}.abi`,
    JSON.stringify(Artifact.abi, null, 2)
  )
  fs.writeFileSync(
    `${abiDir}/${contractName}.bin`, Artifact.bytecode)
}

const configFile = `${__dirname}/config.json`;
const updateConfig = async (networkType, attr, data) => {

  var config = fs.readFileSync(configFile, {encoding:'utf8', flag:'a+'});
  if (config == '')
  {
    config = '{}'
  } 
  value = JSON.parse(config);

  value[networkType] = {...value[networkType], [attr]: data};

  fs.writeFileSync(configFile, JSON.stringify(value, null, 2), err => {
    if (err) console.log("Error writing file:", err);
  });
}

function getConfig(networkType, attr) {
  var config = fs.readFileSync(configFile, {encoding:'utf8', flag:'a+'});
  if (config == '')
  {
    fs.writeFileSync(configFile, '{}', err => {
      if (err) console.log("Error writing file:", err);
    });
    return '';
  } 
  value = JSON.parse(config)
  var ret = ""

  value[networkType] != undefined && Object.keys(value[networkType]).forEach((key) => {
    if (key == attr) {
      ret = value[networkType][key];
      //console.log(ret)
    }
  });

  return ret;
}

const royaltyGroupFile = `${__dirname}/royaltyGroup.json`;
function getRoyaltyGroups(networkType, id) {
  var config = fs.readFileSync(royaltyGroupFile, {encoding:'utf8', flag:'a+'});
  if (config == '')
  {
    fs.writeFileSync(royaltyGroupFile, '{}', err => {
      if (err) console.log("Error writing file:", err);
    });
    return '';
  } 
  value = JSON.parse(config)
  let ret;

  value[networkType] != undefined && Object.keys(value[networkType]).forEach((key) => {
    if (key == id) {
      ret = value[networkType][key];
      console.log( ret )
    }
  });

  return Object.entries(ret);
}

async function getPrivateKey(who) {
  const question = [{
      type: 'text',
      name: 'address',
      message: `What's ${who} address? `,
      initial: '0x...',
      validate: value => value.length == 42 && value.startsWith('0x') ? true : 'Invalid address (0x...)'
    },{
      type: 'password',
      name: 'secret',
      message: `input a ${who} private key? `,
      validate: value => value.length == 64 ? true : 'Invalid private key (hex string)'
  }];
  res = await prompts(question);
  return (res.address, res.secret);
}

async function getAddress(who) {
  const question = [{
      type: 'text',
      name: 'address',
      initial: '0x...',
      message: `What's ${who} address? `,
      validate: value => value.length == 42 && value.startsWith('0x') ? true : 'Invalid address (0x...)'
    }];
  res = await prompts(question);
  return res.address;
}

async function exit(msg) {
  if (msg != '') {
    console.log('\x1b[31m%s\x1b[0m', msg);
  }
  process.exit(1);
}

async function skip(msg) {
  if (msg != '') {
    console.log('\x1b[33m%s\x1b[0m', msg);
  }
  return false;
}


async function toBeContinue(msg) {
  if (msg == '') {
    msg = 'Continue'
  }
  const question = [{
    type: 'text',
    name: 'yn',
    initial: 'y',
    message: `${msg} (y/n)? `
  }];
  res = await prompts(question);
  return res.yn.startsWith('y');
}

async function updateRoyaltyGroupFactoryContract(factory) {
  const RoyaltyGroup = getConfig(hre.network.name, 'RoyaltyGroup');
  RoyaltyGroup
    ? await factory.updateImplementationRoyaltyGroup(RoyaltyGroup)
      && console.log("update RoyaltyGroup implementation:", RoyaltyGroup)
    : await skip('RoyaltyGroup address is required in config file for call updateImplementationRoyaltyGroup');
}


module.exports = {
  updateConfig,
  getConfig,
  updateABI,
  getPrivateKey,
  getAddress,
  exit,
  updateRoyaltyGroupFactoryContract,
  getRoyaltyGroups
};