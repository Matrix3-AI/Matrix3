import { Config } from '../src/types/config';

const config: Config = {
  // Node Configuration
  node: {
    id: process.env.NODE_ID || 'node_1',
    type: 'full',
    version: '1.0.0',
  },

  // Network Configuration
  network: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    protocol: process.env.PROTOCOL || 'http',
  },

  // Blockchain Configuration
  blockchain: {
    networkId: parseInt(process.env.NETWORK_ID || '1', 10),
    rpcEndpoint: process.env.RPC_ENDPOINT || 'http://localhost:8545',
    wsEndpoint: process.env.WS_ENDPOINT || 'ws://localhost:8546',
    contracts: {
      mtxToken: process.env.MTX_TOKEN_ADDRESS,
      nodeManager: process.env.NODE_MANAGER_ADDRESS,
    },
    wallet: {
      address: process.env.WALLET_ADDRESS,
      privateKey: process.env.PRIVATE_KEY,
    },
  },

  // GPU Configuration
  gpu: {
    type: process.env.GPU_TYPE || 'NVIDIA',
    computePower: parseInt(process.env.COMPUTE_POWER || '100', 10),
    memorySize: parseInt(process.env.MEMORY_SIZE || '16', 10),
    supportedFrameworks: (process.env.SUPPORTED_FRAMEWORKS || 'tensorflow,pytorch').split(','),
  },

  // Storage Configuration
  storage: {
    dataDir: process.env.DATA_DIR || './data',
    tempDir: process.env.TEMP_DIR || './temp',
    maxSize: parseInt(process.env.MAX_STORAGE_SIZE || '1000000000', 10),
  },

  // Task Configuration
  task: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS || '4', 10),
    timeout: parseInt(process.env.TASK_TIMEOUT || '3600', 10),
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30', 10),
  },

  // Security Configuration
  security: {
    sslEnabled: process.env.SSL_ENABLED === 'true',
    sslCert: process.env.SSL_CERT_PATH,
    sslKey: process.env.SSL_KEY_PATH,
    allowedIPs: (process.env.ALLOWED_IPS || '127.0.0.1').split(','),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'node.log',
    maxSize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
  },

  // API Configuration
  api: {
    enabled: true,
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    },
  },

  // WebSocket Configuration
  websocket: {
    enabled: true,
    path: '/ws',
    maxConnections: 1000,
  },
};

export default config; 