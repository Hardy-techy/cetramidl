// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimplePriceFeed
 * @dev Ultra-lightweight price feed for Push Chain
 * Removed string storage to save gas
 */
contract SimplePriceFeed is AggregatorV3Interface, Ownable {
    int256 private _price;
    uint8 private _decimals;
    uint80 private _roundId;
    
    event PriceUpdated(int256 newPrice, uint80 roundId, uint256 timestamp);
    
    constructor(
        int256 initialPrice,
        uint8 decimals_
    ) Ownable(msg.sender) {
        _price = initialPrice;
        _decimals = decimals_;
        _roundId = 1;
    }
    
    function updatePrice(int256 newPrice) external onlyOwner {
        _price = newPrice;
        _roundId++;
        emit PriceUpdated(newPrice, _roundId, block.timestamp);
    }
    
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, block.timestamp, block.timestamp, _roundId);
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external pure override returns (string memory) {
        return "SimplePriceFeed";
    }
    
    function version() external pure override returns (uint256) {
        return 1;
    }
    
    function getRoundData(uint80)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, block.timestamp, block.timestamp, _roundId);
    }
    
    function getPrice() external view returns (int256) {
        return _price;
    }
}

