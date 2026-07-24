import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateLeadListDto {
  name: string;
  description?: string;
  organizationId?: string;
}

export interface UpdateLeadListDto {
  name?: string;
  description?: string;
  organizationId?: string;
  status?: 'active' | 'archived' | 'deleted';
}

@Injectable()
export class LeadListService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLeadListDto, userId: string) {
    const leadList = await this.prisma.leadList.create({
      data: {
        tenantId,
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description,
        status: 'active',
        createdBy: userId,
      },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'lead_list.created',
        resource: 'LeadList',
        resourceId: leadList.id,
        metadata: { name: leadList.name },
      },
    });

    return leadList;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const leadList = await this.prisma.leadList.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        organization: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        campaigns: { include: { campaign: true } },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!leadList) {
      throw new NotFoundException('Lead list not found');
    }

    return leadList;
  }

  async findAll(tenantId: string, params: { status?: string; organizationId?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId, deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.organizationId) where.organizationId = params.organizationId;

    const [leadLists, total] = await Promise.all([
      this.prisma.leadList.findMany({
        where,
        include: {
          organization: true,
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: {
            select: { leads: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.leadList.count({ where }),
    ]);

    return { leadLists, total };
  }

  async update(tenantId: string, id: string, dto: UpdateLeadListDto): Promise<any> {
    const leadList = await this.findById(tenantId, id);

    if (leadList.status === 'deleted') {
      throw new BadRequestException('Cannot update deleted lead list');
    }

    const updated = await this.prisma.leadList.update({
      where: { id },
      data: dto,
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId: leadList.createdBy,
        action: 'lead_list.updated',
        resource: 'LeadList',
        resourceId: leadList.id,
        metadata: { name: leadList.name, changes: Object.keys(dto) },
      },
    });

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<any> {
    const leadList = await this.findById(tenantId, id);

    if (leadList.campaigns.length > 0) {
      throw new BadRequestException('Cannot delete lead list attached to active campaigns');
    }

    await this.prisma.leadList.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId: leadList.createdBy,
        action: 'lead_list.deleted',
        resource: 'LeadList',
        resourceId: leadList.id,
        metadata: { name: leadList.name },
      },
    });

    return { success: true };
  }

  async attachToCampaign(tenantId: string, leadListId: string, campaignId: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const existing = await this.prisma.campaignLeadList.findUnique({
      where: {
        campaignId_leadListId: { campaignId, leadListId },
      },
    });

    if (existing) {
      throw new BadRequestException('Lead list already attached to campaign');
    }

    const attachment = await this.prisma.campaignLeadList.create({
      data: { campaignId, leadListId },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId: campaign.createdBy,
        action: 'lead_list.attached_to_campaign',
        resource: 'CampaignLeadList',
        resourceId: attachment.id,
        metadata: { leadListId, campaignId, campaignName: campaign.name },
      },
    });

    return attachment;
  }

  async detachFromCampaign(tenantId: string, leadListId: string, campaignId: string): Promise<any> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { tenantId, id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaignLeadList.delete({
      where: {
        campaignId_leadListId: { campaignId, leadListId },
      },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId: campaign.createdBy,
        action: 'lead_list.detached_from_campaign',
        resource: 'CampaignLeadList',
        metadata: { leadListId, campaignId, campaignName: campaign.name },
      },
    });

    return { success: true };
  }

  async getStatistics(id: string): Promise<any> {
    const stats = await this.prisma.leadList.findUnique({
      where: { id },
      select: {
        totalRows: true,
        processedRows: true,
        successfulRows: true,
        failedRows: true,
        duplicateRows: true,
        suppressedRows: true,
        _count: {
          select: { leads: true },
        },
      },
    });

    return stats;
  }
}
