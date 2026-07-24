import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface ComplianceEvent {
  eventType: string;
  tenantId: string;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  metadata?: any;
  outcome: 'passed' | 'failed' | 'warning';
  reason?: string;
}

export interface ComplianceAuditReport {
  tenantId: string;
  period: { start: Date; end: Date };
  totalEvents: number;
  passedEvents: number;
  failedEvents: number;
  warningEvents: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  topViolations: Array<{ rule: string; count: number }>;
}

@Injectable()
export class ComplianceAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(event: ComplianceEvent): Promise<void> {
    await this.prisma.audit.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        action: event.eventType,
        resource: event.resourceType || 'compliance',
        resourceId: event.resourceId,
        metadata: {
          ...event.metadata,
          outcome: event.outcome,
          reason: event.reason,
        },
        ipAddress: null,
        userAgent: null,
      },
    });
  }

  async recordDNCViolation(tenantId: string, userId: string, phoneNumber: string, campaignId?: string): Promise<void> {
    await this.recordEvent({
      eventType: 'compliance.dnc_violation',
      tenantId,
      userId,
      resourceId: phoneNumber,
      resourceType: 'phone',
      metadata: { phoneNumber, campaignId },
      outcome: 'failed',
      reason: 'Attempted to call DNC number',
    });
  }

  async recordConsentViolation(tenantId: string, userId: string, leadId: string, phoneNumber: string): Promise<void> {
    await this.recordEvent({
      eventType: 'compliance.consent_violation',
      tenantId,
      userId,
      resourceId: leadId,
      resourceType: 'lead',
      metadata: { leadId, phoneNumber },
      outcome: 'failed',
      reason: 'Attempted to contact without consent',
    });
  }

  async recordCallingWindowViolation(tenantId: string, userId: string, leadId: string): Promise<void> {
    await this.recordEvent({
      eventType: 'compliance.calling_window_violation',
      tenantId,
      userId,
      resourceId: leadId,
      resourceType: 'lead',
      metadata: { leadId },
      outcome: 'failed',
      reason: 'Attempted to call outside calling window',
    });
  }

  async recordEligibilityCheck(
    tenantId: string,
    leadId: string,
    eligible: boolean,
    reason: string,
    rule: string,
  ): Promise<void> {
    await this.recordEvent({
      eventType: 'compliance.eligibility_check',
      tenantId,
      resourceId: leadId,
      resourceType: 'lead',
      metadata: { leadId, eligible, reason, rule },
      outcome: eligible ? 'passed' : 'failed',
      reason,
    });
  }

  async getComplianceEvents(
    tenantId: string,
    params: {
      eventType?: string;
      outcome?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      skip?: number;
      take?: number;
    },
  ): Promise<any> {
    const where: any = { tenantId };
    if (params.eventType) where.action = params.eventType;
    if (params.outcome) where.metadata = { path: ['outcome'], equals: params.outcome };
    if (params.userId) where.userId = params.userId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [events, total] = await Promise.all([
      this.prisma.audit.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.audit.count({ where }),
    ]);

    return { events, total };
  }

  async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceAuditReport> {
    const where: any = {
      tenantId,
      action: { startsWith: 'compliance.' },
      createdAt: { gte: startDate, lte: endDate },
    };

    const [totalEvents, eventsByType, eventsByUser] = await Promise.all([
      this.prisma.audit.count({ where }),
      this.prisma.audit.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      this.prisma.audit.groupBy({
        by: ['userId'],
        where,
        _count: true,
      }),
    ]);

    const typeMap: Record<string, number> = {};
    eventsByType.forEach((item: any) => {
      typeMap[item.action] = item._count;
    });

    const userMap: Record<string, number> = {};
    eventsByUser.forEach((item: any) => {
      userMap[item.userId] = item._count;
    });

    const passedEvents = 0;
    const failedEvents = 0;
    const warningEvents = 0;

    const topViolations: Array<{ rule: string; count: number }> = [];

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      totalEvents,
      passedEvents,
      failedEvents,
      warningEvents,
      eventsByType: typeMap,
      eventsByUser: userMap,
      topViolations,
    };
  }

  async getComplianceScore(tenantId: string, days: number = 30): Promise<{
    score: number;
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    trend: 'improving' | 'declining' | 'stable';
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      tenantId,
      action: { startsWith: 'compliance.' },
      createdAt: { gte: startDate },
    };

    const events = await this.prisma.audit.findMany({
      where,
      select: { metadata: true, createdAt: true },
    });

    const totalChecks = events.length;
    const passedChecks = events.filter((e: any) => e.metadata?.outcome === 'passed').length;
    const failedChecks = events.filter((e: any) => e.metadata?.outcome === 'failed').length;

    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    const midPoint = new Date(startDate);
    midPoint.setDate(midPoint.getDate() + days / 2);

    const firstHalf = events.filter((e: any) => e.createdAt < midPoint);
    const secondHalf = events.filter((e: any) => e.createdAt >= midPoint);

    const firstHalfPassRate = firstHalf.length > 0
      ? firstHalf.filter((e: any) => e.metadata?.outcome === 'passed').length / firstHalf.length
      : 1;
    const secondHalfPassRate = secondHalf.length > 0
      ? secondHalf.filter((e: any) => e.metadata?.outcome === 'passed').length / secondHalf.length
      : 1;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalfPassRate > firstHalfPassRate + 0.05) trend = 'improving';
    else if (secondHalfPassRate < firstHalfPassRate - 0.05) trend = 'declining';

    return {
      score,
      totalChecks,
      passedChecks,
      failedChecks,
      trend,
    };
  }
}
