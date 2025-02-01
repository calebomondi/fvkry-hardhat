import { time, loadFixture, } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";
  
  describe("Fvkry", function () {
    async function deployFvkryFixture() {
      // Get signers
      const [owner, otherAccount] = await hre.ethers.getSigners();
  
      // Deploy Fvkry contract
      const Fvkry = await hre.ethers.getContractFactory("Fvkry");
      const fvkry = await Fvkry.deploy();
  
      // Deploy a mock ERC20 token for testing
      const MockToken = await hre.ethers.getContractFactory("MockERC20Token");
      const mockToken = await MockToken.deploy("Mock Token", "MTK");
      const INITIAL_SUPPLY = hre.ethers.parseEther("1000");
      await mockToken.mint(owner.address, INITIAL_SUPPLY);
  
      return { fvkry, mockToken, owner, otherAccount };
    }
  
    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        expect(await fvkry.owner()).to.equal(owner.address);
      });
    });

    describe("ETH Locking", function () {
      const VAULT_ID = 0;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("1");
      const TITLE = "My ETH Lock";
  
      it("Should lock ETH successfully", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
  
        //lock eth
        await expect(fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT }))
          .to.emit(fvkry, "AssetLocked")
          .withArgs(hre.ethers.ZeroAddress, LOCK_AMOUNT, TITLE, VAULT_ID, anyValue, anyValue);
  
        // verify locks
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].amount).to.equal(LOCK_AMOUNT);
        expect(locks[0].isNative).to.be.true;
      });
  
      it("Should fail to lock 0 ETH", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        await expect(fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: 0 }))
          .to.be.revertedWith("ETH to lock must a value greater than 0");
      });
  
      it("Should allow adding more ETH to locked amount", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //first lock
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        // Add more ETH to vault, emit event and get the timestamp
        const additionalAmount = hre.ethers.parseEther("0.5");
        
        await expect(fvkry.addToLockedETH(VAULT_ID, 0, { value: additionalAmount }))
          .to.emit(fvkry, "AssetAdded")
          .withArgs(hre.ethers.ZeroAddress, additionalAmount, TITLE, VAULT_ID, anyValue);
  
        //verify addition
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].amount).to.equal(LOCK_AMOUNT + additionalAmount);
      });
    });
    
    describe("Token Locking", function () {
      const VAULT_ID = 0;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("100");
      const TITLE = "My Token Lock";
  
      it("Should lock tokens successfully", async function () {
        const { fvkry, mockToken, owner } = await loadFixture(deployFvkryFixture);
  
        // Approve tokens first
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
  
        //execute transaction
        await expect(fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE))
          .to.emit(fvkry, "AssetLocked")
          .withArgs(mockToken.target, LOCK_AMOUNT, TITLE, VAULT_ID, anyValue, anyValue);
  
        //verify locks
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].amount).to.equal(LOCK_AMOUNT);
        expect(locks[0].isNative).to.be.false;
      });
  
      it("Should fail to lock tokens without approval", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        await expect(fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE))
          .to.be.reverted;
      });
  
      it("Should allow adding more tokens to locked amount", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        // Initial lock
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);
  
        // Add more tokens
        const additionalAmount = hre.ethers.parseEther("50");
        await mockToken.approve(fvkry.target, additionalAmount);

        
        await expect(fvkry.addToLockedTokens(mockToken.target, 0, additionalAmount, VAULT_ID))
          .to.emit(fvkry, "AssetAdded")
          .withArgs(mockToken.target, additionalAmount, TITLE, VAULT_ID, anyValue);
  
        //verify addition
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].amount).to.equal(LOCK_AMOUNT + additionalAmount);
      });
    });

    describe("Asset Transfer", function () {
      const VAULT_ID = 0;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("1");
      const TITLE = "Test Lock";
  
      it("Should not allow withdrawal before lock period ends", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await expect(fvkry.transferAsset(0, VAULT_ID, LOCK_AMOUNT, false))
          .to.be.revertedWith("The lock period has not yet expired and the value has not reached set goal!");
      });
  
      it("Should allow withdrawal after lock period ends", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        // Increase time to after lock period
        await time.increase(LOCK_PERIOD + 1);
  
        await expect(fvkry.transferAsset(0, VAULT_ID, LOCK_AMOUNT, false))
          .to.emit(fvkry, "AssetWithdrawal")
          .withArgs(hre.ethers.ZeroAddress, LOCK_AMOUNT, TITLE, VAULT_ID, anyValue);
  
        // Check that the ETH was transferred
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].withdrawn).to.be.true;
      });

      it("Should allow withdrawal after locking goal is reached", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
          
        //set goal as reached
        await fvkry.transferAsset(0, VAULT_ID, LOCK_AMOUNT, true);
  
        // Check that the ETH was transferred
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].withdrawn).to.be.true;
      });
  
      it("Should allow partial withdrawals", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await time.increase(LOCK_PERIOD + 1);
  
        const partialAmount = LOCK_AMOUNT / 2n;
        await fvkry.transferAsset(0, VAULT_ID, partialAmount, false);
  
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].amount).to.equal(partialAmount);
        expect(locks[0].withdrawn).to.be.false;
      });
    });
  
    describe("Lock Period Extension", function () {
      const VAULT_ID = 0;
      const INITIAL_LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days
      const EXTENSION_PERIOD = 60 * 24 * 60 * 60; // 60 days
      const LOCK_AMOUNT = hre.ethers.parseEther("1");
      const TITLE = "Test Lock";
  
      it("Should allow extending lock period after expiry", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, INITIAL_LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        // Move past initial lock period
        await time.increase(INITIAL_LOCK_PERIOD + 1);
  
        await expect(fvkry.extendLockPeriod(0, VAULT_ID, EXTENSION_PERIOD))
          .to.emit(fvkry, "LockPeriodExtended")
          .withArgs(hre.ethers.ZeroAddress, VAULT_ID, EXTENSION_PERIOD, TITLE, anyValue);
  
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].lockEndTime).to.be.approximately(
          await time.latest() + EXTENSION_PERIOD,
          2 // Allow for slight timestamp variations
        );
      });
  
      it("Should not allow extending lock period before expiry", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, INITIAL_LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await expect(fvkry.extendLockPeriod(0, VAULT_ID, EXTENSION_PERIOD))
          .to.be.revertedWith("The lock period has not yet expired!");
      });
    });
    
  });