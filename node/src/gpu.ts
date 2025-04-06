import { NodeConfig } from './config';
import { Logger } from './logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GPUStatus {
    gpuType: string;
    computePower: number;
    memoryTotal: number;
    memoryUsed: number;
    temperature: number;
    utilization: number;
    isAvailable: boolean;
}

export class GPUManager {
    private config: NodeConfig;
    private logger: Logger;
    private isInitialized: boolean;
    private gpuStatus: GPUStatus;

    constructor(config: NodeConfig) {
        this.config = config;
        this.logger = new Logger(config);
        this.isInitialized = false;
        this.gpuStatus = {
            gpuType: config.gpuType,
            computePower: config.computePower,
            memoryTotal: config.memorySize,
            memoryUsed: 0,
            temperature: 0,
            utilization: 0,
            isAvailable: true
        };
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing GPU Manager...');

            // Verify GPU availability
            await this.verifyGPU();

            // Initialize GPU monitoring
            await this.initializeMonitoring();

            this.isInitialized = true;
            this.logger.info('GPU Manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize GPU Manager:', error);
            throw error;
        }
    }

    private async verifyGPU(): Promise<void> {
        try {
            // Check if NVIDIA GPU is available
            if (this.config.gpuType === 'NVIDIA') {
                const { stdout } = await execAsync('nvidia-smi');
                if (!stdout.includes('NVIDIA-SMI')) {
                    throw new Error('NVIDIA GPU not found');
                }
            }
            // Add support for other GPU types here
        } catch (error) {
            this.logger.error('GPU verification failed:', error);
            throw error;
        }
    }

    private async initializeMonitoring(): Promise<void> {
        // Start monitoring GPU status periodically
        setInterval(async () => {
            try {
                await this.updateGPUStatus();
            } catch (error) {
                this.logger.error('Failed to update GPU status:', error);
            }
        }, 5000); // Update every 5 seconds
    }

    private async updateGPUStatus(): Promise<void> {
        try {
            if (this.config.gpuType === 'NVIDIA') {
                const { stdout } = await execAsync('nvidia-smi --query-gpu=memory.used,memory.total,temperature.gpu,utilization.gpu --format=csv,noheader,nounits');
                const [memoryUsed, memoryTotal, temperature, utilization] = stdout.trim().split(',').map(Number);

                this.gpuStatus = {
                    ...this.gpuStatus,
                    memoryUsed,
                    memoryTotal,
                    temperature,
                    utilization,
                    isAvailable: this.isGPUAvailable()
                };
            }
            // Add support for other GPU types here
        } catch (error) {
            this.logger.error('Failed to update GPU status:', error);
            throw error;
        }
    }

    private isGPUAvailable(): boolean {
        // Check if GPU is available based on current status
        return (
            this.gpuStatus.temperature < 85 && // Temperature threshold
            this.gpuStatus.utilization < 95 && // Utilization threshold
            this.gpuStatus.memoryUsed < this.gpuStatus.memoryTotal * 0.9 // Memory threshold
        );
    }

    async getStatus(): Promise<GPUStatus> {
        return this.gpuStatus;
    }

    async allocateResources(requiredMemory: number, requiredCompute: number): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('GPU Manager not initialized');
        }

        if (!this.isGPUAvailable()) {
            return false;
        }

        if (requiredMemory > this.gpuStatus.memoryTotal - this.gpuStatus.memoryUsed) {
            return false;
        }

        if (requiredCompute > this.gpuStatus.computePower) {
            return false;
        }

        return true;
    }

    async releaseResources(): Promise<void> {
        // Implement resource cleanup if needed
    }

    async stop(): Promise<void> {
        try {
            // Clean up resources
            await this.releaseResources();
            this.isInitialized = false;
            this.logger.info('GPU Manager stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop GPU Manager:', error);
            throw error;
        }
    }
} 