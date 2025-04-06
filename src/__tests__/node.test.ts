import { Matrix3Node } from '../node';
import { loadConfig } from '../config';

jest.mock('../config', () => ({
  loadConfig: jest.fn(),
}));

describe('Matrix3Node', () => {
  let node: Matrix3Node;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      nodeId: 'test-node',
      walletAddress: '0x123',
      privateKey: '0x456',
      gpuType: 'NVIDIA',
      computePower: 100,
      memorySize: 16,
      supportedFrameworks: ['tensorflow', 'pytorch'],
      location: 'US',
      rpcEndpoint: 'http://localhost:8545',
      wsEndpoint: 'ws://localhost:8546',
      networkId: 1,
      contractAddresses: {
        mtxToken: '0x789',
        nodeManager: '0xabc',
      },
      gasPrice: 20000000000,
      maxGasLimit: 5000000,
      maxConcurrentTasks: 4,
      taskTimeout: 3600,
      heartbeatInterval: 30,
      dataDir: './data',
      tempDir: './temp',
      maxStorageSize: 1000000000,
      sslEnabled: false,
      allowedIPs: ['127.0.0.1'],
      logLevel: 'info',
      logFile: 'node.log',
      logMaxSize: 10485760,
      logMaxFiles: 5,
    };

    (loadConfig as jest.Mock).mockReturnValue(mockConfig);
    node = new Matrix3Node();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the node successfully', async () => {
      await expect(node.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors', async () => {
      // Mock an error in one of the managers
      jest.spyOn(node['gpuManager'], 'initialize').mockRejectedValue(new Error('GPU error'));

      await expect(node.initialize()).rejects.toThrow('GPU error');
    });
  });

  describe('start', () => {
    it('should start the node successfully', async () => {
      await expect(node.start()).resolves.not.toThrow();
    });

    it('should not start if already running', async () => {
      await node.start();
      await expect(node.start()).resolves.not.toThrow();
    });
  });

  describe('stop', () => {
    it('should stop the node successfully', async () => {
      await node.start();
      await expect(node.stop()).resolves.not.toThrow();
    });

    it('should not stop if not running', async () => {
      await expect(node.stop()).resolves.not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return correct node status', async () => {
      const status = await node.getStatus();
      expect(status).toHaveProperty('isRunning', false);
      expect(status).toHaveProperty('gpuStatus');
      expect(status).toHaveProperty('activeTasks', 0);
      expect(status).toHaveProperty('storageUsage');
    });
  });
}); 