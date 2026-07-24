import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { DeduplicationService } from './deduplication.service';
import { LeadAssignmentService } from './lead-assignment.service';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';


@Module({
  imports: [PrismaModule],
  controllers: [LeadController],
  providers: [LeadService, LeadAssignmentService, DeduplicationService],
  exports: [LeadService, LeadAssignmentService, DeduplicationService],
})
export class LeadModule {}
