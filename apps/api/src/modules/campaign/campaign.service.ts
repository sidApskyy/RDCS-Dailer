import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateCampaignDto {
  name: string;
  description?: string;
  slug: string;
  type?: string;
  purpose?: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  priority?: number;
  settings?: any;
  organizationId?: string;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  type?: string;
  purpose?: string;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
  priority?: number;
  settings?: any;
  organizationId?: string;
}

export interface CampaignTransitionDto {
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
}

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCampaignDto, userId: string): Promise<any> {
    const existing = await this.prisma.campaign.findFirst({
      where: { tenantId, slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException('Campaign with this slug already exists');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description,
        slug: dto.slug,
        type: dto.type || 'outbound',
        purpose: dto.purpose,
        startDate: dto.startDate,
        endDate: dto.endDate,
        timezone: dto.timezone || 'UTC',
        priority: dto.priority || 0,
        settings: dto.settings,
        createdBy: userId,
      },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'campaign.created',
        resource: 'Campaign',
        resourceId: campaign.id,
        metadata: { name: campaign.name, slug: campaign.slug },
      },
    });

    return campaign;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id },
      include: {
        organization: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        leadLists: { include: { leadList: true } },
        schedules: true,
        callerIds: true,
        dispositions: { include: { disposition: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async findBySlug(tenantId: string, slug: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, slug },
      include: {
        organization: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        leadLists: { include: { leadList: true } },
        schedules: true,
        callerIds: true,
        dispositions: { include: { disposition: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async findAll(tenantId: string, params: { status?: string; organizationId?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId };
    if (params.status) where.status = params.status;
    if (params.organizationId) where.organizationId = params.organizationId;

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          organization: true,
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { campaigns, total };
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto, userId: string): Promise<any> {
    const campaign = await this.findById(tenantId, id);

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be modified');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        updatedBy: userId,
      },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'campaign.updated',
        resource: 'Campaign',
        resourceId: campaign.id,
        metadata: { name: campaign.name, changes: Object.keys(dto) },
      },
    });

    return updated;
  }

  async transitionStatus(tenantId: string, id: string, dto: CampaignTransitionDto, userId: string): Promise<any> {
    const campaign = await this.findById(tenantId, id);
    const currentStatus = campaign.status;
    const newStatus = dto.status;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: newStatus,
        updatedBy: userId,
      },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'campaign.status_transitioned',
        resource: 'Campaign',
        resourceId: campaign.id,
        metadata: { name: campaign.name, from: currentStatus, to: newStatus },
      },
    });

    return updated;
  }

  private isValidTransition(current: string, next: string): boolean {
    const transitions: Record<string, string[]> = {
      draft: ['active', 'archived'],
      active: ['paused', 'completed', 'archived'],
      paused: ['active', 'completed', 'archived'],
      completed: ['archived'],
      archived: [],
    };

    return transitions[current]?.includes(next) || false;
  }

  async delete(tenantId: string, id: string): Promise<any> {
    const campaign = await this.findById(tenantId, id);

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Only draft campaigns can be deleted');
    }

    await this.prisma.campaign.delete({
      where: { id },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId: campaign.createdBy,
        action: 'campaign.deleted',
        resource: 'Campaign',
        resourceId: campaign.id,
        metadata: { name: campaign.name },
      },
    });

    return { success: true };
  }

  async archive(tenantId: string, id: string, userId: string): Promise<any> {
    const campaign = await this.findById(tenantId, id);

    if (campaign.status === 'archived') {
      throw new BadRequestException('Campaign is already archived');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'archived',
        updatedBy: userId,
      },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'campaign.archived',
        resource: 'Campaign',
        resourceId: campaign.id,
        metadata: { name: campaign.name, previousStatus: campaign.status },
      },
    });

    return updated;
  }
}
