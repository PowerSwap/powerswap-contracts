import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from '../shared/utilities'

import { deployMasterSupplier, deployGovernanceToken } from '../shared/deploy'

import ERC20Mock from '../../build/ERC20Mock.json'

chai.use(solidity)

describe('MasterSupplier::Pools', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const wallets = provider.getWallets()
  const [alice, bob, carol, minter, dev, liquidityFund, communityFund, founderFund] = wallets

  let govToken: Contract
  let lp: Contract
  let lp2: Contract
  
  beforeEach(async () => {
    govToken = await deployGovernanceToken(alice)

    lp = await deployContract(minter, ERC20Mock, ["LPToken", "LP", expandTo18Decimals(1000000)])
    await lp.transfer(alice.address, expandTo18Decimals(1000))
    await lp.transfer(bob.address, expandTo18Decimals(1000))
    await lp.transfer(carol.address, expandTo18Decimals(1000))

    lp2 = await deployContract(minter, ERC20Mock, ["LPToken2", "LP2", expandTo18Decimals(1000000)])
    await lp2.transfer(alice.address, expandTo18Decimals(1000))
    await lp2.transfer(bob.address, expandTo18Decimals(1000))
    await lp2.transfer(carol.address, expandTo18Decimals(1000))
  })

  it("should be able to add a pool", async function () {
    // 1 POWER per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1
    const rewardsStartAtBlock = 100
    const supplier = await deployMasterSupplier(wallets, govToken, expandTo18Decimals(rewardsPerBlock), rewardsStartAtBlock, 1000)

    await govToken.transferOwnership(supplier.address)

    await supplier.add(rewardsPerBlock, lp.address, true)

    expect(await supplier.poolLength()).to.equal(1)
    expect(await supplier.poolExistence(lp.address)).to.equal(true)
  })

  it("should not be able to add the same pool twice", async function () {
    // 1 POWER per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1
    const rewardsStartAtBlock = 100
    const supplier = await deployMasterSupplier(wallets, govToken, expandTo18Decimals(rewardsPerBlock), rewardsStartAtBlock, 1000)

    await govToken.transferOwnership(supplier.address)

    await supplier.add(rewardsPerBlock, lp.address, true)

    expect(await supplier.poolLength()).to.equal(1)
    expect(await supplier.poolExistence(lp.address)).to.equal(true)

    await expect(supplier.add(rewardsPerBlock, lp.address, true)).to.be.revertedWith("MasterSupplier::nonDuplicated: duplicated")
  })

  it("should not be able to add a pool as an unauthorized user", async function () {
    // 1 POWER per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1
    const rewardsStartAtBlock = 100
    const supplier = await deployMasterSupplier(wallets, govToken, expandTo18Decimals(rewardsPerBlock), rewardsStartAtBlock, 1000)

    await govToken.transferOwnership(supplier.address)

    await expect(supplier.connect(bob).add(rewardsPerBlock, lp.address, true)).to.be.revertedWith("Ownable: caller is not the owner")
    expect(await supplier.poolLength()).to.equal(0)
    expect(await supplier.poolExistence(lp.address)).to.equal(false)
  })

  it("should be able to add multiple pools", async function () {
    // 1 POWER per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1
    const rewardsStartAtBlock = 100
    const supplier = await deployMasterSupplier(wallets, govToken, expandTo18Decimals(rewardsPerBlock), rewardsStartAtBlock, 1000)

    await govToken.transferOwnership(supplier.address)

    await supplier.add(rewardsPerBlock, lp.address, true)
    expect(await supplier.poolLength()).to.equal(1)
    expect(await supplier.poolExistence(lp.address)).to.equal(true)

    await supplier.add(rewardsPerBlock, lp2.address, true)
    expect(await supplier.poolLength()).to.equal(2)
    expect(await supplier.poolExistence(lp2.address)).to.equal(true)
  })

  it("should be able to change the allocation points for a given pool", async function () {
    // 1 POWER per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1
    const rewardsStartAtBlock = 100
    const supplier = await deployMasterSupplier(wallets, govToken, expandTo18Decimals(rewardsPerBlock), rewardsStartAtBlock, 1000)

    await govToken.transferOwnership(supplier.address)

    await supplier.add(rewardsPerBlock, lp.address, true)
    expect(await supplier.poolLength()).to.equal(1)
    expect(await supplier.poolExistence(lp.address)).to.equal(true)

    await supplier.set(0, rewardsPerBlock * 10, true)
    const [_lpToken, allocPoint, _lastRewardBlock, _accPowerPerShare] = await supplier.poolInfo(0)
    expect(allocPoint).to.equal(rewardsPerBlock * 10)
  })

  it("should not be able to change the allocation points for a given pool as an unauthorized user", async function () {
    // 1 POWER per block farming rate starting at block 100 with the first halvening block starting 1000 blocks after the start block
    const rewardsPerBlock = 1
    const rewardsStartAtBlock = 100
    const supplier = await deployMasterSupplier(wallets, govToken, expandTo18Decimals(rewardsPerBlock), rewardsStartAtBlock, 1000)

    await govToken.transferOwnership(supplier.address)

    await supplier.add(rewardsPerBlock, lp.address, true)
    expect(await supplier.poolLength()).to.equal(1)
    expect(await supplier.poolExistence(lp.address)).to.equal(true)

    await expect(supplier.connect(bob).set(0, rewardsPerBlock * 10, true)).to.be.revertedWith("Ownable: caller is not the owner")
  })
})
