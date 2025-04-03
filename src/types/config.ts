export interface Config {
  node: {
    id: string;
    type: 'full' | 'light';
    version: string;
  };

  network: {
    port: number;
    host: string;
    protocol: 'http' | 'https';
  };

  blockchain: {
    networkId: number;
    rpcEndpoint: string;
    wsEndpoint: string;
    contracts: {
      mtxToken?: string;
      nodeManager?: string;
    };
    wallet: {
      address?: string;
      privateKey?: string;
    };
  };

  gpu: {
    type: string;
    computePower: number;
    memorySize: number;
    supportedFrameworks: string[];
  };

  storage: {
    dataDir: string;
    tempDir: string;
    maxSize: number;
  };

  task: {
    maxConcurrent: number;
    timeout: number;
    heartbeatInterval: number;
  };

  security: {
    sslEnabled: boolean;
    sslCert?: string;
    sslKey?: string;
    allowedIPs: string[];
  };

  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    file: string;
    maxSize: number;
    maxFiles: number;
  };

  api: {
    enabled: boolean;
    cors: {
      origin: string;
      methods: string[];
    };
    rateLimiting: {
      windowMs: number;
      max: number;
    };
  };

  websocket: {
    enabled: boolean;
    path: string;
    maxConnections: number;
  };
} 