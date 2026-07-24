import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CallingWindowService } from '../calling-window/calling-window.service';
import { ConsentService } from '../consent/consent.service';

import { DNCScrubbingService } from './dnc-scrubbing.service';
import { TimezoneService } from './timezone.service';

export interface EligibilityCheckConfig {
  checkDNC: boolean;
  checkConsent: boolean;
  checkCallingWindow: boolean;
  checkTimezone: boolean;
  campaignId?: string;
  timezone?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  rule: string;
  metadata?: any;
}

@Injectable()
export class ComplianceEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dncScrubbing: DNCScrubbingService,
    private readonly consent: ConsentService,
    private readonly callingWindow: CallingWindowService,
    private readonly timezone: TimezoneService,
  ) {}

  async checkLeadEligibility(
    tenantId: string,
    leadId: string,
    phoneNumber: string,
    config: EligibilityCheckConfig,
  ): Promise<EligibilityResult> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      return {
        eligible: false,
        reason: 'Lead not found',
        rule: 'LEAD_NOT_FOUND',
      };
    }

    if (config.checkDNC) {
      const dncResult = await this.dncScrubbing.scrubPhoneNumber(tenantId, phoneNumber, {
        checkTenantDNC: true,
        checkCampaignDNC: !!config.campaignId,
        checkGlobalDNC: true,
        campaignId: config.campaignId,
      });

      if (dncResult.isBlocked) {
        return {
          eligible: false,
          reason: 'Phone number is on DNC list',
          rule: 'DNC_BLOCKED',
          metadata: { lists: dncResult.lists },
        };
      }
    }

    if (config.checkConsent) {
      const consentResult = await this.consent.checkConsent(tenantId, leadId);

      if (!consentResult.hasConsent) {
        return {
          eligible: false,
          reason: 'No valid consent for communication',
          rule: 'CONSENT_MISSING',
          metadata: { consentStatus: consentResult.status },
        };
      }
    }

    if (config.checkCallingWindow) {
      const windowResult = await this.callingWindow.checkCallingWindow(tenantId, new Date());

      if (!windowResult.isInWindow) {
        return {
          eligible: false,
          reason: 'Outside calling window',
          rule: 'OUTSIDE_CALLING_WINDOW',
          metadata: { reason: windowResult.reason },
        };
      }
    }

    if (config.checkTimezone && config.timezone) {
      const isBusinessHours = this.timezone.isBusinessHours(new Date(), config.timezone);
      const isWeekday = this.timezone.isWeekday(new Date(), config.timezone);

      if (!isBusinessHours || !isWeekday) {
        return {
          eligible: false,
          reason: 'Outside business hours in lead timezone',
          rule: 'OUTSIDE_BUSINESS_HOURS',
          metadata: { isBusinessHours, isWeekday, timezone: config.timezone },
        };
      }
    }

    await this.recordEligibilityDecision(tenantId, leadId, config.campaignId || '', phoneNumber, true, 'ELIGIBLE', 'All checks passed');

    return {
      eligible: true,
      reason: 'Lead is eligible for contact',
      rule: 'ELIGIBLE',
    };
  }

  async checkBulkEligibility(
    tenantId: string,
    leads: Array<{ id: string; phoneNumber: string; timezone?: string }>,
    config: EligibilityCheckConfig,
  ): Promise<Map<string, EligibilityResult>> {
    const results = new Map<string, EligibilityResult>();

    for (const lead of leads) {
      const leadConfig = { ...config, timezone: lead.timezone || config.timezone };
      const result = await this.checkLeadEligibility(tenantId, lead.id, lead.phoneNumber, leadConfig);
      results.set(lead.id, result);
    }

    return results;
  }

  private async recordEligibilityDecision(
    tenantId: string,
    leadId: string,
    campaignId: string,
    phoneNumber: string,
    eligible: boolean,
    reason: string,
    rule: string,
    metadata?: any,
  ): Promise<void> {
    await this.prisma.leadEligibilityDecision.create({
      data: {
        tenantId,
        leadId,
        campaignId,
        phoneNumber,
        eligible,
        reason,
        rule,
        metadata,
        evaluatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour cache
      },
    });
  }

  async getCachedEligibility(tenantId: string, leadId: string, campaignId: string): Promise<EligibilityResult | null> {
    const cached = await this.prisma.leadEligibilityDecision.findFirst({
      where: {
        tenantId,
        leadId,
        campaignId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { evaluatedAt: 'desc' },
    });

    if (!cached) {
      return null;
    }

    return {
      eligible: cached.eligible,
      reason: cached.reason,
      rule: cached.rule,
      metadata: cached.metadata,
    };
  }

  async getEligibilityHistory(
    tenantId: string,
    leadId: string,
    params: { skip?: number; take?: number },
  ): Promise<any> {
    const where: any = { tenantId, leadId };

    const [decisions, total] = await Promise.all([
      this.prisma.leadEligibilityDecision.findMany({
        where,
        orderBy: { evaluatedAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.leadEligibilityDecision.count({ where }),
    ]);

    return { decisions, total };
  }

  async getComplianceStatistics(tenantId: string): Promise<{
    totalDecisions: number;
    eligibleCount: number;
    ineligibleCount: number;
    breakdownByRule: Record<string, number>;
  }> {
    const [totalDecisions, eligibleCount, ineligibleCount, breakdownByRule] = await Promise.all([
      this.prisma.leadEligibilityDecision.count({ where: { tenantId } }),
      this.prisma.leadEligibilityDecision.count({ where: { tenantId, eligible: true } }),
      this.prisma.leadEligibilityDecision.count({ where: { tenantId, eligible: false } }),
      this.prisma.leadEligibilityDecision.groupBy({
        by: ['rule'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    const breakdownMap: Record<string, number> = {};
    breakdownByRule.forEach((item) => {
      breakdownMap[item.rule] = item._count;
    });

    return {
      totalDecisions,
      eligibleCount,
      ineligibleCount,
      breakdownByRule: breakdownMap,
    };
  }
}
