import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateDNCListDto {
  name: string;
  description?: string;
  type?: 'tenant' | 'campaign' | 'global';
  scope?: 'all' | 'specific_campaign' | 'specific_purpose';
}

export interface AddDNCEntryDto {
  phoneNumber: string;
  reason?: string;
  source?: string;
  expiresAt?: Date;
}

@Injectable()
export class DNCService {
  constructor(private readonly prisma: PrismaService) {}

  async createList(tenantId: string, dto: CreateDNCListDto, userId: string): Promise<any> {
    const dncList = await this.prisma.dNCList.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        type: dto.type || 'tenant',
        scope: dto.scope || 'all',
        isActive: true,
        entryCount: 0,
        createdBy: userId,
      },
    });

    return dncList;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const dncList = await this.prisma.dNCList.findFirst({
      where: { tenantId, id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        entries: { take: 50, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!dncList) {
      throw new NotFoundException('DNC list not found');
    }

    return dncList;
  }

  async findAll(tenantId: string, params: { type?: string; isActive?: boolean; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId };
    if (params.type) where.type = params.type;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [dncLists, total] = await Promise.all([
      this.prisma.dNCList.findMany({
        where,
        include: {
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.dNCList.count({ where }),
    ]);

    return { dncLists, total };
  }

  async addEntry(tenantId: string, dncListId: string, dto: AddDNCEntryDto, userId: string): Promise<any> {
    const dncList = await this.findById(tenantId, dncListId);

    if (!dncList.isActive) {
      throw new BadRequestException('DNC list is not active');
    }

    const existing = await this.prisma.dNCEntry.findUnique({
      where: {
        dncListId_phoneNumber: { dncListId, phoneNumber: dto.phoneNumber },
      },
    });

    if (existing) {
      throw new BadRequestException('Phone number already in DNC list');
    }

    const entry = await this.prisma.dNCEntry.create({
      data: {
        tenantId,
        dncListId,
        phoneNumber: dto.phoneNumber,
        reason: dto.reason,
        source: dto.source,
        addedBy: userId,
        expiresAt: dto.expiresAt,
      },
    });

    await this.prisma.dNCList.update({
      where: { id: dncListId },
      data: { entryCount: { increment: 1 } },
    });

    return entry;
  }

  async bulkAddEntries(tenantId: string, dncListId: string, phoneNumbers: string[], userId: string): Promise<any> {
    const dncList = await this.findById(tenantId, dncListId);

    if (!dncList.isActive) {
      throw new BadRequestException('DNC list is not active');
    }

    const entries = await Promise.all(
      phoneNumbers.map(async (phoneNumber) => {
        const existing = await this.prisma.dNCEntry.findUnique({
          where: {
            dncListId_phoneNumber: { dncListId, phoneNumber },
          },
        });

        if (existing) {
          return null;
        }

        return this.prisma.dNCEntry.create({
          data: {
            tenantId,
            dncListId,
            phoneNumber,
            source: 'bulk_import',
            addedBy: userId,
          },
        });
      }),
    );

    const createdEntries = entries.filter((e) => e !== null);

    await this.prisma.dNCList.update({
      where: { id: dncListId },
      data: { entryCount: { increment: createdEntries.length } },
    });

    return { count: createdEntries.length, entries: createdEntries };
  }

  async removeEntry(tenantId: string, dncListId: string, entryId: string): Promise<any> {
    const entry = await this.prisma.dNCEntry.findFirst({
      where: { tenantId, id: entryId, dncListId },
    });

    if (!entry) {
      throw new NotFoundException('DNC entry not found');
    }

    await this.prisma.dNCEntry.delete({
      where: { id: entryId },
    });

    await this.prisma.dNCList.update({
      where: { id: dncListId },
      data: { entryCount: { decrement: 1 } },
    });

    return { success: true };
  }

  async checkDNC(tenantId: string, phoneNumber: string): Promise<{ isDNC: boolean; lists: any[] }> {
    const entries = await this.prisma.dNCEntry.findMany({
      where: {
        tenantId,
        phoneNumber,
        dncList: { isActive: true },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        dncList: { select: { id: true, name: true, type: true, scope: true } },
      },
    });

    return {
      isDNC: entries.length > 0,
      lists: entries.map((e) => e.dncList),
    };
  }

  async getEntries(tenantId: string, dncListId: string, params: { skip?: number; take?: number }): Promise<any> {
    await this.findById(tenantId, dncListId);

    const [entries, total] = await Promise.all([
      this.prisma.dNCEntry.findMany({
        where: { tenantId, dncListId },
        include: {
          adder: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.dNCEntry.count({ where: { tenantId, dncListId } }),
    ]);

    return { entries, total };
  }

  async updateList(tenantId: string, id: string, dto: { name?: string; description?: string; isActive?: boolean }): Promise<any> {
    await this.findById(tenantId, id);

    const updated = await this.prisma.dNCList.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async deleteList(tenantId: string, id: string): Promise<any> {
    await this.findById(tenantId, id);

    await this.prisma.dNCList.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }
}
