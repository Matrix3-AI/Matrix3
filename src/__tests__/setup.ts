import { config } from 'dotenv';

// Load environment variables from .env.test
config({ path: '.env.test' });

// Mock console methods to avoid cluttering test output
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();
console.info = jest.fn();

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
}); 