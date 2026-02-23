// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing on Push Chain
 * USDC has 6 decimals (not 18!)
 */
contract USDC is ERC20 {
    uint8 private _decimals = 18;

    constructor() ERC20("USD Coin", "USDC") {
        // Mint 10 million USDC (with 18 decimals)
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint function for faucet/testing
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function - gives 1000 USDC to caller
     */
    function faucet() public {
        _mint(msg.sender, 1000 * 10**18); // 1000 USDC
    }
}

