import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { NodeConfig, loadConfig } from './config';
import { GPUManager } from './gpu';
import { TaskManager } from './task';
import { StorageManager } from './storage';
import { Logger } from './logger';

export class Matrix3Node extends EventEmitter {
    private config: NodeConfig;
    private provider: ethers.providers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private gpuManager: GPUManager;
    private taskManager: TaskManager;
    private storageManager: StorageManager;
    private logger: Logger;
    private isRunning: boolean;
    private heartbeatInterval: NodeJS.Timeout;

    constructor() {
        super();
        this.config = loadConfig();
        this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcEndpoint);
        this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
        this.gpuManager = new GPUManager(this.config);
        this.taskManager = new TaskManager(this.config);
        this.storageManager = new StorageManager(this.config);
        this.logger = new Logger(this.config);
        this.isRunning = false;
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Matrix3 Node...');

            // Initialize GPU manager
            await this.gpuManager.initialize();

            // Initialize storage manager
            await this.storageManager.initialize();

            // Initialize task manager
            await this.taskManager.initialize();

            // Register node on blockchain
            await this.registerNode();

            // Start heartbeat
            this.startHeartbeat();

            this.isRunning = true;
            this.logger.info('Matrix3 Node initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Matrix3 Node:', error);
            throw error;
        }
    }

    private async registerNode(): Promise<void> {
        try {
            const nodeManager = new ethers.Contract(
                this.config.contractAddresses.nodeManager,
                ['function registerNode(string,uint256,string)'],
                this.wallet
            );

            const tx = await nodeManager.registerNode(
                this.config.gpuType,
                this.config.computePower,
                this.config.location
            );

            await tx.wait();
            this.logger.info('Node registered successfully on blockchain');
        } catch (error) {
            this.logger.error('Failed to register node:', error);
            throw error;
        }
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(async () => {
            try {
                await this.submitHeartbeat();
            } catch (error) {
                this.logger.error('Failed to submit heartbeat:', error);
            }
        }, this.config.heartbeatInterval * 1000);
    }

    private async submitHeartbeat(): Promise<void> {
        try {
            const nodeManager = new ethers.Contract(
                this.config.contractAddresses.nodeManager,
                ['function submitHeartbeat()'],
                this.wallet
            );

            const tx = await nodeManager.submitHeartbeat();
            await tx.wait();
        } catch (error) {
            this.logger.error('Failed to submit heartbeat:', error);
            throw error;
        }
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Node is already running');
            return;
        }

        try {
            await this.initialize();
            this.logger.info('Matrix3 Node started successfully');
        } catch (error) {
            this.logger.error('Failed to start Matrix3 Node:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            this.logger.warn('Node is not running');
            return;
        }

        try {
            // Clear heartbeat interval
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }

            // Stop task manager
            await this.taskManager.stop();

            // Stop GPU manager
            await this.gpuManager.stop();

            // Stop storage manager
            await this.storageManager.stop();

            this.isRunning = false;
            this.logger.info('Matrix3 Node stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop Matrix3 Node:', error);
            throw error;
        }
    }

    async getStatus(): Promise<{
        isRunning: boolean;
        gpuStatus: any;
        activeTasks: number;
        storageUsage: number;
    }> {
        return {
            isRunning: this.isRunning,
            gpuStatus: await this.gpuManager.getStatus(),
            activeTasks: await this.taskManager.getActiveTaskCount(),
            storageUsage: await this.storageManager.getUsage(),
        };
    }
} 