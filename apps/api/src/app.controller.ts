import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import IORedis from 'ioredis';

import { PrismaService } from './prisma/prisma.service';

@Controller()
@SkipThrottle()
export class AppController {
  private readonly redis: IORedis;
  private readonly startTime: Date;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = process.env.REDIS_URL || (process.env.NODE_ENV === 'production' ? undefined : 'redis://:rdcs@localhost:6379/0');
    if (!redisUrl) {
      throw new Error('REDIS_URL is required in production');
    }
    this.redis = new IORedis(redisUrl, {
      lazyConnect: true,
    });
    this.startTime = new Date();
  }

  @Get('health')
  getHealth(): {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      version: '0.1.0',
    };
  }

  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    dependencies: {
      database: { status: string; latency?: number };
      redis: { status: string; latency?: number };
    };
  }> {
    const dependencies = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const status =
      dependencies.database.status === 'ok' && dependencies.redis.status === 'ok'
        ? 'ready'
        : 'not_ready';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      dependencies,
    };
  }

  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  getLiveness(): {
    status: string;
    timestamp: string;
    uptime: number;
  } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  private async checkDatabase(): Promise<{ status: string; latency?: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latency: Date.now() - start };
    } catch {
      return { status: 'error' };
    }
  }

  private async checkRedis(): Promise<{ status: string; latency?: number }> {
    const start = Date.now();
    try {
      await this.redis.connect();
      await this.redis.ping();
      return { status: 'ok', latency: Date.now() - start };
    } catch {
      return { status: 'error' };
    } finally {
      if (this.redis.status !== 'end') {
        await this.redis.quit().catch(() => undefined);
      }
    }
  }
}
