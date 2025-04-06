import { NodeConfig } from './config';
import { Logger } from './logger';
import { promises as fs } from 'fs';
import { join } from 'path';

export class StorageManager {
    private config: NodeConfig;
    private logger: Logger;
    private isInitialized: boolean;
    private allocatedStorage: number;
    private storageUsage: number;

    constructor(config: NodeConfig) {
        this.config = config;
        this.logger = new Logger(config);
        this.isInitialized = false;
        this.allocatedStorage = 0;
        this.storageUsage = 0;
    }

    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Storage Manager...');

            // Create necessary directories
            await this.createDirectories();

            // Calculate initial storage usage
            await this.calculateStorageUsage();

            this.isInitialized = true;
            this.logger.info('Storage Manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Storage Manager:', error);
            throw error;
        }
    }

    private async createDirectories(): Promise<void> {
        try {
            await fs.mkdir(this.config.dataDir, { recursive: true });
            await fs.mkdir(this.config.tempDir, { recursive: true });
        } catch (error) {
            this.logger.error('Failed to create directories:', error);
            throw error;
        }
    }

    private async calculateStorageUsage(): Promise<void> {
        try {
            this.storageUsage = await this.getDirectorySize(this.config.dataDir);
        } catch (error) {
            this.logger.error('Failed to calculate storage usage:', error);
            throw error;
        }
    }

    private async getDirectorySize(dir: string): Promise<number> {
        let size = 0;
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                if (entry.isDirectory()) {
                    size += await this.getDirectorySize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    size += stats.size;
                }
            }
        } catch (error) {
            this.logger.error(`Failed to get directory size for ${dir}:`, error);
        }
        return size;
    }

    async allocateStorage(requiredSize: number): Promise<boolean> {
        if (!this.isInitialized) {
            throw new Error('Storage Manager not initialized');
        }

        if (this.storageUsage + requiredSize > this.config.maxStorageSize) {
            this.logger.warn('Insufficient storage space');
            return false;
        }

        this.allocatedStorage += requiredSize;
        return true;
    }

    async releaseStorage(size: number): Promise<void> {
        if (this.allocatedStorage >= size) {
            this.allocatedStorage -= size;
        } else {
            this.logger.warn('Attempted to release more storage than allocated');
        }
    }

    async getUsage(): Promise<number> {
        return this.storageUsage;
    }

    async getAvailableSpace(): Promise<number> {
        return this.config.maxStorageSize - this.storageUsage;
    }

    async createTaskDirectory(taskId: string): Promise<string> {
        const taskDir = join(this.config.dataDir, taskId);
        try {
            await fs.mkdir(taskDir, { recursive: true });
            return taskDir;
        } catch (error) {
            this.logger.error(`Failed to create task directory for ${taskId}:`, error);
            throw error;
        }
    }

    async saveTaskData(taskId: string, data: Buffer, filename: string): Promise<string> {
        const taskDir = await this.createTaskDirectory(taskId);
        const filePath = join(taskDir, filename);
        
        try {
            await fs.writeFile(filePath, data);
            this.storageUsage += data.length;
            return filePath;
        } catch (error) {
            this.logger.error(`Failed to save task data for ${taskId}:`, error);
            throw error;
        }
    }

    async readTaskData(taskId: string, filename: string): Promise<Buffer> {
        const filePath = join(this.config.dataDir, taskId, filename);
        try {
            return await fs.readFile(filePath);
        } catch (error) {
            this.logger.error(`Failed to read task data for ${taskId}:`, error);
            throw error;
        }
    }

    async deleteTaskData(taskId: string): Promise<void> {
        const taskDir = join(this.config.dataDir, taskId);
        try {
            await this.deleteDirectory(taskDir);
            await this.calculateStorageUsage();
        } catch (error) {
            this.logger.error(`Failed to delete task data for ${taskId}:`, error);
            throw error;
        }
    }

    private async deleteDirectory(dir: string): Promise<void> {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                if (entry.isDirectory()) {
                    await this.deleteDirectory(fullPath);
                } else {
                    await fs.unlink(fullPath);
                }
            }
            
            await fs.rmdir(dir);
        } catch (error) {
            this.logger.error(`Failed to delete directory ${dir}:`, error);
            throw error;
        }
    }

    async cleanupTempFiles(): Promise<void> {
        try {
            const entries = await fs.readdir(this.config.tempDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = join(this.config.tempDir, entry.name);
                if (entry.isFile()) {
                    await fs.unlink(fullPath);
                } else {
                    await this.deleteDirectory(fullPath);
                }
            }
        } catch (error) {
            this.logger.error('Failed to cleanup temp files:', error);
        }
    }

    async stop(): Promise<void> {
        try {
            // Clean up temp files
            await this.cleanupTempFiles();
            
            this.isInitialized = false;
            this.allocatedStorage = 0;
            this.storageUsage = 0;
            
            this.logger.info('Storage Manager stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop Storage Manager:', error);
            throw error;
        }
    }
} 