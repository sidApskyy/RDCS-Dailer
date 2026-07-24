import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { DNCController } from './dnc.controller';
import { DNCService } from './dnc.service';

@Module({
  imports: [PrismaModule],
  controllers: [DNCController],
  providers: [DNCService],
  exports: [DNCService],
})
export class DNCModule {}
