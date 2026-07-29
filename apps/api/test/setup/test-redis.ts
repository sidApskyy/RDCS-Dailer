import Redis from 'ioredis';

/**
 * Test Redis setup utilities
 * Creates isolated test Redis connection for integration tests
 */

export class TestRedis {
  private client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const url = new URL(redisUrl);
      this.client = new Redis({
        lazyConnect: true,
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
        db: parseInt(process.env.REDIS_TEST_DB || '1'),
      });
    } else {
      this.client = new Redis({
        lazyConnect: true,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_TEST_DB || '1'), // Use separate DB for tests
      });
    }
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.quit();
  }

  async flush() {
    await this.client.flushdb();
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  getClient() {
    return this.client;
  }
}

export const testRedis = new TestRedis();
