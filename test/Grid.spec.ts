import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'

import { deployGovernanceToken } from './shared/deploy'

import Grid from '../build/Grid.json'

chai.use(solidity)

describe('Grid', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [alice, bob, carol] = provider.getWallets()

  let govToken: Contract
  let grid: Contract

  beforeEach(async () => {
    govToken = await deployGovernanceToken(alice)
    
    await govToken.mint(alice.address, "100")
    await govToken.mint(bob.address, "100")
    await govToken.mint(carol.address, "100")

    grid = await deployContract(alice, Grid, ["PowerGrid", "xPOWER", govToken.address])
  })

  it('should have correct values for: name, symbol, decimals, totalSupply, balanceOf', async () => {
    const name = await grid.name()
    expect(name).to.eq('PowerGrid')
    expect(await grid.symbol()).to.eq('xPOWER')
    expect(await grid.decimals()).to.eq(18)
    expect(await grid.totalSupply()).to.eq(0)
    expect(await grid.balanceOf(alice.address)).to.eq(0)
  })

  it("should not allow enter if not enough approve", async function () {
    await expect(grid.enter("100")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    await govToken.approve(grid.address, "50")
    await expect(grid.enter("100")).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
    await govToken.approve(grid.address, "100")
    await grid.enter("100")
    expect(await grid.balanceOf(alice.address)).to.equal("100")
  })

  it("should not allow withraw more than what you have", async function () {
    await govToken.approve(grid.address, "100")
    await grid.enter("100")
    await expect(grid.leave("200")).to.be.revertedWith("ERC20: burn amount exceeds balance")
  })

  it("should work with more than one participant", async function () {
    await govToken.approve(grid.address, "100")
    await govToken.connect(bob).approve(grid.address, "100")
    // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
    await grid.enter("20")
    await grid.connect(bob).enter("10")
    expect(await grid.balanceOf(alice.address)).to.equal("20")
    expect(await grid.balanceOf(bob.address)).to.equal("10")
    expect(await govToken.balanceOf(grid.address)).to.equal("30")
    // PowerGrid get 20 more POWER from an external source.
    await govToken.connect(carol).transfer(grid.address, "20")
    // Alice deposits 10 more POWER. She should receive 10*30/50 = 6 shares.
    await grid.enter("10")
    expect(await grid.balanceOf(alice.address)).to.equal("26")
    expect(await grid.balanceOf(bob.address)).to.equal("10")
    // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
    await grid.connect(bob).leave("5")
    expect(await grid.balanceOf(alice.address)).to.equal("26")
    expect(await grid.balanceOf(bob.address)).to.equal("5")
    expect(await govToken.balanceOf(grid.address)).to.equal("52")
    expect(await govToken.balanceOf(alice.address)).to.equal("70")
    expect(await govToken.balanceOf(bob.address)).to.equal("98")
  })

})
