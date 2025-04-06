// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./MTXToken.sol";

contract GPUNodeManager is Ownable, Pausable, ReentrancyGuard {
    struct Node {
        string gpuType;
        uint256 computePower;
        string location;
        uint256 stakeAmount;
        uint256 lastHeartbeat;
        bool isActive;
        uint256 totalTasksCompleted;
        uint256 totalRewardsEarned;
    }

    struct Task {
        address requester;
        string taskType;
        uint256 requiredComputePower;
        uint256 reward;
        uint256 deadline;
        bool isCompleted;
        address assignedNode;
    }

    MTXToken public mtxToken;
    
    mapping(address => Node) public nodes;
    mapping(uint256 => Task) public tasks;
    uint256 public taskCounter;
    uint256 public totalActiveNodes;
    uint256 public minimumStake;
    
    event NodeRegistered(address indexed node, string gpuType, uint256 computePower);
    event NodeDeregistered(address indexed node);
    event TaskCreated(uint256 indexed taskId, address indexed requester);
    event TaskAssigned(uint256 indexed taskId, address indexed node);
    event TaskCompleted(uint256 indexed taskId, address indexed node);
    event RewardsDistributed(address indexed node, uint256 amount);

    constructor(address _mtxToken) {
        mtxToken = MTXToken(_mtxToken);
        minimumStake = 1000 * 10**18; // 1000 MTX tokens
    }

    function registerNode(
        string memory _gpuType,
        uint256 _computePower,
        string memory _location
    ) external whenNotPaused nonReentrant {
        require(!nodes[msg.sender].isActive, "Node already registered");
        require(_computePower > 0, "Invalid compute power");
        
        nodes[msg.sender] = Node({
            gpuType: _gpuType,
            computePower: _computePower,
            location: _location,
            stakeAmount: 0,
            lastHeartbeat: block.timestamp,
            isActive: false,
            totalTasksCompleted: 0,
            totalRewardsEarned: 0
        });

        emit NodeRegistered(msg.sender, _gpuType, _computePower);
    }

    function stakeAndActivate(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount >= minimumStake, "Insufficient stake amount");
        require(nodes[msg.sender].gpuType != "", "Node not registered");
        require(!nodes[msg.sender].isActive, "Node already active");

        mtxToken.transferFrom(msg.sender, address(this), _amount);
        nodes[msg.sender].stakeAmount = _amount;
        nodes[msg.sender].isActive = true;
        nodes[msg.sender].lastHeartbeat = block.timestamp;
        totalActiveNodes++;

        emit NodeRegistered(msg.sender, nodes[msg.sender].gpuType, nodes[msg.sender].computePower);
    }

    function submitHeartbeat() external whenNotPaused {
        require(nodes[msg.sender].isActive, "Node not active");
        nodes[msg.sender].lastHeartbeat = block.timestamp;
    }

    function createTask(
        string memory _taskType,
        uint256 _requiredComputePower,
        uint256 _reward,
        uint256 _deadline
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(_requiredComputePower > 0, "Invalid compute power");
        require(_reward > 0, "Invalid reward");
        require(_deadline > block.timestamp, "Invalid deadline");

        mtxToken.transferFrom(msg.sender, address(this), _reward);

        uint256 taskId = taskCounter++;
        tasks[taskId] = Task({
            requester: msg.sender,
            taskType: _taskType,
            requiredComputePower: _requiredComputePower,
            reward: _reward,
            deadline: _deadline,
            isCompleted: false,
            assignedNode: address(0)
        });

        emit TaskCreated(taskId, msg.sender);
        return taskId;
    }

    function assignTask(uint256 _taskId, address _node) external whenNotPaused onlyOwner {
        require(tasks[_taskId].requester != address(0), "Task does not exist");
        require(!tasks[_taskId].isCompleted, "Task already completed");
        require(nodes[_node].isActive, "Node not active");
        require(nodes[_node].computePower >= tasks[_taskId].requiredComputePower, "Insufficient compute power");

        tasks[_taskId].assignedNode = _node;
        emit TaskAssigned(_taskId, _node);
    }

    function completeTask(uint256 _taskId) external whenNotPaused nonReentrant {
        require(tasks[_taskId].assignedNode == msg.sender, "Not assigned to this node");
        require(!tasks[_taskId].isCompleted, "Task already completed");
        require(block.timestamp <= tasks[_taskId].deadline, "Task deadline passed");

        tasks[_taskId].isCompleted = true;
        nodes[msg.sender].totalTasksCompleted++;
        nodes[msg.sender].totalRewardsEarned += tasks[_taskId].reward;

        mtxToken.transfer(msg.sender, tasks[_taskId].reward);
        emit TaskCompleted(_taskId, msg.sender);
        emit RewardsDistributed(msg.sender, tasks[_taskId].reward);
    }

    function deregisterNode() external whenNotPaused nonReentrant {
        require(nodes[msg.sender].isActive, "Node not active");
        
        nodes[msg.sender].isActive = false;
        totalActiveNodes--;
        
        if (nodes[msg.sender].stakeAmount > 0) {
            mtxToken.transfer(msg.sender, nodes[msg.sender].stakeAmount);
            nodes[msg.sender].stakeAmount = 0;
        }

        emit NodeDeregistered(msg.sender);
    }

    function getNodeInfo(address _node) external view returns (Node memory) {
        return nodes[_node];
    }

    function getTaskInfo(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }

    function getActiveNodes() external view returns (address[] memory) {
        address[] memory activeNodes = new address[](totalActiveNodes);
        uint256 count = 0;
        
        for (uint256 i = 0; i < taskCounter; i++) {
            address node = tasks[i].assignedNode;
            if (node != address(0) && nodes[node].isActive) {
                activeNodes[count] = node;
                count++;
            }
        }
        
        return activeNodes;
    }

    function updateMinimumStake(uint256 _newMinimum) external onlyOwner {
        minimumStake = _newMinimum;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
} 