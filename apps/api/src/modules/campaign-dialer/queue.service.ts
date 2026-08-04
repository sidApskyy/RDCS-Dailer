import { Inject, Injectable, OnModuleDestroy, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@rdcs/database';
import Redis from 'ioredis';

import { LoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface EnqueueParams {
  tenantId: string;
  campaignId: string;
  leadId: string;
  phoneNumber: string;
  priority?: number;
}

export interface DequeueParams {
  tenantId: string;
  campaignId: string;
  agentId: string;
}

export interface SkipParams {
  tenantId: string;
  campaignId: string;
  queueEntryId: string;
  skippedReason: string;
}

export interface RequeueParams {
  tenantId: string;
  campaignId: string;
  queueEntryId: string;
}

export interface QueueStats {
  pending: number;
  dialing: number;
  completed: number;
  skipped: number;
}

export type CampaignDialQueueEntry = Prisma.CampaignDialQueueGetPayload<Record<string, never>>;

const REDIS_KEY_PREFIX = 'campaign-dialer';
const PRIORITY_MULTIPLIER = 1e10;
const LOCK_TTL_SECONDS = 10;
const MAX_DEQUEUE_ATTEMPTS = 10;

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    @Inject('REDIS_CLIENT') redis: Redis,
  ) {
    this.redis = redis;
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }

  private getQueueKey(tenantId: string, campaignId: string): string {
    return `${REDIS_KEY_PREFIX}:${tenantId}:${campaignId}`;
  }

  private getActiveKey(tenantId: string, campaignId: string): string {
    return `${REDIS_KEY_PREFIX}:active:${tenantId}:${campaignId}`;
  }

  private getLockKey(tenantId: string, campaignId: string, leadId: string): string {
    return `${REDIS_KEY_PREFIX}:lock:${tenantId}:${campaignId}:${leadId}`;
  }

  private computeScore(priority: number, queuedAt: Date): number {
    return -priority * PRIORITY_MULTIPLIER + queuedAt.getTime();
  }

  private async acquireLock(lockKey: string): Promise<boolean> {
    const result = await this.redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    return result === 'OK';
  }

  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  async enqueue(params: EnqueueParams): Promise<CampaignDialQueueEntry> {
    const { tenantId, campaignId, leadId, phoneNumber } = params;
    const priority = params.priority ?? 0;
    const lockKey = this.getLockKey(tenantId, campaignId, leadId);

    const locked = await this.acquireLock(lockKey);
    if (!locked) {
      throw new ConflictException('Lead is already being enqueued');
    }

    try {
      const existing = await this.prisma.campaignDialQueue.findFirst({
        where: { tenantId, campaignId, leadId, status: 'pending' },
      });

      if (existing) {
        throw new ConflictException('Lead is already queued in this campaign');
      }

      const entry = await this.prisma.campaignDialQueue.create({
        data: {
          tenantId,
          campaignId,
          leadId,
          phoneNumber,
          priority,
          status: 'pending',
        },
      });

      const score = this.computeScore(priority, entry.queuedAt);
      await this.redis.zadd(this.getQueueKey(tenantId, campaignId), score, entry.id);
      await this.redis.sadd(this.getActiveKey(tenantId, campaignId), leadId);

      this.logger.log('Lead enqueued', 'QueueService', { queueEntryId: entry.id, tenantId, campaignId, leadId, priority });
      return entry;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  async dequeue(params: DequeueParams): Promise<CampaignDialQueueEntry | null> {
    const { tenantId, campaignId, agentId } = params;
    const queueKey = this.getQueueKey(tenantId, campaignId);

    for (let attempt = 0; attempt < MAX_DEQUEUE_ATTEMPTS; attempt++) {
      const result = await this.redis.zpopmin(queueKey);
      if (!result || result.length === 0) {
        return null;
      }

      const queueEntryId = result[0];

      const updated = await this.prisma.campaignDialQueue.updateMany({
        where: { id: queueEntryId, tenantId, campaignId, status: 'pending' },
        data: { status: 'dialing', agentId, dialedAt: new Date() },
      });

      if (updated.count === 1) {
        const entry = await this.prisma.campaignDialQueue.findFirst({
          where: { id: queueEntryId, tenantId },
        });

        if (entry) {
          await this.redis.srem(this.getActiveKey(tenantId, campaignId), entry.leadId);
          await this.prisma.agentPresence.updateMany({
            where: { tenantId, agentId },
            data: { currentQueueId: queueEntryId },
          }).catch(() => null);
        }

        this.logger.log('Lead dequeued', 'QueueService', { queueEntryId, tenantId, campaignId, agentId });
        return entry;
      }

      this.logger.warn('Queue entry already claimed, trying next', 'QueueService', { queueEntryId, attempt: attempt + 1 });
    }

    this.logger.warn('Dequeue exhausted max attempts', 'QueueService', { tenantId, campaignId });
    return null;
  }

  async skip(params: SkipParams): Promise<void> {
    const { tenantId, campaignId, queueEntryId, skippedReason } = params;

    const entry = await this.prisma.campaignDialQueue.findFirst({
      where: { id: queueEntryId, tenantId, campaignId },
    });

    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    if (entry.status !== 'pending' && entry.status !== 'dialing') {
      throw new BadRequestException(`Cannot skip entry in status: ${entry.status}`);
    }

    const updated = await this.prisma.campaignDialQueue.updateMany({
      where: { id: queueEntryId, tenantId, campaignId, status: { in: ['pending', 'dialing'] } },
      data: { status: 'skipped', skippedReason },
    });

    if (updated.count === 0) {
      throw new ConflictException('Queue entry was concurrently modified');
    }

    await this.redis.zrem(this.getQueueKey(tenantId, campaignId), queueEntryId);
    await this.redis.srem(this.getActiveKey(tenantId, campaignId), entry.leadId);

    this.logger.log('Lead skipped', 'QueueService', { queueEntryId, tenantId, campaignId, skippedReason });
  }

  async requeue(params: RequeueParams): Promise<CampaignDialQueueEntry> {
    const { tenantId, campaignId, queueEntryId } = params;

    const entry = await this.prisma.campaignDialQueue.findFirst({
      where: { id: queueEntryId, tenantId, campaignId },
    });

    if (!entry) {
      throw new NotFoundException('Queue entry not found');
    }

    if (entry.status !== 'dialing' && entry.status !== 'skipped') {
      throw new BadRequestException(`Cannot requeue entry in status: ${entry.status}`);
    }

    const now = new Date();

    const updated = await this.prisma.campaignDialQueue.update({
      where: { id: queueEntryId },
      data: {
        status: 'pending',
        agentId: null,
        dialedAt: null,
        skippedReason: null,
        queuedAt: now,
      },
    });

    const score = this.computeScore(entry.priority, now);
    await this.redis.zadd(this.getQueueKey(tenantId, campaignId), score, queueEntryId);
    await this.redis.sadd(this.getActiveKey(tenantId, campaignId), entry.leadId);

    this.logger.log('Lead requeued', 'QueueService', { queueEntryId, tenantId, campaignId, leadId: entry.leadId });
    return updated;
  }

  async syncQueue(tenantId: string, campaignId: string): Promise<{ added: number; removed: number }> {
    const queueKey = this.getQueueKey(tenantId, campaignId);

    const dbEntries = await this.prisma.campaignDialQueue.findMany({
      where: { tenantId, campaignId, status: 'pending' },
    });

    const redisMembers = await this.redis.zrange(queueKey, 0, -1);
    const redisMemberSet = new Set(redisMembers);

    let added = 0;
    for (const entry of dbEntries) {
      if (!redisMemberSet.has(entry.id)) {
        const score = this.computeScore(entry.priority, entry.queuedAt);
        await this.redis.zadd(queueKey, score, entry.id);
        added++;
      }
    }

    const dbEntryIds = new Set(dbEntries.map(e => e.id));
    let removed = 0;
    for (const member of redisMembers) {
      if (!dbEntryIds.has(member)) {
        await this.redis.zrem(queueKey, member);
        removed++;
      }
    }

    if (added > 0 || removed > 0) {
      this.logger.log('Queue synchronized', 'QueueService', { tenantId, campaignId, added, removed });
    }

    return { added, removed };
  }

  async getStats(tenantId: string, campaignId: string): Promise<QueueStats> {
    const [pending, dialing, completed, skipped] = await Promise.all([
      this.prisma.campaignDialQueue.count({ where: { tenantId, campaignId, status: 'pending' } }),
      this.prisma.campaignDialQueue.count({ where: { tenantId, campaignId, status: 'dialing' } }),
      this.prisma.campaignDialQueue.count({ where: { tenantId, campaignId, status: 'completed' } }),
      this.prisma.campaignDialQueue.count({ where: { tenantId, campaignId, status: 'skipped' } }),
    ]);

    return { pending, dialing, completed, skipped };
  }
}
