import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DeduplicationService, DeduplicationConfig } from '../lead/deduplication.service';

export interface DeduplicationCheckResult {
  isDuplicate: boolean;
  duplicateType?: 'hard' | 'possible' | 'allowed';
  existingLeadId?: string;
  reason?: string;
}

@Injectable()
export class CsvDeduplicatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deduplicationService: DeduplicationService,
  ) {}

  async checkDuplicate(
    tenantId: string,
    leadListId: string,
    data: {
      phoneNumber?: string;
      email?: string;
      externalId?: string;
    },
  ): Promise<DeduplicationCheckResult> {
    const config: DeduplicationConfig = {
      checkPhone: !!data.phoneNumber,
      checkEmail: !!data.email,
      checkExternalId: !!data.externalId,
      scope: 'lead_list',
    };

    const result = await this.deduplicationService.checkDuplicate(
      tenantId,
      leadListId,
      data,
      config,
    );

    return {
      isDuplicate: result.isDuplicate,
      duplicateType: result.duplicateType,
      existingLeadId: result.existingLeadId,
      reason: result.reason,
    };
  }

  async checkExternalIdDuplicate(tenantId: string, leadListId: string, externalId: string): Promise<boolean> {
    const existing = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        leadListId,
        externalId,
        deletedAt: null,
      },
    });

    return !!existing;
  }

  async checkPhoneDuplicate(tenantId: string, leadListId: string, phoneNumber: string): Promise<boolean> {
    const existing = await this.prisma.leadPhone.findFirst({
      where: {
        tenantId,
        phoneNumber,
        lead: {
          leadListId,
          deletedAt: null,
        },
      },
    });

    return !!existing;
  }
}
