import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { DispositionController } from './disposition.controller';
import { DispositionService } from './disposition.service';

@Module({
  imports: [PrismaModule],
  controllers: [DispositionController],
  providers: [DispositionService],
  exports: [DispositionService],
})
export class DispositionModule {}
