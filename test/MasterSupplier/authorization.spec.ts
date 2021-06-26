import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'

import { expandTo18Decimals } from '../shared/utilities'

import { deployMasterSupplier, deployGovernanceToken } from '../shared/deploy'

chai.use(solidity)

const REWARDS_PER_BLOCK = expandTo18Decimals(1000)
const REWARDS_START_BLOCK = 0
const HALVING_AFTER_BLOCK_COUNT = 45360

describe('MasterSupplier::Authorization', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const wallets = provider.getWallets()
  const [alice, bob, carol, minter, dev, liquidityFund, communityFund, founderFund] = wallets

  let govToken: Contract
  let supplier: Contract
  
  beforeEach(async () => {
    govToken = await deployGovernanceToken(alice)
    // 1000 POWER per block, rewards start at block 0, rewards are halved after every 45360 blocks
    supplier = await deployMasterSupplier(wallets, govToken, REWARDS_PER_BLOCK, REWARDS_START_BLOCK, HALVING_AFTER_BLOCK_COUNT)
  })

  it("should allow the owner to reclaim ownership of the Power token", async function () {
    expect(await govToken.transferOwnership(supplier.address))

    expect(await govToken.owner()).to.be.equal(supplier.address)

    await expect(supplier.reclaimTokenOwnership(alice.address))
      .to.emit(govToken, 'OwnershipTransferred')
      .withArgs(supplier.address, alice.address)
    
    expect(await govToken.owner()).to.be.equal(alice.address)
  })

  it("should allow authorized users to reclaim ownership of the Power token", async function () {
    await supplier.addAuthorized(bob.address)

    expect(await govToken.transferOwnership(supplier.address))

    expect(await govToken.owner()).to.be.equal(supplier.address)

    await expect(supplier.connect(bob).reclaimTokenOwnership(bob.address))
      .to.emit(govToken, 'OwnershipTransferred')
      .withArgs(supplier.address, bob.address)
    
    expect(await govToken.owner()).to.be.equal(bob.address)
  })

  it("unauthorized users shouldn't be able to reclaim ownership of the token back from MasterChef", async function () {
    expect(await govToken.transferOwnership(supplier.address))
    expect(await govToken.owner()).to.be.equal(supplier.address)

    await expect(supplier.connect(bob).reclaimTokenOwnership(bob.address)).to.be.reverted
    
    expect(await govToken.owner()).to.be.equal(supplier.address)
  })

  it("should allow only authorized users to update the developer rewards address", async function () {
    expect(await supplier.devaddr()).to.equal(dev.address)

    await expect(supplier.connect(bob).dev(bob.address)).to.be.reverted

    await supplier.addAuthorized(dev.address)
    await supplier.connect(dev).dev(bob.address)
    expect(await supplier.devaddr()).to.equal(bob.address)

    await supplier.addAuthorized(bob.address)
    await supplier.connect(bob).dev(alice.address)
    expect(await supplier.devaddr()).to.equal(alice.address)
  })

  it("should allow only authorized users to update the liquidity provider rewards address", async function () {
    expect(await supplier.liquidityaddr()).to.equal(liquidityFund.address)

    await expect(supplier.connect(bob).lpUpdate(bob.address)).to.be.reverted

    await supplier.addAuthorized(liquidityFund.address)
    await supplier.connect(liquidityFund).lpUpdate(bob.address)
    expect(await supplier.liquidityaddr()).to.equal(bob.address)

    await supplier.addAuthorized(bob.address)
    await supplier.connect(bob).lpUpdate(alice.address)
    expect(await supplier.liquidityaddr()).to.equal(alice.address)
  })

  it("should allow only authorized users to update the community fund rewards address", async function () {
    expect(await supplier.comfundaddr()).to.equal(communityFund.address)

    await expect(supplier.connect(bob).comUpdate(bob.address)).to.be.reverted

    await supplier.addAuthorized(communityFund.address)
    await supplier.connect(communityFund).comUpdate(bob.address)
    expect(await supplier.comfundaddr()).to.equal(bob.address)

    await supplier.addAuthorized(bob.address)
    await supplier.connect(bob).comUpdate(alice.address)
    expect(await supplier.comfundaddr()).to.equal(alice.address)
  })

  it("should allow only authorized users to update the founder rewards address", async function () {
    expect(await supplier.founderaddr()).to.equal(founderFund.address)

    await expect(supplier.connect(bob).founderUpdate(bob.address)).to.be.reverted

    await supplier.addAuthorized(founderFund.address)
    await supplier.connect(founderFund).founderUpdate(bob.address)
    expect(await supplier.founderaddr()).to.equal(bob.address)

    await supplier.addAuthorized(bob.address)
    await supplier.connect(bob).founderUpdate(alice.address)
    expect(await supplier.founderaddr()).to.equal(alice.address)
  })
})
