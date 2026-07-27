import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';

import { MockTelephonyAdapter } from './mock-telephony.adapter';
import { TelephonySocketService } from './telephony-socket.service';
import { TELEPHONY_ADAPTER } from './telephony.adapter';
import { TelephonyController } from './telephony.controller';
import { TelephonyEvents } from './telephony.events';
import { TelephonyService } from './telephony.service';

@Module({
  imports: [PrismaModule, ComplianceModule, AuthModule],
  controllers: [TelephonyController],
  providers: [TelephonyEvents, TelephonyService, TelephonySocketService, MockTelephonyAdapter, { provide: TELEPHONY_ADAPTER, useExisting: MockTelephonyAdapter }],
  exports: [TelephonyService, TelephonyEvents],
})
export class TelephonyModule {}
