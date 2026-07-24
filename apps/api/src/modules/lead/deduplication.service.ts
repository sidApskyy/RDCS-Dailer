import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateType?: 'hard' | 'possible' | 'allowed';
  existingLeadId?: string;
  reason?: string;
}

export interface DeduplicationConfig {
  checkPhone: boolean;
  checkEmail: boolean;
  checkExternalId: boolean;
  scope: 'lead_list' | 'campaign' | 'tenant';
}

@Injectable()
export class DeduplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async checkDuplicate(
    tenantId: string,
    leadListId: string,
    data: {
      phoneNumber?: string;
      email?: string;
      externalId?: string;
    },
    config: DeduplicationConfig,
  ): Promise<DeduplicationResult> {
    if (config.checkPhone && data.phoneNumber) {
      const phoneResult = await this.checkPhoneDuplicate(tenantId, leadListId, data.phoneNumber, config.scope);
      if (phoneResult.isDuplicate) {
        return phoneResult;
      }
    }

    if (config.checkEmail && data.email) {
      const emailResult = await this.checkEmailDuplicate(tenantId, leadListId, data.email, config.scope);
      if (emailResult.isDuplicate) {
        return emailResult;
      }
    }

    if (config.checkExternalId && data.externalId) {
      const externalIdResult = await this.checkExternalIdDuplicate(tenantId, leadListId, data.externalId, config.scope);
      if (externalIdResult.isDuplicate) {
        return externalIdResult;
      }
    }

    return { isDuplicate: false };
  }

  private async checkPhoneDuplicate(
    tenantId: string,
    leadListId: string,
    phoneNumber: string,
    scope: 'lead_list' | 'campaign' | 'tenant',
  ): Promise<DeduplicationResult> {
    const where: any = { tenantId, phoneNumber };

    if (scope === 'lead_list') {
      where.leadListId = leadListId;
    } else if (scope === 'campaign') {
      const leadList = await this.prisma.leadList.findUnique({
        where: { id: leadListId },
        include: { campaigns: { include: { campaign: true } } },
      });

      if (leadList && leadList.campaigns.length > 0) {
        const campaignIds = leadList.campaigns.map(c => c.campaignId);
        where.campaignId = { in: campaignIds };
      }
    }

    const existingPhone = await this.prisma.leadPhone.findFirst({
      where,
      include: { lead: true },
    });

    if (existingPhone) {
      return {
        isDuplicate: true,
        duplicateType: 'hard',
        existingLeadId: existingPhone.leadId,
        reason: 'Phone number already exists',
      };
    }

    return { isDuplicate: false };
  }

  private async checkEmailDuplicate(
    tenantId: string,
    leadListId: string,
    email: string,
    scope: 'lead_list' | 'campaign' | 'tenant',
  ): Promise<DeduplicationResult> {
    const where: any = { tenantId, email };

    if (scope === 'lead_list') {
      where.leadListId = leadListId;
    } else if (scope === 'campaign') {
      const leadList = await this.prisma.leadList.findUnique({
        where: { id: leadListId },
        include: { campaigns: { include: { campaign: true } } },
      });

      if (leadList && leadList.campaigns.length > 0) {
        const campaignIds = leadList.campaigns.map(c => c.campaignId);
        where.campaignId = { in: campaignIds };
      }
    }

    const existingLead = await this.prisma.lead.findFirst({ where });

    if (existingLead) {
      return {
        isDuplicate: true,
        duplicateType: 'possible',
        existingLeadId: existingLead.id,
        reason: 'Email already exists',
      };
    }

    return { isDuplicate: false };
  }

  private async checkExternalIdDuplicate(
    tenantId: string,
    leadListId: string,
    externalId: string,
    scope: 'lead_list' | 'campaign' | 'tenant',
  ): Promise<DeduplicationResult> {
    const where: any = { tenantId, externalId };

    if (scope === 'lead_list') {
      where.leadListId = leadListId;
    } else if (scope === 'campaign') {
      const leadList = await this.prisma.leadList.findUnique({
        where: { id: leadListId },
        include: { campaigns: { include: { campaign: true } } },
      });

      if (leadList && leadList.campaigns.length > 0) {
        const campaignIds = leadList.campaigns.map(c => c.campaignId);
        where.campaignId = { in: campaignIds };
      }
    }

    const existingLead = await this.prisma.lead.findFirst({ where });

    if (existingLead) {
      return {
        isDuplicate: true,
        duplicateType: 'hard',
        existingLeadId: existingLead.id,
        reason: 'External ID already exists',
      };
    }

    return { isDuplicate: false };
  }
}
