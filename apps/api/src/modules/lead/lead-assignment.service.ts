import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface AssignLeadDto {
  userId?: string;
  teamId?: string;
}

export interface ReassignLeadDto {
  userId?: string;
  teamId?: string;
}

@Injectable()
export class LeadAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assignLead(tenantId: string, leadId: string, dto: AssignLeadDto, userId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!dto.userId && !dto.teamId) {
      throw new BadRequestException('Either userId or teamId must be provided');
    }

    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { tenantId, id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    if (dto.teamId) {
      const team = await this.prisma.organization.findFirst({
        where: { tenantId, id: dto.teamId },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedTo: dto.userId || null,
        assignedTeamId: dto.teamId || null,
        assignedAt: new Date(),
        status: 'assigned',
        updatedBy: userId,
      },
    });

    return updated;
  }

  async reassignLead(tenantId: string, leadId: string, dto: ReassignLeadDto, userId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.assignedTo && !lead.assignedTeamId) {
      throw new BadRequestException('Lead is not assigned');
    }

    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { tenantId, id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    if (dto.teamId) {
      const team = await this.prisma.organization.findFirst({
        where: { tenantId, id: dto.teamId },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedTo: dto.userId || null,
        assignedTeamId: dto.teamId || null,
        assignedAt: new Date(),
        updatedBy: userId,
      },
    });

    return updated;
  }

  async unassignLead(tenantId: string, leadId: string, userId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.assignedTo && !lead.assignedTeamId) {
      throw new BadRequestException('Lead is not assigned');
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedTo: null,
        assignedTeamId: null,
        assignedAt: null,
        status: 'eligible',
        updatedBy: userId,
      },
    });

    return updated;
  }

  async bulkAssign(tenantId: string, leadIds: string[], dto: AssignLeadDto, userId: string): Promise<any> {
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { tenantId, id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    if (dto.teamId) {
      const team = await this.prisma.organization.findFirst({
        where: { tenantId, id: dto.teamId },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }
    }

    const result = await this.prisma.lead.updateMany({
      where: {
        tenantId,
        id: { in: leadIds },
        deletedAt: null,
      },
      data: {
        assignedTo: dto.userId || null,
        assignedTeamId: dto.teamId || null,
        assignedAt: new Date(),
        status: 'assigned',
        updatedBy: userId,
      },
    });

    return { count: result.count };
  }

  async getAssignmentHistory(tenantId: string, leadId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTeam: { select: { id: true, name: true, type: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return {
      currentAssignment: {
        assignedTo: lead.assignee,
        assignedTeam: lead.assignedTeam,
        assignedAt: lead.assignedAt,
      },
    };
  }

  async getAssignedLeads(tenantId: string, userId: string, params: { status?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId, assignedTo: userId, deletedAt: null };
    if (params.status) where.status = params.status;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          phones: true,
          assignedTeam: { select: { id: true, name: true } },
        },
        orderBy: { assignedAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  async getTeamLeads(tenantId: string, teamId: string, params: { status?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId, assignedTeamId: teamId, deletedAt: null };
    if (params.status) where.status = params.status;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          phones: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { assignedAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }
}
