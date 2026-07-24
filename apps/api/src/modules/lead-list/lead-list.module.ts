import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { LeadListController } from './lead-list.controller';
import { LeadListService } from './lead-list.service';

@Module({
  imports: [PrismaModule],
  controllers: [LeadListController],
  providers: [LeadListService],
  exports: [LeadListService],
})
export class LeadListModule {}
