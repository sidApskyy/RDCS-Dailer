import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateCallbackDto {
  leadId: string;
  campaignId?: string;
  phoneNumber?: string;
  scheduledFor: Date;
  assignedTo?: string;
  assignedTeamId?: string;
  notes?: string;
  priority?: number;
}

export interface UpdateCallbackDto {
  scheduledFor?: Date;
  assignedTo?: string;
  assignedTeamId?: string;
  notes?: string;
  priority?: number;
  status?: 'pending' | 'completed' | 'cancelled' | 'missed';
}

@Injectable()
export class CallbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCallbackDto, userId: string): Promise<any> {
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

    if (dto.assignedTo) {
      const user = await this.prisma.user.findFirst({
        where: { tenantId, id: dto.assignedTo },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    if (dto.assignedTeamId) {
      const team = await this.prisma.organization.findFirst({
        where: { tenantId, id: dto.assignedTeamId },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    const callback = await this.prisma.callback.create({
      data: {
        tenantId,
        leadId: dto.leadId,
        campaignId: dto.campaignId,
        phoneNumber: dto.phoneNumber,
        scheduledFor: dto.scheduledFor,
        scheduledBy: userId,
        assignedTo: dto.assignedTo,
        assignedTeamId: dto.assignedTeamId,
        notes: dto.notes,
        priority: dto.priority || 0,
        status: 'pending',
      },
    });

    await this.prisma.lead.update({
      where: { id: dto.leadId },
      data: { status: 'callback' },
    });

    return callback;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const callback = await this.prisma.callback.findFirst({
      where: { tenantId, id },
      include: {
        lead: { include: { phones: true } },
        campaign: true,
        scheduler: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTeam: { select: { id: true, name: true, type: true } },
      },
    });

    if (!callback) {
      throw new NotFoundException('Callback not found');
    }

    return callback;
  }

  async findAll(tenantId: string, params: { status?: string; assignedTo?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId };
    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedTo = params.assignedTo;

    const [callbacks, total] = await Promise.all([
      this.prisma.callback.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true } },
          campaign: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.callback.count({ where }),
    ]);

    return { callbacks, total };
  }

  async getDueCallbacks(tenantId: string, params: { assignedTo?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = {
      tenantId,
      status: 'pending',
      scheduledFor: { lte: new Date() },
    };
    if (params.assignedTo) where.assignedTo = params.assignedTo;

    const [callbacks, total] = await Promise.all([
      this.prisma.callback.findMany({
        where,
        include: {
          lead: { include: { phones: true } },
          campaign: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.callback.count({ where }),
    ]);

    return { callbacks, total };
  }

  async update(tenantId: string, id: string, dto: UpdateCallbackDto): Promise<any> {
    const callback = await this.findById(tenantId, id);

    if (callback.status === 'completed' || callback.status === 'cancelled') {
      throw new BadRequestException('Cannot update completed or cancelled callback');
    }

    const updated = await this.prisma.callback.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async complete(tenantId: string, id: string): Promise<any> {
    const callback = await this.findById(tenantId, id);

    if (callback.status !== 'pending') {
      throw new BadRequestException('Callback is not pending');
    }

    const updated = await this.prisma.callback.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    return updated;
  }

  async cancel(tenantId: string, id: string): Promise<any> {
    const callback = await this.findById(tenantId, id);

    if (callback.status === 'completed' || callback.status === 'cancelled') {
      throw new BadRequestException('Callback is already completed or cancelled');
    }

    const updated = await this.prisma.callback.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<any> {
    const callback = await this.findById(tenantId, id);

    if (callback.status === 'completed') {
      throw new BadRequestException('Cannot delete completed callback');
    }

    await this.prisma.callback.delete({
      where: { id },
    });

    return { success: true };
  }
}
