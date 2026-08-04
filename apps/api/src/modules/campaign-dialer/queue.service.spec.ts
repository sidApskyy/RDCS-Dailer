import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

import { LoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../prisma/prisma.service';

import { QueueService } from './queue.service';

class MockRedis {
  private sortedSets = new Map<string, Map<string, number>>();
  private sets = new Map<string, Set<string>>();
  private locks = new Map<string, string>();
  private shouldFail = false;

  setFailMode(fail: boolean): void {
    this.shouldFail = fail;
  }

  private ensureSortedSet(key: string): Map<string, number> {
    if (!this.sortedSets.has(key)) this.sortedSets.set(key, new Map());
    return this.sortedSets.get(key)!;
  }

  private ensureSet(key: string): Set<string> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    return this.sets.get(key)!;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<string | null> {
    if (this.shouldFail) throw new Error('Redis connection error');
    const nx = args.includes('NX');
    if (nx && this.locks.has(key)) return null;
    this.locks.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    this.locks.delete(key);
    return 1;
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (this.shouldFail) throw new Error('Redis connection error');
    const set = this.ensureSortedSet(key);
    if (set.has(member)) return 0;
    set.set(member, score);
    return 1;
  }

  async zpopmin(key: string): Promise<string[]> {
    if (this.shouldFail) throw new Error('Redis connection error');
    const set = this.sortedSets.get(key);
    if (!set || set.size === 0) return [];
    const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
    const [member, score] = sorted[0];
    set.delete(member);
    return [member, score.toString()];
  }

  async zrem(key: string, member: string): Promise<number> {
    const set = this.sortedSets.get(key);
    if (!set || !set.has(member)) return 0;
    set.delete(member);
    return 1;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
    const arr = sorted.map(([m]) => m);
    const end = stop === -1 ? arr.length : stop + 1;
    return arr.slice(start, end);
  }

  async zcard(key: string): Promise<number> {
    const set = this.sortedSets.get(key);
    return set ? set.size : 0;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.ensureSet(key);
    let added = 0;
    for (const m of members) {
      if (!set.has(m)) { set.add(m); added++; }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) {
      if (set.has(m)) { set.delete(m); removed++; }
    }
    return removed;
  }

  async quit(): Promise<void> {
    return;
  }

  _getSortedSet(key: string): Map<string, number> | undefined {
    return this.sortedSets.get(key);
  }

  _reset(): void {
    this.sortedSets.clear();
    this.sets.clear();
    this.locks.clear();
    this.shouldFail = false;
  }
}

function createMockLogger(): LoggerService {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
  } as unknown as LoggerService;
}

function createQueueEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'queue-1',
    tenantId: 'tenant-1',
    campaignId: 'camp-1',
    leadId: 'lead-1',
    phoneNumber: '+10000000000',
    priority: 0,
    status: 'pending',
    agentId: null,
    callSessionId: null,
    queuedAt: new Date('2024-01-01T00:00:00Z'),
    dialedAt: null,
    skippedReason: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createPrismaMock(overrides: Record<string, unknown> = {}): PrismaService {
  const campaignDialQueue = {
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(createQueueEntry(data)),
    ),
    update: jest.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
      Promise.resolve(createQueueEntry({ id: where.id, ...data })),
    ),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    count: jest.fn().mockResolvedValue(0),
    ...overrides,
  };

  const agentPresence = {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    ...overrides,
  };

  return {
    campaignDialQueue,
    agentPresence,
  } as unknown as PrismaService;
}

describe('QueueService', () => {
  let redis: MockRedis;
  let logger: LoggerService;

  beforeEach(() => {
    redis = new MockRedis();
    logger = createMockLogger();
  });

  describe('enqueue', () => {
    it('should enqueue a lead successfully', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const entry = await service.enqueue({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        leadId: 'lead-1',
        phoneNumber: '+10000000000',
        priority: 5,
      });

      expect(entry.id).toBe('queue-1');
      expect(entry.status).toBe('pending');
      expect(prisma.campaignDialQueue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            campaignId: 'camp-1',
            leadId: 'lead-1',
            phoneNumber: '+10000000000',
            priority: 5,
            status: 'pending',
          }),
        }),
      );
      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      expect(redis._getSortedSet(queueKey)?.has('queue-1')).toBe(true);
    });

    it('should prevent duplicate enqueue for the same lead', async () => {
      const prisma = createPrismaMock({
        findFirst: jest.fn().mockResolvedValue(createQueueEntry({ status: 'pending' })),
      });
      const service = new QueueService(prisma, logger, redis as any);

      await expect(
        service.enqueue({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          leadId: 'lead-1',
          phoneNumber: '+10000000000',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should prevent concurrent duplicate enqueue using Redis lock', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const lockKey = 'campaign-dialer:lock:tenant-1:camp-1:lead-1';
      await redis.set(lockKey, 'manual', 'EX', 10, 'NX');

      await expect(
        service.enqueue({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          leadId: 'lead-1',
          phoneNumber: '+10000000000',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      await redis.del(lockKey);
    });
  });

  describe('dequeue', () => {
    it('should dequeue the highest priority entry first', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const t1 = new Date('2024-01-01T00:00:00Z');
      const t2 = new Date('2024-01-01T00:00:01Z');

      const set = new Map<string, number>();
      set.set('queue-low', -0 * 1e10 + t1.getTime());
      set.set('queue-high', -10 * 1e10 + t2.getTime());
      (redis as any).sortedSets.set(queueKey, set);

      prisma.campaignDialQueue.updateMany = jest.fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValue({ count: 1 });
      prisma.campaignDialQueue.findFirst = jest.fn()
        .mockResolvedValueOnce(createQueueEntry({ id: 'queue-high', priority: 10 }));

      const result = await service.dequeue({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        agentId: 'agent-1',
      });

      expect(result?.id).toBe('queue-high');
    });

    it('should maintain FIFO ordering for equal priority entries', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const t1 = new Date('2024-01-01T00:00:00Z');
      const t2 = new Date('2024-01-01T00:00:10Z');

      const set = new Map<string, number>();
      set.set('queue-newer', -5 * 1e10 + t2.getTime());
      set.set('queue-older', -5 * 1e10 + t1.getTime());
      (redis as any).sortedSets.set(queueKey, set);

      prisma.campaignDialQueue.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      prisma.campaignDialQueue.findFirst = jest.fn()
        .mockResolvedValueOnce(createQueueEntry({ id: 'queue-older', priority: 5, queuedAt: t1 }));

      const result = await service.dequeue({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        agentId: 'agent-1',
      });

      expect(result?.id).toBe('queue-older');
    });

    it('should return null when the queue is empty', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const result = await service.dequeue({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        agentId: 'agent-1',
      });

      expect(result).toBeNull();
    });

    it('should not assign the same lead to two concurrent dequeue calls', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const set = new Map<string, number>();
      set.set('queue-1', 100);
      (redis as any).sortedSets.set(queueKey, set);

      prisma.campaignDialQueue.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      prisma.campaignDialQueue.findFirst = jest.fn()
        .mockResolvedValue(createQueueEntry({ id: 'queue-1' }));

      const [first, second] = await Promise.all([
        service.dequeue({ tenantId: 'tenant-1', campaignId: 'camp-1', agentId: 'agent-1' }),
        service.dequeue({ tenantId: 'tenant-1', campaignId: 'camp-1', agentId: 'agent-2' }),
      ]);

      expect(first?.id).toBe('queue-1');
      expect(second).toBeNull();
    });

    it('should retry and return the next valid entry when the first is already claimed', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const set = new Map<string, number>();
      set.set('queue-claimed', 50);
      set.set('queue-valid', 100);
      (redis as any).sortedSets.set(queueKey, set);

      prisma.campaignDialQueue.updateMany = jest.fn()
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 1 });
      prisma.campaignDialQueue.findFirst = jest.fn()
        .mockResolvedValueOnce(createQueueEntry({ id: 'queue-valid', leadId: 'lead-valid' }));

      const result = await service.dequeue({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        agentId: 'agent-1',
      });

      expect(result?.id).toBe('queue-valid');

      expect(prisma.campaignDialQueue.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.campaignDialQueue.updateMany).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'queue-claimed',
            tenantId: 'tenant-1',
            campaignId: 'camp-1',
            status: 'pending',
          }),
        }),
      );
      expect(prisma.campaignDialQueue.updateMany).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'queue-valid',
            tenantId: 'tenant-1',
            campaignId: 'camp-1',
            status: 'pending',
          }),
        }),
      );

      expect(set.has('queue-claimed')).toBe(false);
      expect(set.has('queue-valid')).toBe(false);
    });
  });

  describe('skip', () => {
    it('should mark a queue entry as skipped and remove it from Redis', async () => {
      const entry = createQueueEntry({ id: 'queue-1', status: 'pending', leadId: 'lead-1' });
      const prisma = createPrismaMock({
        findFirst: jest.fn().mockResolvedValue(entry),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      });
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const set = new Map<string, number>();
      set.set('queue-1', 100);
      (redis as any).sortedSets.set(queueKey, set);
      const activeSet = new Set<string>(['lead-1']);
      (redis as any).sets.set('campaign-dialer:active:tenant-1:camp-1', activeSet);

      await service.skip({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        queueEntryId: 'queue-1',
        skippedReason: 'Lead unavailable',
      });

      expect(prisma.campaignDialQueue.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'skipped', skippedReason: 'Lead unavailable' }),
        }),
      );
      expect(set.has('queue-1')).toBe(false);
      expect(activeSet.has('lead-1')).toBe(false);
    });

    it('should throw NotFoundException for non-existent queue entry', async () => {
      const prisma = createPrismaMock({
        findFirst: jest.fn().mockResolvedValue(null),
      });
      const service = new QueueService(prisma, logger, redis as any);

      await expect(
        service.skip({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          queueEntryId: 'nonexistent',
          skippedReason: 'test',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('requeue', () => {
    it('should restore a skipped entry to pending state', async () => {
      const entry = createQueueEntry({ id: 'queue-1', status: 'skipped', priority: 7, leadId: 'lead-1' });
      const prisma = createPrismaMock({
        findFirst: jest.fn().mockResolvedValue(entry),
        update: jest.fn().mockResolvedValue(createQueueEntry({ id: 'queue-1', status: 'pending', priority: 7 })),
      });
      const service = new QueueService(prisma, logger, redis as any);

      const result = await service.requeue({
        tenantId: 'tenant-1',
        campaignId: 'camp-1',
        queueEntryId: 'queue-1',
      });

      expect(result.status).toBe('pending');
      expect(prisma.campaignDialQueue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            agentId: null,
            dialedAt: null,
            skippedReason: null,
          }),
        }),
      );
      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      expect(redis._getSortedSet(queueKey)?.has('queue-1')).toBe(true);
    });

    it('should throw BadRequestException when requeuing a pending entry', async () => {
      const entry = createQueueEntry({ id: 'queue-1', status: 'pending' });
      const prisma = createPrismaMock({
        findFirst: jest.fn().mockResolvedValue(entry),
      });
      const service = new QueueService(prisma, logger, redis as any);

      await expect(
        service.requeue({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          queueEntryId: 'queue-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('tenant isolation', () => {
    it('should not allow tenant A to dequeue tenant B entries', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const queueKeyA = 'campaign-dialer:tenant-A:camp-1';
      const set = new Map<string, number>();
      set.set('queue-A', 100);
      (redis as any).sortedSets.set(queueKeyA, set);

      const result = await service.dequeue({
        tenantId: 'tenant-B',
        campaignId: 'camp-1',
        agentId: 'agent-1',
      });

      expect(result).toBeNull();
      expect(set.has('queue-A')).toBe(true);
    });
  });

  describe('campaign isolation', () => {
    it('should not allow campaign A to dequeue campaign B entries', async () => {
      const prisma = createPrismaMock();
      const service = new QueueService(prisma, logger, redis as any);

      const queueKeyB = 'campaign-dialer:tenant-1:camp-B';
      const set = new Map<string, number>();
      set.set('queue-B', 100);
      (redis as any).sortedSets.set(queueKeyB, set);

      const result = await service.dequeue({
        tenantId: 'tenant-1',
        campaignId: 'camp-A',
        agentId: 'agent-1',
      });

      expect(result).toBeNull();
      expect(set.has('queue-B')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should propagate Redis errors during enqueue', async () => {
      const prisma = createPrismaMock();
      redis.setFailMode(true);
      const service = new QueueService(prisma, logger, redis as any);

      await expect(
        service.enqueue({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          leadId: 'lead-1',
          phoneNumber: '+10000000000',
        }),
      ).rejects.toThrow('Redis connection error');
    });

    it('should propagate Redis errors during dequeue', async () => {
      const prisma = createPrismaMock();
      redis.setFailMode(true);
      const service = new QueueService(prisma, logger, redis as any);

      await expect(
        service.dequeue({
          tenantId: 'tenant-1',
          campaignId: 'camp-1',
          agentId: 'agent-1',
        }),
      ).rejects.toThrow('Redis connection error');
    });
  });

  describe('syncQueue', () => {
    it('should add missing DB pending entries to Redis', async () => {
      const dbEntries = [
        createQueueEntry({ id: 'queue-1', priority: 5, queuedAt: new Date('2024-01-01T00:00:00Z') }),
        createQueueEntry({ id: 'queue-2', priority: 10, queuedAt: new Date('2024-01-01T00:00:01Z') }),
      ];
      const prisma = createPrismaMock({
        findMany: jest.fn().mockResolvedValue(dbEntries),
      });
      const service = new QueueService(prisma, logger, redis as any);

      const result = await service.syncQueue('tenant-1', 'camp-1');

      expect(result.added).toBe(2);
      expect(result.removed).toBe(0);
      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      expect(redis._getSortedSet(queueKey)?.size).toBe(2);
    });

    it('should remove stale Redis members not in DB', async () => {
      const prisma = createPrismaMock({
        findMany: jest.fn().mockResolvedValue([]),
      });
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const set = new Map<string, number>();
      set.set('stale-1', 100);
      set.set('stale-2', 200);
      (redis as any).sortedSets.set(queueKey, set);

      const result = await service.syncQueue('tenant-1', 'camp-1');

      expect(result.added).toBe(0);
      expect(result.removed).toBe(2);
      expect(set.size).toBe(0);
    });

    it('should handle both additions and removals', async () => {
      const dbEntries = [
        createQueueEntry({ id: 'queue-new', priority: 5, queuedAt: new Date('2024-01-01T00:00:00Z') }),
      ];
      const prisma = createPrismaMock({
        findMany: jest.fn().mockResolvedValue(dbEntries),
      });
      const service = new QueueService(prisma, logger, redis as any);

      const queueKey = 'campaign-dialer:tenant-1:camp-1';
      const set = new Map<string, number>();
      set.set('stale-old', 300);
      (redis as any).sortedSets.set(queueKey, set);

      const result = await service.syncQueue('tenant-1', 'camp-1');

      expect(result.added).toBe(1);
      expect(result.removed).toBe(1);
      expect(set.has('queue-new')).toBe(true);
      expect(set.has('stale-old')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const prisma = createPrismaMock({
        count: jest.fn()
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(3),
      });
      const service = new QueueService(prisma, logger, redis as any);

      const stats = await service.getStats('tenant-1', 'camp-1');

      expect(stats).toEqual({ pending: 5, dialing: 2, completed: 10, skipped: 3 });
    });
  });
});
