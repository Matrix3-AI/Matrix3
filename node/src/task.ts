import { NodeConfig } from './config';
import { Logger } from './logger';
import { GPUManager } from './gpu';
import { StorageManager } from './storage';
import { ethers } from 'ethers';

export interface Task {
    id: string;
    type: 'training' | 'inference' | 'rendering';
    status: 'pending' | 'running' | 'completed' | 'failed';
    requirements: {
        memory: number;
        computePower: number;
        storage: number;
    };
    data: {
        input: string;
        output: string;
        model?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export class TaskManager {
    private config: NodeConfig;
    private logger: Logger;
    private gpuManager: GPUManager;
    private storageManager: StorageManager;
    private provider: ethers.providers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private activeTasks: Map<string, Task>;
    private isInitialized: boolean;

    constructor(config: NodeConfig) {
        this.config = config;
        this.logger = new Logger(config);
        this.gpuManager = new GPUManager(config);
        this.storageManager = new StorageManager(config);
        this.provider = new ethers.providers.JsonRpcProvider(config.rpcEndpoint);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        this.activeTasks = new Map();
        this.isInitialized = false;
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Task Manager...');

            // Initialize GPU manager
            await this.gpuManager.initialize();

            // Initialize storage manager
            await this.storageManager.initialize();

            // Start task monitoring
            this.startTaskMonitoring();

            this.isInitialized = true;
            this.logger.info('Task Manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Task Manager:', error);
            throw error;
        }
    }

    private startTaskMonitoring(): void {
        // Monitor blockchain for new tasks
        const nodeManager = new ethers.Contract(
            this.config.contractAddresses.nodeManager,
            ['event TaskAssigned(uint256 indexed taskId, address indexed node)'],
            this.provider
        );

        nodeManager.on('TaskAssigned', async (taskId, node) => {
            if (node.toLowerCase() === this.wallet.address.toLowerCase()) {
                await this.handleNewTask(taskId);
            }
        });
    }

    private async handleNewTask(taskId: number): Promise<void> {
        try {
            const nodeManager = new ethers.Contract(
                this.config.contractAddresses.nodeManager,
                ['function getTaskInfo(uint256) view returns (address,string,uint256,uint256,uint256,bool,address)'],
                this.wallet
            );

            const [requester, taskType, requiredComputePower, reward, deadline, isCompleted, assignedNode] = 
                await nodeManager.getTaskInfo(taskId);

            if (isCompleted || assignedNode !== this.wallet.address) {
                return;
            }

            const task: Task = {
                id: taskId.toString(),
                type: this.parseTaskType(taskType),
                status: 'pending',
                requirements: {
                    memory: this.estimateMemoryRequirement(taskType),
                    computePower: requiredComputePower.toNumber(),
                    storage: this.estimateStorageRequirement(taskType)
                },
                data: {
                    input: '',
                    output: '',
                    model: taskType === 'inference' ? '' : undefined
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.processTask(task);
        } catch (error) {
            this.logger.error(`Failed to handle new task ${taskId}:`, error);
        }
    }

    private parseTaskType(type: string): Task['type'] {
        switch (type.toLowerCase()) {
            case 'training':
                return 'training';
            case 'inference':
                return 'inference';
            case 'rendering':
                return 'rendering';
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    }

    private estimateMemoryRequirement(taskType: string): number {
        // Implement memory estimation based on task type
        switch (taskType.toLowerCase()) {
            case 'training':
                return 16 * 1024 * 1024 * 1024; // 16GB
            case 'inference':
                return 8 * 1024 * 1024 * 1024; // 8GB
            case 'rendering':
                return 12 * 1024 * 1024 * 1024; // 12GB
            default:
                return 8 * 1024 * 1024 * 1024; // Default 8GB
        }
    }

    private estimateStorageRequirement(taskType: string): number {
        // Implement storage estimation based on task type
        switch (taskType.toLowerCase()) {
            case 'training':
                return 100 * 1024 * 1024 * 1024; // 100GB
            case 'inference':
                return 50 * 1024 * 1024 * 1024; // 50GB
            case 'rendering':
                return 200 * 1024 * 1024 * 1024; // 200GB
            default:
                return 50 * 1024 * 1024 * 1024; // Default 50GB
        }
    }

    private async processTask(task: Task): Promise<void> {
        try {
            // Check resource availability
            const canAllocate = await this.gpuManager.allocateResources(
                task.requirements.memory,
                task.requirements.computePower
            );

            if (!canAllocate) {
                task.status = 'failed';
                task.updatedAt = new Date();
                this.activeTasks.set(task.id, task);
                await this.reportTaskFailure(task.id);
                return;
            }

            // Allocate storage
            const storageAllocated = await this.storageManager.allocateStorage(
                task.requirements.storage
            );

            if (!storageAllocated) {
                task.status = 'failed';
                task.updatedAt = new Date();
                this.activeTasks.set(task.id, task);
                await this.reportTaskFailure(task.id);
                return;
            }

            // Start task execution
            task.status = 'running';
            task.updatedAt = new Date();
            this.activeTasks.set(task.id, task);

            // Execute task based on type
            await this.executeTask(task);

            // Mark task as completed
            task.status = 'completed';
            task.updatedAt = new Date();
            this.activeTasks.set(task.id, task);
            await this.reportTaskCompletion(task.id);

        } catch (error) {
            this.logger.error(`Failed to process task ${task.id}:`, error);
            task.status = 'failed';
            task.updatedAt = new Date();
            this.activeTasks.set(task.id, task);
            await this.reportTaskFailure(task.id);
        } finally {
            // Clean up resources
            await this.gpuManager.releaseResources();
            await this.storageManager.releaseStorage(task.requirements.storage);
        }
    }

    private async executeTask(task: Task): Promise<void> {
        // Implement task execution logic based on type
        switch (task.type) {
            case 'training':
                await this.executeTrainingTask(task);
                break;
            case 'inference':
                await this.executeInferenceTask(task);
                break;
            case 'rendering':
                await this.executeRenderingTask(task);
                break;
        }
    }

    private async executeTrainingTask(task: Task): Promise<void> {
        // Implement training task execution
        // This will be implemented based on specific requirements
    }

    private async executeInferenceTask(task: Task): Promise<void> {
        // Implement inference task execution
        // This will be implemented based on specific requirements
    }

    private async executeRenderingTask(task: Task): Promise<void> {
        // Implement rendering task execution
        // This will be implemented based on specific requirements
    }

    private async reportTaskCompletion(taskId: string): Promise<void> {
        try {
            const nodeManager = new ethers.Contract(
                this.config.contractAddresses.nodeManager,
                ['function completeTask(uint256)'],
                this.wallet
            );

            const tx = await nodeManager.completeTask(parseInt(taskId));
            await tx.wait();
        } catch (error) {
            this.logger.error(`Failed to report task completion for ${taskId}:`, error);
        }
    }

    private async reportTaskFailure(taskId: string): Promise<void> {
        // Implement task failure reporting
        // This will be implemented based on specific requirements
    }

    async getActiveTaskCount(): Promise<number> {
        return this.activeTasks.size;
    }

    async getTaskStatus(taskId: string): Promise<Task | null> {
        return this.activeTasks.get(taskId) || null;
    }

    async stop(): Promise<void> {
        try {
            // Clean up active tasks
            for (const task of this.activeTasks.values()) {
                if (task.status === 'running') {
                    task.status = 'failed';
                    task.updatedAt = new Date();
                    await this.reportTaskFailure(task.id);
                }
            }

            this.activeTasks.clear();
            this.isInitialized = false;
            this.logger.info('Task Manager stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop Task Manager:', error);
            throw error;
        }
    }
} 