import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';

dotenvConfig();

export interface NodeConfig {
    // Node Identity
    nodeId: string;
    walletAddress: string;
    privateKey: string;

    // GPU Configuration
    gpuType: string;
    computePower: number;
    memorySize: number;
    supportedFrameworks: string[];

    // Network Configuration
    location: string;
    rpcEndpoint: string;
    wsEndpoint: string;
    networkId: number;

    // Blockchain Configuration
    contractAddresses: {
        mtxToken: string;
        nodeManager: string;
    };
    gasPrice: number;
    maxGasLimit: number;

    // Task Configuration
    maxConcurrentTasks: number;
    taskTimeout: number;
    heartbeatInterval: number;

    // Storage Configuration
    dataDir: string;
    tempDir: string;
    maxStorageSize: number;

    // Security Configuration
    sslEnabled: boolean;
    sslCertPath?: string;
    sslKeyPath?: string;
    allowedIPs: string[];

    // Logging Configuration
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logFile: string;
    logMaxSize: number;
    logMaxFiles: number;
}

const defaultConfig: NodeConfig = {
    nodeId: process.env.NODE_ID || '',
    walletAddress: process.env.WALLET_ADDRESS || '',
    privateKey: process.env.PRIVATE_KEY || '',

    gpuType: process.env.GPU_TYPE || 'NVIDIA',
    computePower: parseInt(process.env.COMPUTE_POWER || '0'),
    memorySize: parseInt(process.env.MEMORY_SIZE || '0'),
    supportedFrameworks: (process.env.SUPPORTED_FRAMEWORKS || '').split(','),

    location: process.env.LOCATION || 'unknown',
    rpcEndpoint: process.env.RPC_ENDPOINT || 'http://localhost:8545',
    wsEndpoint: process.env.WS_ENDPOINT || 'ws://localhost:8546',
    networkId: parseInt(process.env.NETWORK_ID || '1'),

    contractAddresses: {
        mtxToken: process.env.MTX_TOKEN_ADDRESS || '',
        nodeManager: process.env.NODE_MANAGER_ADDRESS || '',
    },
    gasPrice: parseInt(process.env.GAS_PRICE || '20000000000'),
    maxGasLimit: parseInt(process.env.MAX_GAS_LIMIT || '5000000'),

    maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '4'),
    taskTimeout: parseInt(process.env.TASK_TIMEOUT || '3600'),
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30'),

    dataDir: process.env.DATA_DIR || join(process.cwd(), 'data'),
    tempDir: process.env.TEMP_DIR || join(process.cwd(), 'temp'),
    maxStorageSize: parseInt(process.env.MAX_STORAGE_SIZE || '1000000000'),

    sslEnabled: process.env.SSL_ENABLED === 'true',
    sslCertPath: process.env.SSL_CERT_PATH,
    sslKeyPath: process.env.SSL_KEY_PATH,
    allowedIPs: (process.env.ALLOWED_IPS || '').split(','),

    logLevel: (process.env.LOG_LEVEL as NodeConfig['logLevel']) || 'info',
    logFile: process.env.LOG_FILE || 'node.log',
    logMaxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760'),
    logMaxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
};

export function validateConfig(config: NodeConfig): void {
    if (!config.nodeId) throw new Error('Node ID is required');
    if (!config.walletAddress) throw new Error('Wallet address is required');
    if (!config.privateKey) throw new Error('Private key is required');
    if (!config.gpuType) throw new Error('GPU type is required');
    if (config.computePower <= 0) throw new Error('Compute power must be greater than 0');
    if (config.memorySize <= 0) throw new Error('Memory size must be greater than 0');
    if (!config.contractAddresses.mtxToken) throw new Error('MTX token contract address is required');
    if (!config.contractAddresses.nodeManager) throw new Error('Node manager contract address is required');
}

export function loadConfig(): NodeConfig {
    const config = { ...defaultConfig };
    validateConfig(config);
    return config;
} 