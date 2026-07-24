import { testAuth } from './setup/test-auth';
import { testDb } from './setup/test-database';
import { testRedis } from './setup/test-redis';

/**
 * Global test setup for integration tests
 * Initializes test database, Redis, and auth utilities
 */

beforeAll(async () => {
  // Connect to test database
  await testDb.connect();
  
  // Connect to test Redis
  await testRedis.connect();
});

afterAll(async () => {
  // Disconnect from test database
  await testDb.disconnect();
  
  // Disconnect from test Redis
  await testRedis.disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await testDb.clean();
  
  // Flush Redis before each test
  await testRedis.flush();
});

export { testDb, testAuth, testRedis };
