// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error VaultIsFull();
error AmountBeGreaterThan0();
error InvalidAssetID();
error LockPeriodExpired();
error LockPeriodNotExpired();
error LockPeriodNotExpiredAndGoalNotReached();       
error InvalidTokenAddress(address token);
error TokenIsBlackListed(address token);
error TokenIsNotBlackListed(address token);
error InadequateTokenBalance(address token);
error VaultHasBeenFullyWithdrawn();
error VaultHasNotBeenFullyWithdrawn();
error NotEnoughToWithdraw(address asset);
error ETHTransferFailed();
error InvalidLockPeriod();
error InvalidVaultNumber();
error ContractPausedAlready();
error ContractNotpaused();
error TokenAddressesDontMatch(address from, address to);
error ToSubVaultLockPeriodExpired();

contract Fvkry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    //constants
    uint256 immutable public  MAX_LOCKDURATION = 1825 * 24 * 60 * 60;
    uint8 immutable public  MAX_VAULTS = 5;
    uint8 immutable public  MAX_SUB_VAULTS = 100;

    //structs
    struct Lock {
        address token;
        uint256 amount;
        uint32 lockEndTime;
        string title;
        bool withdrawn;
        bool isNative;
    }

    struct TransacHist {
        address token;
        uint256 amount;
        string title;
        bool withdrawn;
        uint32 timestamp;
    }

    //Events
    event AssetLocked(address indexed token, uint256 amount, string title, uint8 vault,uint32 lockEndTime, uint32 timestamp);
    event AssetWithdrawn(address indexed  token, uint256 amount, string title, uint8 vault, uint32 timestamp);
    event AssetAdded(address indexed token, uint256 amount, string title, uint8 vault, uint32 timestamp);
    event LockPeriodExtended(address indexed  token, uint8 vault, uint32 lockperiod, string title, uint32 timestamp);
    //---
    event ContractPaused(uint32 timestamp);
    event ContractUnpaused(uint32 timestamp);
    event BlackListed(address indexed  token);
    event UnBlackListed(address indexed token);
    //---
    event VaultDeleted(uint8 vault, uint8 assetID, uint32 timestamp);
    event RenameVault(string newtitle, uint8 assetID, uint8 vault);
    event TransferAsset(address indexed token, uint256 amount, uint8 fromVault, uint8 fromAssetID, uint8 toVault, uint8 toAssetID);

    //state variables
    bool public paused;

    //mappings
    mapping (address => mapping (uint8 => Lock[])) public userLockedAssets;
    mapping (address => mapping (uint8 => TransacHist[])) public userTransactions;
    mapping (address => bool) public blackListedToken;

    constructor() Ownable(msg.sender) {
        paused = false;
    }

    //modifiers
    modifier validLockPeriod(uint256 _lockperiod) {
        if(_lockperiod == 0 || _lockperiod > MAX_LOCKDURATION) revert InvalidLockPeriod();
        _;
    }

    modifier validVault(uint8 _vault) {
        if(_vault <= 0 || _vault > 4) revert InvalidVaultNumber();
        _;
    }

    modifier contractNotPaused() {
        if(paused) revert ContractPausedAlready();
        _;
    }

    //Lock ETH
    function lockETH(
        uint8 _vault, 
        uint32 _lockperiod, 
        string memory _title
    ) external payable nonReentrant contractNotPaused validVault(_vault) validLockPeriod(_lockperiod) {
        uint256 num_of_locks = userLockedAssets[msg.sender][_vault].length;
        if(num_of_locks >= MAX_SUB_VAULTS) revert VaultIsFull();
        if(msg.value <= 0) revert AmountBeGreaterThan0();

        // Create lock entry for ETH
        userLockedAssets[msg.sender][_vault].push(Lock({
            token: address(0), 
            amount: msg.value,  
            lockEndTime: uint32(block.timestamp + _lockperiod),
            title: _title,    
            withdrawn: false,   
            isNative: true
        }));     

        //record transaction
        recordTransac(address(0), _vault, msg.value, _title, false);
        
        emit AssetLocked(address(0), msg.value, _title, _vault, uint32(block.timestamp + _lockperiod), uint32(block.timestamp));
    }

    function addToLockedETH(
        uint8 _vault, 
        uint32 _assetID) 
    external payable  nonReentrant contractNotPaused validVault(_vault) {
        if(msg.value <= 0) revert AmountBeGreaterThan0();
        if(_assetID >= userLockedAssets[msg.sender][_vault].length) revert InvalidAssetID();

        Lock storage lock = userLockedAssets[msg.sender][_vault][_assetID];

        if(lock.lockEndTime < block.timestamp) revert LockPeriodExpired();

        //get current balance and add to it
        userLockedAssets[msg.sender][_vault][_assetID].amount += msg.value;

        //record transaction
        recordTransac(address(0), _vault, msg.value, lock.title, false);

        emit AssetAdded(address(0), msg.value, lock.title, _vault, uint32(block.timestamp));
    }

    //Lock ERC20 Tokens
    function lockToken (
        IERC20 _token, 
        uint256 _amount, 
        uint8 _vault, 
        uint256 _lockperiod, 
        string memory _title
    ) external nonReentrant contractNotPaused validVault(_vault) validLockPeriod(_lockperiod) {
        uint256 num_of_locks = userLockedAssets[msg.sender][_vault].length;
        if(num_of_locks >= MAX_SUB_VAULTS) revert VaultIsFull();
        if(address(_token) == address(0)) revert InvalidTokenAddress(address(_token));
        if(blackListedToken[address(_token)]) revert TokenIsBlackListed(address(_token));
        if(_amount <= 0) revert AmountBeGreaterThan0();

        //check balance
        uint256 _tokenBalance = _token.balanceOf(msg.sender);
        if(_amount > _tokenBalance) revert InadequateTokenBalance(address(_token));

        // Transfer tokens from user to contract
        _token.safeTransferFrom(msg.sender, address(this), _amount);

        // Create lock entry for Tokens 
        userLockedAssets[msg.sender][_vault].push(Lock({
            token: address(_token), 
            amount: _amount,  
            lockEndTime: uint32(block.timestamp + _lockperiod),
            title: _title,    
            withdrawn: false,   
            isNative: false
        }));

        //record transaction
        recordTransac(address(_token), _vault, _amount, _title, false);

        emit AssetLocked(address(_token), _amount, _title, _vault, uint32(block.timestamp + _lockperiod), uint32(block.timestamp));
    }

    function addToLockedTokens(
        IERC20 _token, 
        uint32 _assetID, 
        uint256 _amount, 
        uint8 _vault
    ) external  nonReentrant contractNotPaused validVault(_vault) {
        if(address(_token) == address(0)) revert InvalidTokenAddress(address(_token));
        if(blackListedToken[address(_token)]) revert TokenIsBlackListed(address(_token));
        if(_amount <= 0) revert AmountBeGreaterThan0();
        if(_assetID >= userLockedAssets[msg.sender][_vault].length) revert InvalidAssetID();

        Lock storage lock = userLockedAssets[msg.sender][_vault][_assetID];
        
        if(lock.lockEndTime < block.timestamp) revert LockPeriodExpired();

        //check balance
        uint256 _tokenBalance = _token.balanceOf(msg.sender);
        if(_amount > _tokenBalance) revert InadequateTokenBalance(address(_token));

        //add to vault
        _token.safeTransferFrom(msg.sender, address(this), _amount);

        //update locked tokens balance
        userLockedAssets[msg.sender][_vault][_assetID].amount += _amount;

        //record transaction
        recordTransac(address(_token), _vault, _amount, lock.title, false);
        
        emit AssetAdded(address(_token), _amount, lock.title, _vault, uint32(block.timestamp));
    }

    //Withdraw Assets
    function withdrawAsset( 
        uint32 _assetID,
        uint8 _vault, 
        uint256 _amount, 
        bool _goalReachedByValue
    ) external  nonReentrant validVault(_vault) {
        if(_assetID >= userLockedAssets[msg.sender][_vault].length) revert InvalidAssetID();
        
        Lock storage lock = userLockedAssets[msg.sender][_vault][_assetID];

        if(lock.withdrawn) revert VaultHasBeenFullyWithdrawn();
        if(_amount > lock.amount) revert NotEnoughToWithdraw(address(lock.token));
        if(block.timestamp < lock.lockEndTime && _goalReachedByValue != true) revert LockPeriodNotExpiredAndGoalNotReached();

        uint256  updateBalance = lock.amount - _amount;

        //mark as withdrawn
        if(updateBalance == 0) {
            userLockedAssets[msg.sender][_vault][_assetID].withdrawn = true;
        } 

        //update balance  
        userLockedAssets[msg.sender][_vault][_assetID].amount = updateBalance;    

        if(lock.isNative) {
            // Transfer ETH
            (bool success, ) = msg.sender.call{value: _amount}("");
            if(!success) revert ETHTransferFailed();

            recordTransac(address(0), _vault, _amount, lock.title, true);
        } else {
            // Transfer ERC20 tokens
            IERC20(lock.token).safeTransfer(msg.sender, _amount);

            recordTransac(address(lock.token), _vault, _amount, lock.title, true);
        }

        emit AssetWithdrawn(address(lock.token), _amount , lock.title, _vault, uint32(block.timestamp));
    }

    //record transaction
    function recordTransac(
        address _token, 
        uint8 _vault, 
        uint256 _amount, 
        string memory _title, 
        bool _withdraw
    ) internal {
        userTransactions[msg.sender][_vault].push(TransacHist({ 
            token: _token,     
            amount: _amount,  
            title: _title,    
            withdrawn: _withdraw,   
            timestamp: uint32(block.timestamp)   
        }));
    }

    //view contract locked assets
    function getContractTokenBalance(IERC20 token) external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getContractETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    //Get User Locked Assets
    function getUserLocks(uint8 _vault) public view returns (Lock[] memory) {
        if(_vault < 0 || _vault > 4) revert InvalidVaultNumber();
        return userLockedAssets[msg.sender][_vault];
    }

    //Get user transactions
    function getUserTransactions(uint8 _vault) public view returns (TransacHist[] memory) {
        if(_vault < 0 || _vault > 4) revert InvalidVaultNumber();
        return userTransactions[msg.sender][_vault];
    }

    //extend lock period after expiry
    function extendLockPeriod(
        uint32 _assetID, 
        uint8 _vault, 
        uint32 _lockperiod
    ) external validLockPeriod(_lockperiod) {
        if(_assetID >= userLockedAssets[msg.sender][_vault].length) revert InvalidAssetID();

        Lock storage lock = userLockedAssets[msg.sender][_vault][_assetID];

        if(lock.lockEndTime > block.timestamp) revert LockPeriodNotExpired();
        
        userLockedAssets[msg.sender][_vault][_assetID].lockEndTime = uint32(block.timestamp + _lockperiod);

        emit LockPeriodExtended(lock.token, _vault, _lockperiod, lock.title, uint32(block.timestamp));
    }

    //emergencies executed by admin
    function pauseContract() external onlyOwner {
        if(paused) revert ContractPausedAlready();
        paused = true;
        emit ContractPaused(uint32(block.timestamp));
    }

    function unPauseContract() external  onlyOwner {
        if(!paused) revert ContractNotpaused();
        paused = false;
        emit ContractUnpaused(uint32(block.timestamp));
    }

    function blackListToken(IERC20 _token) external  onlyOwner {
        if(blackListedToken[address(_token)]) revert TokenIsBlackListed(address(_token));
        blackListedToken[address(_token)] = true;
        emit BlackListed(address(_token));
    }

    function unBlackListToken(IERC20 _token) external onlyOwner  {
        if(!blackListedToken[address(_token)]) revert TokenIsNotBlackListed(address(_token));
        blackListedToken[address(_token)] = false;
        emit UnBlackListed(address(_token));
    }

    //delete vault
    function deleteSubVault(
        uint8 _vault, 
        uint8 _assetID
    ) external validVault(_vault)  {
        if(_assetID >= userLockedAssets[msg.sender][_vault].length) revert InvalidAssetID();

        Lock storage lock = userLockedAssets[msg.sender][_vault][_assetID];
        if(lock.lockEndTime > block.timestamp) revert LockPeriodNotExpired();
        if(!lock.withdrawn) revert VaultHasNotBeenFullyWithdrawn();

        //get last index
        uint256 lastIndex = userLockedAssets[msg.sender][_vault].length - 1;

        //swap if asset ID not last index
        if(_assetID != lastIndex) {
            userLockedAssets[msg.sender][_vault][_assetID] = userLockedAssets[msg.sender][_vault][lastIndex];
        } else {}

        //remove last element
        userLockedAssets[msg.sender][_vault].pop();

        emit VaultDeleted(_vault, _assetID, uint32(block.timestamp));
    }

    //rename vault
    function renameSubVault(
        uint8 _vault, 
        uint8 _assetID, 
        string memory _newTitle
    ) external validVault(_vault) {
        if(_assetID >= userLockedAssets[msg.sender][_vault].length) revert InvalidAssetID();

        //rename
        userLockedAssets[msg.sender][_vault][_assetID].title = _newTitle;

        emit  RenameVault(_newTitle, _assetID, _vault);
    }

    //transfer assets between vaults and sub-vaults
    function transferAsset(
        uint256 _amount, 
        uint8 _fromVault, 
        uint8 _fromAssetID, 
        uint8 _toVault, 
        uint8 _toAssetID
    ) external nonReentrant validVault(_fromVault) validVault(_toVault) {
        if(
            _fromAssetID >= userLockedAssets[msg.sender][_fromVault].length || 
            _toAssetID >= userLockedAssets[msg.sender][_toVault].length
        ) revert InvalidAssetID();

        Lock storage fLock = userLockedAssets[msg.sender][_fromVault][_fromAssetID];
        Lock storage tLock = userLockedAssets[msg.sender][_toVault][_toAssetID];

        if(address(fLock.token) != address(tLock.token)) revert TokenAddressesDontMatch(address(fLock.token),address(tLock.token));
        if( block.timestamp > tLock.lockEndTime ) revert ToSubVaultLockPeriodExpired();
        if(fLock.withdrawn) revert VaultHasBeenFullyWithdrawn();
        if(_amount > fLock.amount) revert NotEnoughToWithdraw(address(fLock.token));

        //transfer
        userLockedAssets[msg.sender][_fromVault][_fromAssetID].amount -= _amount;

        if (userLockedAssets[msg.sender][_fromVault][_fromAssetID].amount == 0) {
            userLockedAssets[msg.sender][_fromVault][_fromAssetID].withdrawn = true;
        }

        userLockedAssets[msg.sender][_toVault][_toAssetID].amount += _amount;

        emit TransferAsset(address(fLock.token),_amount,_fromVault,_fromAssetID,_toVault,_toAssetID);
    }

}