const { BN, expectEvent, expectRevert, ether, time, send, balance } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const test_util = require("./test_util");

const RoyaltyGroup = artifacts.require('RoyaltyGroup');
const RoyaltyGroupFactory = artifacts.require('RoyaltyGroupFactory');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_AMOUNT = ether('0');

var royaltyGroupContract;
var royaltyGroupFactoryContract;

/***************************************************************************************************
* 테스트 시작
****************************************************************************************************/
function Factory(accounts) {

  const BASIC_RATIO = 10000;
  const MARKET_ROYALTY_RATIO = 2000;  // 마켓 수수료 1%~50% 범위 안에서 해야함
  const NFT_ROYALTY_RATIO = 1000; // 2차 마켓 로열티 수수료 10% 제약 (10% 이상이면 10%로 고정)

  /***************************************************************************************************
  * 기본 기능 테스트
  ****************************************************************************************************/
  describe('basic Factory info ', function () {
    it('contractAdmin', async function () {
      expect(await royaltyGroupFactoryContract.contractAdmin()).to.equal(accounts[0]);
    });

    it('contractRoyaltyGroup', async function () {
      expect(await royaltyGroupFactoryContract.implementationRoyaltyGroup()).to.equal(royaltyGroupContract.address);
    });

    it('change updateAdmin', async function () {
      await royaltyGroupFactoryContract.updateAdmin(accounts[3]);
      expect(await royaltyGroupFactoryContract.contractAdmin()).to.equal(accounts[3]);
    });

    it('change updateImplementationRoyaltyGroup', async function () {
      new_royaltyGroupContract = await RoyaltyGroup.new({ from: accounts[0] });
      await royaltyGroupFactoryContract.updateImplementationRoyaltyGroup(new_royaltyGroupContract.address);
      expect(await royaltyGroupFactoryContract.implementationRoyaltyGroup()).to.equal(new_royaltyGroupContract.address);

      Receipt = royaltyGroupFactoryContract.updateImplementationRoyaltyGroup(accounts[3]);
      await expectRevert(Receipt, "RoyaltyGroupFactory: must be a contract");
    });

    it('check RoyaltyGroup function', async function () {
      await royaltyGroupContract.initialize([[accounts[5], 600], [accounts[6], 300], [accounts[7], 100]]);

      let getPendingWithdrawal = await royaltyGroupContract.getPendingWithdrawal(accounts[5]);
      expect(getPendingWithdrawal).to.be.bignumber.equal(ZERO_AMOUNT);

      let getMembers = await royaltyGroupContract.getMembers();
      expect(getMembers.account[0]).to.equal(accounts[5]);
      expect(getMembers.value[0]).to.bignumber.equal('600');
      expect(getMembers.account[1]).to.equal(accounts[6]);
      expect(getMembers.value[1]).to.bignumber.equal('300');
      expect(getMembers.account[2]).to.equal(accounts[7]);
      expect(getMembers.value[2]).to.bignumber.equal('100');
    });

  });

  /***************************************************************************************************
  * 생성 초기화 및 초기 셋팅 관련 테스트
  ****************************************************************************************************/
  describe('revert initialize', function () {
    it('initialize', async function () {
      // 팩토리 컨트랙트
      Receipt = RoyaltyGroupFactory.new(royaltyGroupContract.address, { from: accounts[0] }); // 컨트랙트 팩토리 생성
      await expectRevert(Receipt, "RoyaltyGroupFactory: contract admin should not be a contract");

      // 머니파이프 컨트랙트
      Receipt = royaltyGroupContract.initialize([]); // member가 없으면 에러
      await expectRevert(Receipt, "RoyaltyGroup: must have at least one member");

      Receipt = royaltyGroupContract.initialize([[accounts[2], 500], [ZERO_ADDRESS, 300]]); // 주소가 잘못되면 에러
      await expectRevert(Receipt, "RoyaltyGroup: invalid address");

      Receipt = royaltyGroupContract.initialize([[accounts[2], 500], [accounts[4], 0]]); // value가 0이면 에러
      await expectRevert(Receipt, "RoyaltyGroup: value must be greater than zero");
    });

    it('contractRoyaltyGroup is not update and admin', async function () {
      testFactoryContract = await RoyaltyGroupFactory.new(accounts[0], { from: accounts[0] }); // 컨트랙트 팩토리 생성
      // 머니파이프 컨트랙트가 등록되어 있지 않음
      Receipt = testFactoryContract.contractRoyaltyGroup(0, [[accounts[1], 300], [accounts[2], 200], [accounts[3], 500]]);
      await expectRevert(Receipt, "RoyaltyGroupFactory: RoyaltyGroup contract is not initialized");
      // 어드민이 아님
      Receipt = testFactoryContract.updateImplementationRoyaltyGroup(royaltyGroupContract.address, { from: accounts[9] });
      await expectRevert(Receipt, "RoyaltyGroupFactory: Only the admin can call this function");
    });

    it('contractRoyaltyGroup no members receive', async function () {
      Receipt = send.ether(accounts[0], royaltyGroupContract.address, ether('1'));
      await expectRevert(Receipt, "RoyaltyGroup: contract is not initialized");
    });

  });

  /***************************************************************************************************
  * 머니 파이프 테스트
  ****************************************************************************************************/
  describe('check RoyaltyGroup function', function () {
    beforeEach(async function () {
      await royaltyGroupContract.initialize([[accounts[5], 600], [accounts[6], 300], [accounts[7], 100]]);
    });

    it('getMembers', async function () {
      let getMembers = await royaltyGroupContract.getMembers();
      expect(getMembers.account[0]).to.equal(accounts[5]);
      expect(getMembers.value[0]).to.bignumber.equal('600');
      expect(getMembers.account[1]).to.equal(accounts[6]);
      expect(getMembers.value[1]).to.bignumber.equal('300');
      expect(getMembers.account[2]).to.equal(accounts[7]);
      expect(getMembers.value[2]).to.bignumber.equal('100');
    });

    it('getPendingWithdrawal', async function () {
      let getPendingWithdrawal = await royaltyGroupContract.getPendingWithdrawal(accounts[5]);
      expect(getPendingWithdrawal).to.be.bignumber.equal(ZERO_AMOUNT);
    });

    it('withdrawFor', async function () {
      Receipt = royaltyGroupContract.withdrawFor(accounts[5]);
      await expectRevert(Receipt, "RoyaltyGroup: No Funds Available");

      /*royaltyGroupContract.withdrawFor(accounts[2]);
      Receipt = royaltyGroupContract.withdrawFor(accounts[3]);
      await expectRevert(Receipt, "reentrant call");*/
    });

    it('re initialize revert', async function () {
      Receipt = royaltyGroupContract.initialize([[accounts[5], 600], [accounts[6], 300], [accounts[7], 100]]);
      await expectRevert(Receipt, "RoyaltyGroup: contract is not initializing");
    });

  });

  /***************************************************************************************************
  * 머니 파이프 이더 전송 실패시 코드 테스트
  ****************************************************************************************************/
  describe('check RoyaltyGroup function', function () {
    const DummyMock = artifacts.require('DummyMock');
    var dummyMock;
    beforeEach(async function () {
      dummyMock = await DummyMock.new();
      expect(await dummyMock.who()).to.equal('dummy');
      await royaltyGroupContract.initialize([[dummyMock.address, 700], [accounts[2], 200], [accounts[3], 100]]);
    });

    it('send value pending', async function () {
      const Amount = ether('1');
      await send.ether(accounts[0], royaltyGroupContract.address, Amount);

      let getPendingWithdrawal = await royaltyGroupContract.getPendingWithdrawal(dummyMock.address);
      const dummyMockAmount = Amount.mul(new BN(700)).divn(1000); // 여기서 1000은 머니파이프 맴버 비율 총 합 300 + 200 + 500 = 1000
      expect(getPendingWithdrawal).to.be.bignumber.equal(dummyMockAmount);

      Receipt = royaltyGroupContract.withdrawFor(dummyMock.address);
      await expectRevert(Receipt, "RoyaltyGroup: withdrawFor failed");
    });

  });

  /***************************************************************************************************
  * Factory 테스트
  ****************************************************************************************************/
  describe('Factory', function () {
    let RoyaltyGroupContract;
    beforeEach(async function () {
      // 머니 파이프 생성
      const Index_Id = '0';
      const RoyaltyGroupContractVersion = await royaltyGroupFactoryContract.versionRoyaltyGroup();
      let receipt = await royaltyGroupFactoryContract.contractRoyaltyGroup(0, [[accounts[1], 1], [accounts[2], 1], [accounts[3], 1]]);
      RoyaltyGroupContract = receipt.logs[0].args.contractAddress;
      expectEvent(receipt, 'RoyaltyGroupCreated', { contractAddress: RoyaltyGroupContract, creator: accounts[0], id: Index_Id, version: RoyaltyGroupContractVersion });

    });

    /***************************************************************************************************
    * 머니 파이프를 통해 이더 전송시 분배 확인. 
    ****************************************************************************************************/
    it('Transfer Ether', async function () {
      const accountTracker_1 = await balance.tracker(accounts[1]);
      const accountTracker_2 = await balance.tracker(accounts[2]);
      const accountTracker_3 = await balance.tracker(accounts[3]);
      const accountTracker_5 = await balance.tracker(RoyaltyGroupContract);

      const Amount = ether('1');
      const account_1_ratio = Amount.mul(new BN(1)).divn(3); // 여기서 900은 머니파이프 맴버 비율 총 합 300 + 300 + 300 = 900
      const account_2_ratio = Amount.mul(new BN(1)).divn(3);
      const account_3_ratio = Amount.mul(new BN(1)).divn(3);
      // console.log("Tracker : " + account_1_ratio)
      // console.log("Tracker : " + account_2_ratio)
       console.log("Tracker : " + account_3_ratio)

      await send.ether(accounts[4], RoyaltyGroupContract, Amount);

      expect(await accountTracker_1.delta()).to.be.bignumber.equal(account_1_ratio);
      expect(await accountTracker_2.delta()).to.be.bignumber.equal(account_2_ratio);
      expect(await accountTracker_3.delta()).to.be.bignumber.equal(account_3_ratio);
      expect(await accountTracker_5.delta()).to.be.bignumber.equal('1');

    });

  });

  describe('Factory member4', function () {
    let RoyaltyGroupContract;
    beforeEach(async function () {
      // 머니 파이프 생성
      const Index_Id = '0';
      const RoyaltyGroupContractVersion = await royaltyGroupFactoryContract.versionRoyaltyGroup();
      let receipt = await royaltyGroupFactoryContract.contractRoyaltyGroup(0, [[accounts[1], 33], [accounts[2], 33], [accounts[3], 33], [accounts[4], 1]]);
      RoyaltyGroupContract = receipt.logs[0].args.contractAddress;
      expectEvent(receipt, 'RoyaltyGroupCreated', { contractAddress: RoyaltyGroupContract, creator: accounts[0], id: Index_Id, version: RoyaltyGroupContractVersion });

    });

    /***************************************************************************************************
    * 머니 파이프를 통해 이더 전송시 분배 확인. 
    ****************************************************************************************************/
    it('Transfer Ether', async function () {
      const accountTracker_1 = await balance.tracker(accounts[1]);
      const accountTracker_2 = await balance.tracker(accounts[2]);
      const accountTracker_3 = await balance.tracker(accounts[3]);
      const accountTracker_4 = await balance.tracker(accounts[4]);
      const accountTracker_5 = await balance.tracker(RoyaltyGroupContract);

      const Amount = ether('1.234');
      const account_1_ratio = Amount.mul(new BN(33)).divn(100); // 여기서 10은 머니파이프 맴버 비율 총 합 3 + 3 + 3 + 1 = 10
      const account_2_ratio = Amount.mul(new BN(33)).divn(100);
      const account_3_ratio = Amount.mul(new BN(33)).divn(100);
      const account_4_ratio = Amount.mul(new BN(1)).divn(100);
       console.log("Tracker : " + account_1_ratio)
      // console.log("Tracker : " + account_2_ratio)
      console.log("Tracker : " + account_4_ratio)

      await send.ether(accounts[5], RoyaltyGroupContract, Amount);

      expect(await accountTracker_1.delta()).to.be.bignumber.equal(account_1_ratio);
      expect(await accountTracker_2.delta()).to.be.bignumber.equal(account_2_ratio);
      expect(await accountTracker_3.delta()).to.be.bignumber.equal(account_3_ratio);
      expect(await accountTracker_4.delta()).to.be.bignumber.equal(account_4_ratio);
      expect(await accountTracker_5.delta()).to.be.bignumber.equal('0');

    });

  });
};


contract('RoyaltyGroupFactory', function (accounts) {
  beforeEach(async function () {

    royaltyGroupContract = await RoyaltyGroup.new({ from: accounts[0] });
    royaltyGroupFactoryContract = await RoyaltyGroupFactory.new(accounts[0],  { from: accounts[0] });
    await royaltyGroupFactoryContract.updateImplementationRoyaltyGroup(royaltyGroupContract.address);

  });

  Factory(accounts);
});