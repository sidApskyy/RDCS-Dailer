import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { AttemptController } from './attempt.controller';
import { AttemptService } from './attempt.service';

@Module({
  imports: [PrismaModule],
  controllers: [AttemptController],
  providers: [AttemptService],
  exports: [AttemptService],
})
export class AttemptModule {}
