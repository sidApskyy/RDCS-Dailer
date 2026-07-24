import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateLeadDto {
  leadListId?: string;
  campaignId?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  timezone?: string;
  customFields?: any;
  phones: Array<{ phoneNumber: string; type?: string; isPrimary?: boolean }>;
}

export interface UpdateLeadDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  timezone?: string;
  customFields?: any;
}

export interface LeadTransitionDto {
  status: 'new' | 'eligible' | 'assigned' | 'in_progress' | 'callback' | 'contacted' | 'not_contacted' | 'dnc' | 'disqualified' | 'converted' | 'exhausted' | 'archived';
}

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLeadDto, userId: string): Promise<any> {
    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        leadListId: dto.leadListId,
        campaignId: dto.campaignId,
        externalId: dto.externalId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        timezone: dto.timezone || 'UTC',
        customFields: dto.customFields,
        status: 'new',
        createdBy: userId,
        phones: {
          create: dto.phones.map(phone => ({
            tenantId,
            phoneNumber: phone.phoneNumber,
            type: phone.type || 'mobile',
            isPrimary: phone.isPrimary || false,
            isValid: true,
          })),
        },
      },
      include: { phones: true },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'lead.created',
        resource: 'Lead',
        resourceId: lead.id,
        metadata: { externalId: lead.externalId, phoneCount: dto.phones.length },
      },
    });

    return lead;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        organization: true,
        leadList: true,
        campaign: true,
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTeam: { select: { id: true, name: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        phones: true,
        consents: true,
        dispositions: { include: { disposition: true } },
        callbacks: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async findAll(tenantId: string, params: { status?: string; campaignId?: string; leadListId?: string; assignedTo?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId, deletedAt: null };
    if (params.status) where.status = params.status;
    if (params.campaignId) where.campaignId = params.campaignId;
    if (params.leadListId) where.leadListId = params.leadListId;
    if (params.assignedTo) where.assignedTo = params.assignedTo;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          phones: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          campaign: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, userId: string): Promise<any> {
    const lead = await this.findById(tenantId, id);

    const updated = await this.prisma.lead.update({
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
        action: 'lead.updated',
        resource: 'Lead',
        resourceId: lead.id,
        metadata: { externalId: lead.externalId, changes: Object.keys(dto) },
      },
    });

    return updated;
  }

  async transitionStatus(tenantId: string, id: string, dto: LeadTransitionDto, userId: string): Promise<any> {
    const lead = await this.findById(tenantId, id);
    const currentStatus = lead.status;
    const newStatus = dto.status;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }

    const updated = await this.prisma.lead.update({
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
        action: 'lead.status_transitioned',
        resource: 'Lead',
        resourceId: lead.id,
        metadata: { externalId: lead.externalId, from: currentStatus, to: newStatus },
      },
    });

    return updated;
  }

  private isValidTransition(current: string, next: string): boolean {
    const transitions: Record<string, string[]> = {
      new: ['eligible', 'dnc', 'disqualified', 'archived'],
      eligible: ['assigned', 'dnc', 'disqualified', 'archived'],
      assigned: ['in_progress', 'eligible', 'dnc', 'disqualified', 'archived'],
      in_progress: ['callback', 'contacted', 'not_contacted', 'assigned', 'dnc', 'disqualified', 'converted', 'exhausted', 'archived'],
      callback: ['in_progress', 'eligible', 'dnc', 'disqualified', 'archived'],
      contacted: ['converted', 'callback', 'exhausted', 'archived'],
      not_contacted: ['callback', 'eligible', 'exhausted', 'archived'],
      dnc: ['archived'],
      disqualified: ['archived'],
      converted: ['archived'],
      exhausted: ['archived'],
      archived: [],
    };

    return transitions[current]?.includes(next) || false;
  }

  async delete(tenantId: string, id: string, userId: string): Promise<any> {
    const lead = await this.findById(tenantId, id);

    if (lead.status === 'assigned' || lead.status === 'in_progress') {
      throw new BadRequestException('Cannot delete lead that is currently being worked on');
    }

    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action: 'lead.deleted',
        resource: 'Lead',
        resourceId: lead.id,
        metadata: { externalId: lead.externalId },
      },
    });

    return { success: true };
  }
}
