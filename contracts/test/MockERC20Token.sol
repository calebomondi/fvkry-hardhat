// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20Token is ERC20, Ownable {
    constructor() ERC20("Humanade", "MAN") Ownable(msg.sender) {
        // Mint the initial supply to the contract deployer
        _mint(msg.sender, 1e21);
    }

    // Mint tokens to an address
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    // Burn tokens from an address
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
    
    // Function that mints and then immediately burns the same amount
    function mintAndBurn(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        _burn(to, amount);
    }
}