import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { CallbackController } from './callback.controller';
import { CallbackService } from './callback.service';

@Module({
  imports: [PrismaModule],
  controllers: [CallbackController],
  providers: [CallbackService],
  exports: [CallbackService],
})
export class CallbackModule {}
