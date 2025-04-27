/**
 * Jest setup file
 * 
 * This file runs before each test file and can be used to set up global test configuration.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Global test timeout (30 seconds)
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
// Comment these out if you want to see console output during tests
global.console = {
  ...console,
  // Uncomment to silence specific console methods during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Add any global test setup here
beforeAll(() => {
  // Setup code that runs before all tests
});

afterAll(() => {
  // Cleanup code that runs after all tests
});