import { Module } from '@nestjs/common';
import Redis from 'ioredis';

import { LoggerModule } from '../../common/logger/logger.module';
import { PrismaModule } from '../../prisma/prisma.module';

import { QueueService } from './queue.service';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error('REDIS_URL is required');
        }
        return new Redis(redisUrl, { lazyConnect: true });
      },
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class CampaignDialerModule {}
