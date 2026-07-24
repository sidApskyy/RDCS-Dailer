import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { CallingWindowModule } from '../calling-window/calling-window.module';
import { ConsentModule } from '../consent/consent.module';

import { ComplianceAuditService } from './compliance-audit.service';
import { ComplianceEngineService } from './compliance-engine.service';
import { ComplianceController } from './compliance.controller';
import { DNCScrubbingService } from './dnc-scrubbing.service';
import { TimezoneModule } from './timezone.module';


@Module({
  imports: [PrismaModule, TimezoneModule, ConsentModule, CallingWindowModule],
  controllers: [ComplianceController],
  providers: [
    ComplianceEngineService,
    ComplianceAuditService,
    DNCScrubbingService,
  ],
  exports: [
    ComplianceEngineService,
    ComplianceAuditService,
    DNCScrubbingService,
  ],
})
export class ComplianceModule {}
