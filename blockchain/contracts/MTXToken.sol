// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract MTXToken is ERC20, Ownable, Pausable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant BURN_RATE = 2; // 2% of transaction amount
    uint256 public constant REWARD_RATE = 5; // 5% of transaction amount for staking rewards

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public lastStakeTime;
    uint256 public totalStaked;

    event TokensBurned(address indexed from, uint256 amount);
    event TokensStaked(address indexed user, uint256 amount);
    event TokensUnstaked(address indexed user, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount);

    constructor() ERC20("Matrix3 Token", "MTX") {
        _mint(msg.sender, MAX_SUPPLY);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function stake(uint256 amount) public whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        lastStakeTime[msg.sender] = block.timestamp;
        totalStaked += amount;

        emit TokensStaked(msg.sender, amount);
    }

    function unstake(uint256 amount) public whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");

        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        _transfer(address(this), msg.sender, amount);

        emit TokensUnstaked(msg.sender, amount);
    }

    function claimRewards() public whenNotPaused {
        require(stakedBalance[msg.sender] > 0, "No staked tokens");
        
        uint256 timeStaked = block.timestamp - lastStakeTime[msg.sender];
        uint256 rewards = calculateRewards(msg.sender, timeStaked);
        
        require(rewards > 0, "No rewards available");
        require(balanceOf(address(this)) >= rewards, "Insufficient rewards pool");

        _transfer(address(this), msg.sender, rewards);
        lastStakeTime[msg.sender] = block.timestamp;

        emit RewardsDistributed(msg.sender, rewards);
    }

    function calculateRewards(address user, uint256 timeStaked) public view returns (uint256) {
        return (stakedBalance[user] * REWARD_RATE * timeStaked) / (365 days * 100);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount > 0, "Transfer amount must be greater than 0");

        uint256 burnAmount = (amount * BURN_RATE) / 100;
        uint256 transferAmount = amount - burnAmount;

        super._transfer(from, to, transferAmount);
        
        if (burnAmount > 0) {
            super._burn(from, burnAmount);
            emit TokensBurned(from, burnAmount);
        }
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
} 