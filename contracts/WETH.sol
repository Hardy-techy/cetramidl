// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockWETH
 * @dev Mock Wrapped ETH token for testing on Push Chain
 * WETH has 18 decimals
 */
contract WETH is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {
        // Mint 10,000 WETH (with 18 decimals)
        _mint(msg.sender, 10_000 * 10**18);
    }

    /**
     * @dev Mint function for faucet/testing
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function - gives 10 WETH to caller
     */
    function faucet() public {
        _mint(msg.sender, 10 * 10**18); // 10 WETH
    }

    /**
     * @dev Deposit function - wrap ETH to WETH
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw function - unwrap WETH to ETH
     */
    function withdraw(uint256 amount) public {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    receive() external payable {
        deposit();
    }
}

