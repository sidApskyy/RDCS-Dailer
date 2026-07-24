import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface ScrubbingResult {
  isBlocked: boolean;
  reason?: string;
  lists?: Array<{ id: string; name: string; type: string }>;
}

export interface ScrubbingConfig {
  checkTenantDNC: boolean;
  checkCampaignDNC: boolean;
  checkGlobalDNC: boolean;
  campaignId?: string;
}

@Injectable()
export class DNCScrubbingService {
  constructor(private readonly prisma: PrismaService) {}

  async scrubPhoneNumber(
    tenantId: string,
    phoneNumber: string,
    config: ScrubbingConfig,
  ): Promise<ScrubbingResult> {
    const where: any = {
      tenantId,
      phoneNumber,
      dncList: { isActive: true },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (config.checkTenantDNC) {
      where.dncList.type = 'tenant';
    } else if (config.checkCampaignDNC && config.campaignId) {
      where.dncList.type = 'campaign';
    } else if (config.checkGlobalDNC) {
      where.dncList.type = 'global';
    }

    const entries = await this.prisma.dNCEntry.findMany({
      where,
      include: {
        dncList: { select: { id: true, name: true, type: true } },
      },
    });

    if (entries.length > 0) {
      return {
        isBlocked: true,
        reason: 'Phone number is on DNC list',
        lists: entries.map((e: any) => ({ id: e.dncList.id, name: e.dncList.name, type: e.dncList.type })),
      };
    }

    return { isBlocked: false };
  }

  async scrubPhoneNumbers(
    tenantId: string,
    phoneNumbers: string[],
    config: ScrubbingConfig,
  ): Promise<Map<string, ScrubbingResult>> {
    const results = new Map<string, ScrubbingResult>();

    for (const phoneNumber of phoneNumbers) {
      const result = await this.scrubPhoneNumber(tenantId, phoneNumber, config);
      results.set(phoneNumber, result);
    }

    return results;
  }

  async scrubLead(tenantId: string, leadId: string, config: ScrubbingConfig): Promise<ScrubbingResult> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
      include: { phones: true },
    });

    if (!lead) {
      return { isBlocked: false, reason: 'Lead not found' };
    }

    for (const phone of lead.phones) {
      const result = await this.scrubPhoneNumber(tenantId, phone.phoneNumber, config);
      if (result.isBlocked) {
        return result;
      }
    }

    return { isBlocked: false };
  }

  async scrubLeads(
    tenantId: string,
    leadIds: string[],
    config: ScrubbingConfig,
  ): Promise<Map<string, ScrubbingResult>> {
    const results = new Map<string, ScrubbingResult>();

    for (const leadId of leadIds) {
      const result = await this.scrubLead(tenantId, leadId, config);
      results.set(leadId, result);
    }

    return results;
  }

  async getDNCStatistics(tenantId: string): Promise<{
    totalLists: number;
    activeLists: number;
    totalEntries: number;
    entriesByType: Record<string, number>;
  }> {
    const [totalLists, activeLists, totalEntries] = await Promise.all([
      this.prisma.dNCList.count({ where: { tenantId } }),
      this.prisma.dNCList.count({ where: { tenantId, isActive: true } }),
      this.prisma.dNCEntry.count({ where: { tenantId } }),
      this.prisma.dNCEntry.groupBy({
        by: ['dncListId'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    const typeCounts = await this.prisma.dNCList.findMany({
      where: { tenantId },
      select: { type: true, entryCount: true },
    });

    const entriesByTypeMap: Record<string, number> = {};
    typeCounts.forEach((list) => {
      entriesByTypeMap[list.type] = (entriesByTypeMap[list.type] || 0) + list.entryCount;
    });

    return {
      totalLists,
      activeLists,
      totalEntries,
      entriesByType: entriesByTypeMap,
    };
  }
}
