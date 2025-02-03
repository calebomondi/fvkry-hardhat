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
  /*  
    describe("ETH Locking", function () {
      const VAULT_ID = 1;
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

      it("Should fail to lock ETH if vault ID is invalid", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        await expect(fvkry.lockETH(0, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT }))
          .to.be.revertedWithCustomError(fvkry, "InvalidVaultNumber");
      });

      it("Should fail to lock ETH if number of sub-vaults is exceeded", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        //first lock
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        //try to lock again
        await expect(fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT }))
          .to.be.revertedWithCustomError(fvkry, "VaultIsFull");
      });
  
      it("Should fail to lock 0 ETH", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        await expect(fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: 0 }))
          .to.be.revertedWithCustomError(fvkry, "AmountBeGreaterThan0");
      });

      it("Should fail to lock ETH if lock period is 0", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        await expect(fvkry.lockETH(VAULT_ID, 0, TITLE, { value: LOCK_AMOUNT }))
          .to.be.revertedWithCustomError(fvkry, "InvalidLockPeriod");
      });

      it("Should fail to lock ETH if contract is paused", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        await fvkry.pauseContract();
        await expect(fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT }))
          .to.be.revertedWithCustomError(fvkry, "ContractPausedAlready");
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

      it("Should fail to add ETH if asset ID is invalid", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);

        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        await expect(fvkry.addToLockedETH(VAULT_ID, 2, { value: LOCK_AMOUNT }))
          .to.be.revertedWithCustomError(fvkry, "InvalidAssetID");
      });

      it ("Should fail to add to ETH if lock period expired", async function() {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //first lock
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        // Add more ETH to vault, emit event and get the timestamp
        await time.increase(LOCK_PERIOD + 1);
        const additionalAmount = hre.ethers.parseEther("0.5");
        
        await expect(fvkry.addToLockedETH(VAULT_ID, 0, { value: additionalAmount }))
          .to.be.revertedWithCustomError(fvkry, "LockPeriodExpired");
      });
    });
 
    describe("Token Locking", function () {
      const VAULT_ID = 1;
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

      it("Should fail to lock tokens if vault ID is invalid", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await expect(fvkry.lockToken(mockToken.target, LOCK_AMOUNT, 0, LOCK_PERIOD, TITLE))
          .to.be.revertedWithCustomError(fvkry, "InvalidVaultNumber");
      });

      it("Should failed to add token if token address is Zero", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await expect(fvkry.lockToken(hre.ethers.ZeroAddress, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE))
          .to.be.revertedWithCustomError(fvkry, "InvalidTokenAddress")
          .withArgs(hre.ethers.ZeroAddress);
      });

      it("Should fail to add 0 tokens amount to lock", async function() {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);

        await expect(fvkry.lockToken(mockToken.target,0,VAULT_ID,LOCK_PERIOD,TITLE))
          .to.be.revertedWithCustomError(fvkry,"AmountBeGreaterThan0");

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

      it("Should fail to add new subvaults if number of sub-vaults is exceeded", async function () { //for tests we made number of MAX_SUB_VAULTS to 1
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);

        //approve tokens
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);

        //lock 1st tokens
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);

        //lock 2nd tokens
        await expect(fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE))
          .to.be.revertedWithCustomError(fvkry, "VaultIsFull");
      });

      it("Should fail to lock tokens if token is blacklisted", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        //blacklist token
        await fvkry.blackListToken(mockToken.target);
        
        await expect(fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE))
          .to.be.revertedWithCustomError(fvkry, "TokenIsBlackListed")
          .withArgs(mockToken.target);
      }); 

      it("Should fail to add tokens if token is blacklisted", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        //lock tokens
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);

        //blacklist token
        await fvkry.blackListToken(mockToken.target);
        
        await expect(fvkry.addToLockedTokens(mockToken.target, 0, LOCK_AMOUNT, VAULT_ID))
          .to.be.revertedWithCustomError(fvkry, "TokenIsBlackListed")
          .withArgs(mockToken.target);
      });

      it("Should fail to add token if lock expired", async function() {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        //lock tokens
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);

        //extend 
        await time.increase(LOCK_PERIOD + 1);

        await expect(fvkry.addToLockedTokens(mockToken.target, 0, LOCK_AMOUNT, VAULT_ID))
          .to.be.revertedWithCustomError(fvkry, "LockPeriodExpired");
      })
      
      it("Should fail to add Token if asset ID is invalid", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);

        //lock tokens
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);

        await expect(fvkry.addToLockedTokens(mockToken.target, 2, LOCK_AMOUNT, VAULT_ID))
          .to.be.revertedWithCustomError(fvkry, "InvalidAssetID");

      });
    });
   
    describe("Asset Withdrawal", function () {
      const VAULT_ID = 1;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("1");
      const TITLE = "Test Lock";
  
      it("Should not allow withdrawal if Vault ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        await expect(fvkry.withdrawAsset(0, 0, LOCK_AMOUNT, false))
          .to.be.revertedWithCustomError(fvkry, "InvalidVaultNumber");
      })

      it("Should not allow withdrawal if Asset ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        await expect(fvkry.withdrawAsset(1, VAULT_ID, LOCK_AMOUNT, false))
          .to.be.revertedWithCustomError(fvkry, "InvalidAssetID");
      })

      it("Should not allow withdrawal before lock period ends", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await expect(fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT, false))
          .to.be.revertedWithCustomError(fvkry, "LockPeriodNotExpiredAndGoalNotReached");
      });
  
      it("Should allow withdrawal after lock period ends", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        // Increase time to after lock period
        await time.increase(LOCK_PERIOD + 1);
  
        await expect(fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT, false))
          .to.emit(fvkry, "AssetWithdrawn")
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
        await fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT, true);
  
        // Check that the ETH was transferred
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].withdrawn).to.be.true;
      });
  
      it("Should allow partial withdrawals", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await time.increase(LOCK_PERIOD + 1);
  
        const partialAmount = LOCK_AMOUNT / 2n;
        await fvkry.withdrawAsset(0, VAULT_ID, partialAmount, false);
  
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks[0].amount).to.equal(partialAmount);
        expect(locks[0].withdrawn).to.be.false;
      });

      it("Should not allow withdrawal if amount exceeds sub-vault balance", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await time.increase(LOCK_PERIOD + 1);
  
        await expect(fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT + 1n, false))
          .to.be.revertedWithCustomError(fvkry, "NotEnoughToWithdraw")
          .withArgs("0x0000000000000000000000000000000000000000");
      });

      it("Should not allow withdrawal if sub-vault is already withdrawn", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await time.increase(LOCK_PERIOD + 1);
  
        //withdraw all eth
        await fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT, false);
  
        //try to withdraw again
        await expect(fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT, false))
          .to.be.revertedWithCustomError(fvkry, "VaultHasBeenFullyWithdrawn");
      });
    });
    
    describe("Lock Period Extension", function () {
      const VAULT_ID = 1;
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
          .to.be.revertedWithCustomError(fvkry, "LockPeriodNotExpired");
      });

      it("Should not allow extending if Asset ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        await fvkry.lockETH(VAULT_ID, INITIAL_LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        await time.increase(INITIAL_LOCK_PERIOD + 1)

        await expect(fvkry.extendLockPeriod(1, VAULT_ID, EXTENSION_PERIOD))
          .to.be.revertedWithCustomError(fvkry, "InvalidAssetID");
      })

      it("Should not allow extending lock period by zero", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        await fvkry.lockETH(VAULT_ID, INITIAL_LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        await expect(fvkry.extendLockPeriod(0, VAULT_ID, 0))
          .to.be.revertedWithCustomError(fvkry, "InvalidLockPeriod");
      });
    });
     
    describe("Contract Pausing", function () {
      it("Should allow owner to pause contract", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        
        await fvkry.pauseContract();
        expect(await fvkry.paused()).to.be.true;
      });

      it("Should allow owner to unpause contract", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        
        await fvkry.pauseContract();
        expect(await fvkry.paused()).to.be.true;
  
        await fvkry.unPauseContract();
        expect(await fvkry.paused()).to.be.false;
      });

      it("Should give error if paused contract is to be paused again", async function () {
        const { fvkry, otherAccount } = await loadFixture(deployFvkryFixture);

        await fvkry.pauseContract();
        
        await expect(fvkry.pauseContract())
          .to.be.revertedWithCustomError(fvkry, "ContractPausedAlready");
      });

      it("Should give error if unpaused contract is to be unpaused again", async function () {
        const { fvkry, otherAccount } = await loadFixture(deployFvkryFixture);

        await fvkry.pauseContract();

        await fvkry.unPauseContract();
        
        await expect(fvkry.unPauseContract())
          .to.be.revertedWithCustomError(fvkry, "ContractNotpaused");
      });
    });
    
    describe("Token Blacklisting", function () {
      it("Should allow owner to blacklist token", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        
        //blacklist token
        const { mockToken } = await deployFvkryFixture();
        await fvkry.blackListToken(mockToken.target);
        expect(await fvkry.blackListedToken(mockToken.target)).to.be.true;
      });

      it("Should allow owner to remove token from blacklist", async function () {
        const { fvkry, owner } = await loadFixture(deployFvkryFixture);
        
        //blacklist token
        const { mockToken } = await deployFvkryFixture();
        await fvkry.blackListToken(mockToken.target);
        expect(await fvkry.blackListedToken(mockToken.target)).to.be.true;
  
        //remove token from blacklist
        await fvkry.unBlackListToken(mockToken.target);
        expect(await fvkry.blackListedToken(mockToken.target)).to.be.false;
      });

      it("Should give error if blacklisted token is to be blacklisted again", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        await fvkry.blackListToken(mockToken.target);

        await expect(fvkry.blackListToken(mockToken.target))
          .to.be.revertedWithCustomError(fvkry, "TokenIsBlackListed")
          .withArgs(mockToken.target);
      });

      it("Should give error if unblacklisted token is to be unblacklisted again", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);

        await expect(fvkry.unBlackListToken(mockToken.target))
          .to.be.revertedWithCustomError(fvkry, "TokenIsNotBlackListed")
          .withArgs(mockToken.target);
      });
    });
    
    describe("Sub-Vault Deletion", function () {
      const VAULT_ID = 1;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("100");
      const TITLE = "My Token Lock";

      it("Should allow deletion of sub-vaults if fully withdrawn", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        //withdraw
        await time.increase(LOCK_PERIOD + 1);
        await fvkry.withdrawAsset(0, VAULT_ID, LOCK_AMOUNT, false);
        
        // Check that the sub-vault exists and is fully withdrawn
        const locks = await fvkry.getUserLocks(VAULT_ID);
        expect(locks).to.have.lengthOf(1);
        expect(locks[0].withdrawn).to.be.true;

        //delete sub-vault
        await expect(fvkry.deleteSubVault(VAULT_ID,0))
          .to.emit(fvkry, "VaultDeleted")
          .withArgs(VAULT_ID, 0, anyValue);
        
        expect(await fvkry.getUserLocks(1)).to.be.empty;
      });

      it("Should not allow deletion of sub-vaults if not fully withdrawn", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        await time.increase(LOCK_PERIOD + 1);

        //try to delete sub-vault
        await expect(fvkry.deleteSubVault(VAULT_ID,0))
          .to.be.revertedWithCustomError(fvkry, "VaultHasNotBeenFullyWithdrawn");
      });

      it("Should not allow deletion of sub-vaults if lock period has not expired", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });

        //try to delete sub-vault
        await expect(fvkry.deleteSubVault(VAULT_ID,0))
          .to.be.revertedWithCustomError(fvkry, "LockPeriodNotExpired");
      });

      it("Should not allow deletion if Vault ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        await expect(fvkry.deleteSubVault(0,0))
          .to.be.revertedWithCustomError(fvkry, "InvalidVaultNumber");
      })

    });
    
    describe("Rename SubVault", function() {
      const VAULT_ID = 1;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("100");
      const TITLE = "My Token Lock";
      const NEW_TITLE = "Renamed Token Lock";

      it("Should allow renaming of a sub-vault", async function () {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        //lock ETH
        await fvkry.lockETH(VAULT_ID,LOCK_PERIOD,TITLE,{value: LOCK_AMOUNT});

        //rename
        await expect(fvkry.renameSubVault(VAULT_ID,0,NEW_TITLE))
          .to.emit(fvkry,"RenameVault")
          .withArgs(NEW_TITLE,0,VAULT_ID);
        
        //subvault
        const lock = await fvkry.getUserLocks(VAULT_ID);
        expect(lock[0].title).to.be.equal(NEW_TITLE);
      });

      it("Should fail to rename if Vault ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        await expect(fvkry.renameSubVault(0,0,NEW_TITLE))
          .to.be.revertedWithCustomError(fvkry, "InvalidVaultNumber");
      })

      it("Should fail to rename if asset ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        //lock ETH
        await fvkry.lockETH(VAULT_ID,LOCK_PERIOD,TITLE,{value: LOCK_AMOUNT});

        await expect(fvkry.renameSubVault(VAULT_ID,1,NEW_TITLE))
          .to.be.revertedWithCustomError(fvkry, "InvalidAssetID");
      })
    });
    
    describe("Transfer Assets", function() {
      const LOCK_PERIOD1 = 365 * 24 * 60 * 60; // 1 year
      const LOCK_PERIOD2 = 10 * 24 * 60 * 60; 
      const LOCK_AMOUNT = hre.ethers.parseEther("100");

      it("Should allow asset transfer between sub-vaults of same address", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
      
        // Sub vault1
        await fvkry.lockETH(1, LOCK_PERIOD1, "Asset 0", { value: LOCK_AMOUNT });
      
        // Sub vault2
        await fvkry.lockETH(2, LOCK_PERIOD2, "Asset 1", { value: LOCK_AMOUNT });
      
        await time.increase(LOCK_PERIOD2 + 1);
      
        // Verify initial balances
        let lock1 = await fvkry.getUserLocks(1);
        let lock2 = await fvkry.getUserLocks(2);
        expect(lock1[0].amount).to.be.equal(LOCK_AMOUNT);
        expect(lock2[0].amount).to.be.equal(LOCK_AMOUNT);
      
        // Transfer
        await expect(fvkry.transferAsset(LOCK_AMOUNT, 2, 0, 1, 0))
          .to.emit(fvkry, "TransferAsset")
          .withArgs(lock1[0].token, LOCK_AMOUNT, 2, 0, 1, 0);
      
        // Verify balances after transfer
        lock1 = await fvkry.getUserLocks(1);
        lock2 = await fvkry.getUserLocks(2);
        expect(lock1[0].amount).to.be.equal(LOCK_AMOUNT * 2n);
        expect(lock2[0].amount).to.be.equal(0);
      });

      it("Should not allow asset transfer between vaults holding different assets", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);

        //lock eth
        await fvkry.lockETH(1, LOCK_PERIOD1, "ETH Lock", {value: LOCK_AMOUNT});

        //lock Token
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, 2, LOCK_PERIOD2, "Token Lock");

        //transfer
        await time.increase(LOCK_PERIOD2 + 1);

        const lock1 = await fvkry.getUserLocks(1);
        const lock2 = await fvkry.getUserLocks(2);

        await expect(fvkry.transferAsset(LOCK_AMOUNT,2,0,1,0))
          .to.be.revertedWithCustomError(fvkry,"TokenAddressesDontMatch")
          .withArgs(lock2[0].token, lock1[0].token);

      });

      it("Should not allow asset transfer if TO SUB-VAULT lock period is not expired", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
      
        // Sub vault1
        await fvkry.lockETH(1, LOCK_PERIOD1, "Asset 0", { value: LOCK_AMOUNT });
      
        // Sub vault2
        await fvkry.lockETH(2, LOCK_PERIOD2, "Asset 1", { value: LOCK_AMOUNT });

        // transfer
        await time.increase(LOCK_PERIOD1 + 1);
        await expect(fvkry.transferAsset(LOCK_AMOUNT, 2, 0, 1, 0))
          .to.be.revertedWithCustomError(fvkry, "ToSubVaultLockPeriodExpired");
      });

      it("Should not allow transfer FROM SUB-VAULT if amount is greater than balance", async function() {
        const { fvkry } = await loadFixture(deployFvkryFixture);
      
        // Sub vault1
        await fvkry.lockETH(1, LOCK_PERIOD1, "Asset 0", { value: LOCK_AMOUNT });
      
        // Sub vault2
        await fvkry.lockETH(2, LOCK_PERIOD2, "Asset 1", { value: LOCK_AMOUNT });
      
        // transfer
        await time.increase(LOCK_PERIOD2 + 1);

        const lock = await fvkry.getUserLocks(1);

        await expect(fvkry.transferAsset(LOCK_AMOUNT + 1n, 2, 0, 1, 0))
          .to.be.revertedWithCustomError(fvkry, "NotEnoughToWithdraw")
          .withArgs(lock[0].token);

      });

      it("Should fail to transfer asset if Vault ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        await expect(fvkry.transferAsset(LOCK_AMOUNT + 1n, 0, 0, 1, 0))
          .to.be.revertedWithCustomError(fvkry, "InvalidVaultNumber");
      })

      it("Should fail to transfer asset if asset ID is invalid", async function() {
        const {fvkry} = await loadFixture(deployFvkryFixture);

        // Sub vault1
        await fvkry.lockETH(1, LOCK_PERIOD1, "Asset 0", { value: LOCK_AMOUNT });
      
        // Sub vault2
        await fvkry.lockETH(2, LOCK_PERIOD2, "Asset 1", { value: LOCK_AMOUNT });


        // transfer
        await time.increase(LOCK_PERIOD2 + 1);

        await expect(fvkry.transferAsset(LOCK_AMOUNT, 2, 0, 1, 1))
          .to.be.revertedWithCustomError(fvkry, "InvalidAssetID");
      })
    });
    
    describe("Get Contract Balances", function () {
      const VAULT_ID = 1;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("100");
      const TITLE = "My Token Lock";

      it("Should get contract ETH balance", async function () {
        const { fvkry } = await loadFixture(deployFvkryFixture);
        
        //lock eth
        await fvkry.lockETH(VAULT_ID, LOCK_PERIOD, TITLE, { value: LOCK_AMOUNT });
        
        expect(await fvkry.getContractETHBalance()).to.equal(LOCK_AMOUNT);
      });

      it("Should get contract token balance", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
        
        //lock tokens
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);
        
        expect(await fvkry.getContractTokenBalance(mockToken.target)).to.equal(LOCK_AMOUNT);
      });
    });
    */
    describe("Record Transaction", function () {
      const VAULT_ID = 1;
      const LOCK_PERIOD = 365 * 24 * 60 * 60; // 1 year
      const LOCK_AMOUNT = hre.ethers.parseEther("1");
      const TITLE = "My ETH Lock";

      it("Should record transaction of lock successful tokens", async function () {
        const { fvkry, mockToken } = await loadFixture(deployFvkryFixture);
  
        // Approve tokens first
        await mockToken.approve(fvkry.target, LOCK_AMOUNT);
  
        //execute transaction
        await fvkry.lockToken(mockToken.target, LOCK_AMOUNT, VAULT_ID, LOCK_PERIOD, TITLE);

        //verify record
        const records = await fvkry.getUserTransactions(VAULT_ID);

        expect(records[0].title).to.be.equal(TITLE);
        expect(records[0].token).to.be.equal(mockToken.target);
      });
    })
    
  });