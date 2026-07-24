# Test Redis Strategy

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform services

---

## Overview

This document defines the test Redis strategy for the RDCS In-House Dialer Platform. The strategy ensures isolated, deterministic, and fast Redis operations for testing.

---

## Redis Configuration

### Test Redis Instance

**Host:** `localhost`

**Port:** `6380`

**Database:** `1`

**Connection String:** `redis://:rdcs@localhost:6380/1`

**Purpose:** Isolated Redis instance for integration and E2E tests

---

## Redis Setup

### Docker Compose

Add test Redis to Docker Compose:

```yaml
services:
  redis-test:
    image: redis:7-alpine
    command: redis-server --requirepass rdcs
    ports:
      - "6380:6379"
    volumes:
      - redis-test-data:/data

volumes:
  redis-test-data:
```

### Local Redis

Use separate database for testing:

```bash
# Connect to Redis
redis-cli -a rdcs

# Select test database
SELECT 1
```

---

## Database Selection

### Test Database

Use database `1` for tests:

```typescript
import IORedis from 'ioredis';

const redis = new IORedis('redis://:rdcs@localhost:6380/1');
```

### Development Database

Use database `0` for development:

```typescript
import IORedis from 'ioredis';

const redis = new IORedis('redis://:rdcs@localhost:6379/0');
```

---

## Cleanup Strategy

### Flush Database

Flush test database before each test:

```typescript
// apps/api/test/setup.ts
beforeEach(async () => {
  await redis.flushdb();
});
```

### Flush All Databases

Flush all databases (use with caution):

```typescript
beforeEach(async () => {
  await redis.flushall();
});
```

### Selective Cleanup

Delete specific keys by pattern:

```typescript
beforeEach(async () => {
  const keys = await redis.keys('test:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
});
```

---

## Jest Configuration

### Test Redis URL

Add test Redis URL to Jest config:

```javascript
// apps/api/jest.config.js
module.exports = {
  setupFiles: ['./test/setup.ts'],
  testEnvironment: 'node',
  globals: {
    TEST_REDIS_URL: process.env.TEST_REDIS_URL,
  },
};
```

### Setup File

Create test setup file:

```typescript
// apps/api/test/setup.ts
import IORedis from 'ioredis';

const redis = new IORedis(process.env.TEST_REDIS_URL);

beforeAll(async () => {
  await redis.select(1);
  await redis.flushdb();
});

afterAll(async () => {
  await redis.flushdb();
  await redis.quit();
});

beforeEach(async () => {
  await redis.flushdb();
});

global.redis = redis;
```

---

## Environment Variables

### .env.test

Add test Redis URL to test environment:

```env
REDIS_URL=redis://:rdcs@localhost:6380/1
TEST_REDIS_URL=redis://:rdcs@localhost:6380/1
```

### Load Test Environment

Load test environment for tests:

```bash
# Run tests with test environment
NODE_ENV=test pnpm test
```

---

## BullMQ Testing

### Test Queue Configuration

Configure test queues with test Redis:

```typescript
import { Queue } from 'bullmq';

const testQueue = new Queue('test-queue', {
  connection: {
    host: 'localhost',
    port: 6380,
    password: 'rdcs',
    db: 1,
  },
});
```

### Test Worker Configuration

Configure test workers with test Redis:

```typescript
import { Worker } from 'bullmq';

const testWorker = new Worker(
  'test-queue',
  async (job) => {
    // Process job
  },
  {
    connection: {
      host: 'localhost',
      port: 6380,
      password: 'rdcs',
      db: 1,
    },
  },
);
```

### Queue Cleanup

Clean up queues after tests:

```typescript
afterEach(async () => {
  await testQueue.close();
  await testWorker.close();
});
```

---

## Socket.IO Testing

### Test Redis Adapter

Configure test Redis adapter for Socket.IO:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';

const pubClient = new IORedis('redis://:rdcs@localhost:6380/1');
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Adapter Cleanup

Clean up adapters after tests:

```typescript
afterEach(async () => {
  await pubClient.quit();
  await subClient.quit();
});
```

---

## Performance Optimization

### Connection Pooling

Use connection pooling for faster tests:

```typescript
const redis = new IORedis(process.env.TEST_REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

### In-Memory Redis

Consider using in-memory Redis for faster tests:

```typescript
// Use Redis Mock for unit tests
import RedisMock from 'ioredis-mock';

const redis = new RedisMock();
```

### Parallel Tests

Run tests in parallel with isolated databases:

```javascript
// apps/api/jest.config.js
module.exports = {
  maxWorkers: 4,
  testTimeout: 10000,
};
```

---

## Test Data

### Deterministic Keys

Use deterministic keys for test data:

```typescript
const testKey = 'test:user:clm123abc';
await redis.set(testKey, JSON.stringify({ name: 'Test User' }));
```

### Key Prefixes

Use key prefixes for isolation:

```typescript
const TEST_PREFIX = 'test:';
const key = `${TEST_PREFIX}user:${userId}`;
```

### TTL Management

Set TTL for test data:

```typescript
await redis.set(key, value, 'EX', 60); // Expire in 60 seconds
```

---

## Mocking Redis

### Unit Tests

Mock Redis for unit tests:

```typescript
import { vi } from 'vitest';

vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    flushdb: vi.fn(),
    quit: vi.fn(),
  })),
}));
```

### Integration Tests

Use real Redis for integration tests:

```typescript
import IORedis from 'ioredis';

const redis = new IORedis(process.env.TEST_REDIS_URL);
```

---

## Troubleshooting

### Connection Failed

1. Check test Redis is running
2. Check connection string is correct
3. Check Redis password
4. Check port is not in use

### Database Not Flushed

1. Check database selection
2. Check flush command
3. Check Redis permissions
4. Check for active connections

### Queue Not Processing

1. Check queue configuration
2. Check worker configuration
3. Check Redis connection
4. Check job data format

### Adapter Not Working

1. Check Redis connection
2. Check adapter configuration
3. Check pub/sub setup
4. Check for connection errors

---

## Best Practices

### Isolation

- Use separate test database
- Use key prefixes for isolation
- Clean up after each test
- Use deterministic keys

### Determinism

- Use fixed keys for test data
- Use fixed values for test data
- Avoid random data
- Use TTL for cleanup

### Performance

- Use connection pooling
- Use parallel execution
- Use in-memory Redis when possible
- Optimize cleanup strategy

### Maintenance

- Clean up old test data
- Monitor Redis memory usage
- Update Redis version regularly
- Monitor connection pool

---

## Resources

- [IORedis Documentation](https://github.com/luin/ioredis)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Redis Testing Best Practices](https://redis.io/docs/manual/patterns/distributed-locks/)
