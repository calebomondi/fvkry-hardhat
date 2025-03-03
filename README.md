# FVKRY PRVNTA Smart Contract Documentation

![Image](https://github.com/user-attachments/assets/401154ff-2157-48b1-ba00-b31717a689e6)

## Overview
FVKRY PRVNTA is a financial discipline tool designed to help virtual asset owners manage impulsive spending and trading by locking assets (ETH and ERC-20 tokens) for set durations. Users can create multiple sub-vaults within the defined main vaults to manage their locked assets securely. By implementing strategic asset locking mechanisms, the protocol provides structure in volatile markets, countering cognitive biases and promoting long-term financial stability.

## Features
- Lock ETH and ERC-20 tokens for a specified duration.
- Extend lock periods after expiration (up to 5 years).
- Add more assets to an existing locked vault.
- Withdraw assets upon lock period expiration.
- Partial and full withdrawal options
- Transfer assets between vaults and sub-vaults.
- Blacklist certain tokens (admin-only feature).
- Pause and unpause the contract (admin-only feature).

## Smart Contract Details
- **Solidity Version**: ^0.8.28
- **Frameworks & Libraries**: OpenZeppelin Contracts (IERC20, SafeERC20, ReentrancyGuard, Ownable)
- **Security Features**:
  - Prevents reentrancy attacks.
  - Uses SafeERC20 for secure token transactions.
  - Implements access control for admin-only functions such as contract pausing.

## Deployment
### Prerequisites
Ensure you have the following installed:
- Node.js
- Hardhat
- Metamask (for interacting with the contract)
- Infura or Alchemy RPC URL and API endpoints

### Steps
1. Clone the repository:
   ```sh
   git clone https://github.com/calebomondi/fvkry-hardhat.git
   cd fvkry-prvnta
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Compile the contract:
   ```sh
   npx hardhat compile
   ```
4. Deploy the contract:
   ```sh
   npx hardhat run scripts/deploy.js --network <network>
   ```

## Main Functions
1. `lockETH()`: Lock native ETH with custom duration
2. `lockToken()`: Lock ERC20 tokens
3. `addToLockedETH()`: Add more ETH to existing lock
4. `addToLockedTokens()`: Add more tokens to existing lock
5. `withdrawAsset()`: Withdraw locked assets
6. `extendLockPeriod()`: Extend lock duration post-expiry
7. `transferAsset()`: Transfer assets between vaults

## Usage
### Locking ETH
```solidity
lockETH(uint8 _vault, uint32 _lockperiod, string memory _title)
```
- `_vault`: Vault ID (1-4)
- `_lockperiod`: Lock duration (max 1096 days)
- `_title`: Description of the lock

### Locking ERC-20 Tokens
```solidity
lockToken(IERC20 _token, uint256 _amount, uint8 _vault, uint256 _lockperiod, string memory _title)
```
- `_token`: Address of ERC-20 token
- `_amount`: Amount to lock
- `_vault`: Vault ID (1-4)
- `_lockperiod`: Lock duration
- `_title`: Description of the lock

### Adding More Assets to Locked Vaults
```solidity
addToLockedETH(uint8 _vault, uint32 _assetID)
```
```solidity
addToLockedTokens(IERC20 _token, uint32 _assetID, uint256 _amount, uint8 _vault)
```

### Withdrawing Assets
```solidity
withdrawAsset(uint32 _assetID, uint8 _vault, uint256 _amount, bool _goalReachedByValue)
```

### Extending Lock Period
```solidity
extendLockPeriod(uint32 _assetID, uint8 _vault, uint32 _lockperiod)
```

### Renaming Sub-Vault
```solidity
renameSubVault(uint8 _vault, uint8 _assetID, string memory _newTitle)
```

### Transfering assets
```solidity
transferAsset( uint256 _amount, uint8 _fromVault, uint8 _fromAssetID, uint8 _toVault, uint8 _toAssetID)
```

### Delete Sub-Vault
```solidity
deleteSubVault( uint8 _vault, uint8 _assetID)
```

### Admin Functions
- **Pause Contract**: `pauseContract()`
- **Unpause Contract**: `unPauseContract()`
- **Blacklist Token**: `blackListToken(IERC20 _token)`
- **Unblacklist Token**: `unBlackListToken(IERC20 _token)`

## Events
- `AssetLocked` – Emitted when assets are locked.
- `AssetWithdrawn` – Emitted when assets are withdrawn.
- `LockPeriodExtended` – Emitted when a lock period is extended.
- `ContractPaused` – Emitted when the contract is paused.
- `BlackListed` – Emitted when a token is blacklisted.
- `VaultDeleted` – Emitted when a vault is deleted.

## Testing 
The contract includes comprehensive test coverage:

- Deployment tests
- ETH & Token locking mechanisms
- Withdrawal scenarios
- Lock period extensions
- Asset transfers
- Contract pausing
- Token blacklisting

To run test
```sh
npx hardhat test
```

To run test coverage
```sh
npx hardhat coverage
```

```bash
---------------------|----------|----------|----------|----------|----------------|
File                 |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
---------------------|----------|----------|----------|----------|----------------|
 contracts\          |      100 |    76.32 |      100 |    99.07 |                |
  Fvkry.sol          |      100 |    76.32 |      100 |    99.07 |            352 |
 contracts\test\     |      100 |      100 |      100 |      100 |                |
  MockERC20Token.sol |      100 |      100 |      100 |      100 |                |
---------------------|----------|----------|----------|----------|----------------|
All files            |      100 |    76.32 |      100 |    99.07 |                |
---------------------|----------|----------|----------|----------|----------------|
```

### Custom Test Tokens
- For testing the ERC20 token locking mechanism of the platform, we created five mock tokens
[MAN](https://sepolia-blockscout.lisk.com/address/0x37D32Edc11F8Ed47fB4f4A9FBBA707D6047B7CDf#code)
[AFRIK](https://sepolia-blockscout.lisk.com/address/0x07c168461806066991599E5293FaAcA4131Dc77C#code)
[MEG](https://sepolia-blockscout.lisk.com/address/0x6194362cC21d498aAFEBD3A9F90838956358a816#code)
[LRT](https://sepolia-blockscout.lisk.com/address/0x731076647a0CCE3Ee55e2B60CA3d779658De4D2b#code)
[KIND](https://sepolia-blockscout.lisk.com/address/0xA741dB5baeaD1de83F83e63Faff98c140dE570c7#code)

## Security Considerations
- Users should verify the lock period before locking assets.
- Blacklisted tokens cannot be locked or added to a vault.
- The contract owner has admin privileges but cannot access users’ funds.

## License
This project is licensed under the MIT License.

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit changes
4. Push to branch
5. Create pull request

## Verified and Published in Sepolia Blockscout
Successfully verified FVKRY PRVNTA contract on the block explorer.
[View On Sepolia Blockscout](https://sepolia-blockscout.lisk.com/address/0x16e05EA02BBB69D50c858DCeCC707CA81657D8fa#code)