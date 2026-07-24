import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateDispositionDto {
  code: string;
  name: string;
  category: 'positive' | 'negative' | 'neutral' | 'callback' | 'dnc';
  outcome: 'terminal' | 'non_terminal';
  retryBehavior?: 'retry_later' | 'retry_immediately' | 'no_retry';
  callbackEligible?: boolean;
  dncBehavior?: 'add_dnc' | 'no_dnc';
  description?: string;
}

export interface UpdateDispositionDto {
  name?: string;
  category?: 'positive' | 'negative' | 'neutral' | 'callback' | 'dnc';
  outcome?: 'terminal' | 'non_terminal';
  retryBehavior?: 'retry_later' | 'retry_immediately' | 'no_retry';
  callbackEligible?: boolean;
  dncBehavior?: 'add_dnc' | 'no_dnc';
  description?: string;
  isActive?: boolean;
}

@Injectable()
export class DispositionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDispositionDto, userId: string): Promise<any> {
    const existing = await this.prisma.disposition.findFirst({
      where: { tenantId, code: dto.code },
    });

    if (existing) {
      throw new BadRequestException('Disposition with this code already exists');
    }

    const disposition = await this.prisma.disposition.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        category: dto.category,
        outcome: dto.outcome,
        retryBehavior: dto.retryBehavior,
        callbackEligible: dto.callbackEligible || false,
        dncBehavior: dto.dncBehavior,
        description: dto.description,
        createdBy: userId,
      },
    });

    return disposition;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const disposition = await this.prisma.disposition.findFirst({
      where: { tenantId, id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        campaigns: { include: { campaign: true } },
        leadDispositions: { take: 5, orderBy: { appliedAt: 'desc' } },
      },
    });

    if (!disposition) {
      throw new NotFoundException('Disposition not found');
    }

    return disposition;
  }

  async findByCode(tenantId: string, code: string): Promise<any> {
    const disposition = await this.prisma.disposition.findFirst({
      where: { tenantId, code },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!disposition) {
      throw new NotFoundException('Disposition not found');
    }

    return disposition;
  }

  async findAll(tenantId: string, params: { category?: string; isActive?: boolean; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId };
    if (params.category) where.category = params.category;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [dispositions, total] = await Promise.all([
      this.prisma.disposition.findMany({
        where,
        include: {
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.disposition.count({ where }),
    ]);

    return { dispositions, total };
  }

  async update(tenantId: string, id: string, dto: UpdateDispositionDto): Promise<any> {
    await this.findById(tenantId, id);

    const updated = await this.prisma.disposition.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<any> {
    const disposition = await this.findById(tenantId, id);

    if (disposition.campaigns.length > 0) {
      throw new BadRequestException('Cannot delete disposition used by campaigns');
    }

    await this.prisma.disposition.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async attachToCampaign(tenantId: string, dispositionId: string, campaignId: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const existing = await this.prisma.campaignDisposition.findUnique({
      where: {
        campaignId_dispositionId: { campaignId, dispositionId },
      },
    });

    if (existing) {
      throw new BadRequestException('Disposition already attached to campaign');
    }

    const attachment = await this.prisma.campaignDisposition.create({
      data: { campaignId, dispositionId },
    });

    return attachment;
  }

  async detachFromCampaign(tenantId: string, dispositionId: string, campaignId: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaignDisposition.delete({
      where: {
        campaignId_dispositionId: { campaignId, dispositionId },
      },
    });

    return { success: true };
  }

  async applyToLead(tenantId: string, leadId: string, dispositionId: string, phoneNumber: string, notes: string, userId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const leadDisposition = await this.prisma.leadDisposition.create({
      data: {
        tenantId,
        leadId,
        campaignId: lead.campaignId,
        dispositionId,
        phoneNumber,
        notes,
        appliedBy: userId,
      },
    });

    return leadDisposition;
  }
}
