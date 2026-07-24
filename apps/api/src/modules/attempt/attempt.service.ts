import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAttemptDto {
  leadId: string;
  campaignId?: string;
  phoneNumber: string;
  dispositionId?: string;
  agentId?: string;
  outcome?: string;
  duration?: number;
  recordingUrl?: string;
  notes?: string;
  source?: string;
  providerRef?: string;
}

export interface UpdateAttemptDto {
  dispositionId?: string;
  outcome?: string;
  duration?: number;
  recordingUrl?: string;
  notes?: string;
  endedAt?: Date;
}

@Injectable()
export class AttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateAttemptDto): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: dto.leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({
        where: { tenantId, id: dto.campaignId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    if (dto.agentId) {
      const agent = await this.prisma.user.findFirst({
        where: { tenantId, id: dto.agentId },
      });

      if (!agent) {
        throw new NotFoundException('Agent not found');
      }
    }

    const existingAttempts = await this.prisma.leadAttempt.count({
      where: { tenantId, leadId: dto.leadId },
    });

    const attempt = await this.prisma.leadAttempt.create({
      data: {
        tenantId,
        leadId: dto.leadId,
        campaignId: dto.campaignId,
        phoneNumber: dto.phoneNumber,
        attemptNumber: existingAttempts + 1,
        dispositionId: dto.dispositionId,
        agentId: dto.agentId,
        outcome: dto.outcome,
        duration: dto.duration,
        recordingUrl: dto.recordingUrl,
        notes: dto.notes,
        source: dto.source || 'manual',
        providerRef: dto.providerRef,
        startedAt: new Date(),
      },
    });

    return attempt;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const attempt = await this.prisma.leadAttempt.findFirst({
      where: { tenantId, id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        campaign: { select: { id: true, name: true } },
        disposition: { select: { id: true, code: true, name: true, category: true } },
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return attempt;
  }

  async findByLead(tenantId: string, leadId: string, params: { skip?: number; take?: number }): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const [attempts, total] = await Promise.all([
      this.prisma.leadAttempt.findMany({
        where: { tenantId, leadId },
        include: {
          campaign: { select: { id: true, name: true } },
          disposition: { select: { id: true, code: true, name: true, category: true } },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.leadAttempt.count({ where: { tenantId, leadId } }),
    ]);

    return { attempts, total };
  }

  async findByCampaign(tenantId: string, campaignId: string, params: { skip?: number; take?: number }): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [attempts, total] = await Promise.all([
      this.prisma.leadAttempt.findMany({
        where: { tenantId, campaignId },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true } },
          disposition: { select: { id: true, code: true, name: true, category: true } },
          agent: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.leadAttempt.count({ where: { tenantId, campaignId } }),
    ]);

    return { attempts, total };
  }

  async update(tenantId: string, id: string, dto: UpdateAttemptDto): Promise<any> {
    const attempt = await this.findById(tenantId, id);

    if (attempt.endedAt) {
      throw new BadRequestException('Cannot update completed attempt');
    }

    const updated = await this.prisma.leadAttempt.update({
      where: { id },
      data: {
        ...dto,
        endedAt: dto.endedAt || new Date(),
      },
    });

    return updated;
  }

  async complete(tenantId: string, id: string, dto: UpdateAttemptDto): Promise<any> {
    const attempt = await this.findById(tenantId, id);

    if (attempt.endedAt) {
      throw new BadRequestException('Attempt already completed');
    }

    const updated = await this.prisma.leadAttempt.update({
      where: { id },
      data: {
        ...dto,
        endedAt: new Date(),
      },
    });

    return updated;
  }

  async getAttemptStatistics(tenantId: string, leadId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const [totalAttempts, successfulAttempts, failedAttempts, averageDuration] = await Promise.all([
      this.prisma.leadAttempt.count({ where: { tenantId, leadId } }),
      this.prisma.leadAttempt.count({ where: { tenantId, leadId, outcome: 'connected' } }),
      this.prisma.leadAttempt.count({ where: { tenantId, leadId, outcome: { in: ['no_answer', 'busy', 'voicemail', 'failed'] } } }),
      this.prisma.leadAttempt.aggregate({
        where: { tenantId, leadId, duration: { not: null } },
        _avg: { duration: true },
      }),
    ]);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageDuration: averageDuration._avg.duration || 0,
    };
  }

  async getCampaignStatistics(tenantId: string, campaignId: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [totalAttempts, successfulAttempts, failedAttempts, averageDuration, attemptsByOutcome] = await Promise.all([
      this.prisma.leadAttempt.count({ where: { tenantId, campaignId } }),
      this.prisma.leadAttempt.count({ where: { tenantId, campaignId, outcome: 'connected' } }),
      this.prisma.leadAttempt.count({ where: { tenantId, campaignId, outcome: { in: ['no_answer', 'busy', 'voicemail', 'failed'] } } }),
      this.prisma.leadAttempt.aggregate({
        where: { tenantId, campaignId, duration: { not: null } },
        _avg: { duration: true },
      }),
      this.prisma.leadAttempt.groupBy({
        by: ['outcome'],
        where: { tenantId, campaignId },
        _count: true,
      }),
    ]);

    const outcomeMap: Record<string, number> = {};
    attemptsByOutcome.forEach((item) => {
      outcomeMap[item.outcome || 'unknown'] = item._count;
    });

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageDuration: averageDuration._avg.duration || 0,
      attemptsByOutcome: outcomeMap,
    };
  }
}
