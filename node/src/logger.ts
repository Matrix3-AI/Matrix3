import { NodeConfig } from './config';
import { createWriteStream, WriteStream } from 'fs';
import { join } from 'path';
import { format } from 'util';

export class Logger {
    private config: NodeConfig;
    private logStream: WriteStream;
    private currentLogSize: number;
    private logFileCount: number;

    constructor(config: NodeConfig) {
        this.config = config;
        this.currentLogSize = 0;
        this.logFileCount = 0;
        this.initializeLogStream();
    }

    private initializeLogStream(): void {
        const logPath = join(process.cwd(), this.config.logFile);
        this.logStream = createWriteStream(logPath, { flags: 'a' });
    }

    private async rotateLogFile(): Promise<void> {
        try {
            // Close current log stream
            this.logStream.end();

            // Rename current log file
            const currentLogPath = join(process.cwd(), this.config.logFile);
            const rotatedLogPath = join(process.cwd(), `${this.config.logFile}.${this.logFileCount}`);
            await this.renameFile(currentLogPath, rotatedLogPath);

            // Update counters
            this.logFileCount++;
            if (this.logFileCount > this.config.logMaxFiles) {
                // Delete oldest log file
                const oldestLogPath = join(process.cwd(), `${this.config.logFile}.${this.logFileCount - this.config.logMaxFiles}`);
                await this.deleteFile(oldestLogPath);
                this.logFileCount--;
            }

            // Reset current log size
            this.currentLogSize = 0;

            // Create new log stream
            this.initializeLogStream();
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    private async renameFile(oldPath: string, newPath: string): Promise<void> {
        const { rename } = require('fs').promises;
        await rename(oldPath, newPath);
    }

    private async deleteFile(path: string): Promise<void> {
        const { unlink } = require('fs').promises;
        await unlink(path);
    }

    private formatMessage(level: string, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const formattedMessage = format(message, ...args);
        return `[${timestamp}] ${level}: ${formattedMessage}\n`;
    }

    private async writeLog(level: string, message: string, ...args: any[]): Promise<void> {
        const formattedMessage = this.formatMessage(level, message, ...args);
        const messageSize = Buffer.byteLength(formattedMessage);

        // Check if we need to rotate the log file
        if (this.currentLogSize + messageSize > this.config.logMaxSize) {
            await this.rotateLogFile();
        }

        // Write to log file
        this.logStream.write(formattedMessage);
        this.currentLogSize += messageSize;

        // Also write to console if log level is appropriate
        if (this.shouldLogToConsole(level)) {
            console.log(formattedMessage.trim());
        }
    }

    private shouldLogToConsole(level: string): boolean {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configLevelIndex = levels.indexOf(this.config.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= configLevelIndex;
    }

    async debug(message: string, ...args: any[]): Promise<void> {
        await this.writeLog('DEBUG', message, ...args);
    }

    async info(message: string, ...args: any[]): Promise<void> {
        await this.writeLog('INFO', message, ...args);
    }

    async warn(message: string, ...args: any[]): Promise<void> {
        await this.writeLog('WARN', message, ...args);
    }

    async error(message: string, ...args: any[]): Promise<void> {
        await this.writeLog('ERROR', message, ...args);
    }

    async close(): Promise<void> {
        return new Promise((resolve) => {
            this.logStream.end(() => {
                resolve();
            });
        });
    }
} 