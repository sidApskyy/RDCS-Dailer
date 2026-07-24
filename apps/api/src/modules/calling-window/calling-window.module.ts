import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { TimezoneModule } from '../compliance/timezone.module';

import { CallingWindowController } from './calling-window.controller';
import { CallingWindowService } from './calling-window.service';

@Module({
  imports: [PrismaModule, TimezoneModule],
  controllers: [CallingWindowController],
  providers: [CallingWindowService],
  exports: [CallingWindowService],
})
export class CallingWindowModule {}
