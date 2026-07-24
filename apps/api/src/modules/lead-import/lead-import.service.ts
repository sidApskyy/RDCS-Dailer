import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateImportDto {
  leadListId: string;
  fileName: string;
  fileSize: number;
}

export interface ImportProgress {
  id: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  suppressedRows: number;
  invalidRows: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

@Injectable()
export class LeadImportService {
  constructor(private readonly prisma: PrismaService) {}

  async createImport(tenantId: string, dto: CreateImportDto, userId: string): Promise<any> {
    const leadList = await this.prisma.leadList.findFirst({
      where: { tenantId, id: dto.leadListId, deletedAt: null },
    });

    if (!leadList) {
      throw new NotFoundException('Lead list not found');
    }

    const importRecord = await this.prisma.leadListImport.create({
      data: {
        tenantId,
        leadListId: dto.leadListId,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        status: 'pending',
        createdBy: userId,
      },
    });

    return importRecord;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const importRecord = await this.prisma.leadListImport.findFirst({
      where: { tenantId, id },
      include: {
        leadList: true,
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!importRecord) {
      throw new NotFoundException('Import not found');
    }

    return importRecord;
  }

  async getProgress(tenantId: string, id: string): Promise<ImportProgress> {
    const importRecord = await this.findById(tenantId, id);

    return {
      id: importRecord.id,
      status: importRecord.status,
      totalRows: importRecord.totalRows,
      processedRows: importRecord.processedRows,
      successfulRows: importRecord.successfulRows,
      failedRows: importRecord.failedRows,
      duplicateRows: importRecord.duplicateRows,
      suppressedRows: importRecord.suppressedRows,
      invalidRows: importRecord.invalidRows,
      startedAt: importRecord.startedAt || undefined,
      completedAt: importRecord.completedAt || undefined,
      errorMessage: importRecord.errorMessage || undefined,
    };
  }

  async startProcessing(tenantId: string, id: string): Promise<any> {
    const importRecord = await this.findById(tenantId, id);

    if (importRecord.status !== 'pending') {
      throw new BadRequestException('Import is not in pending state');
    }

    const updated = await this.prisma.leadListImport.update({
      where: { id },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });

    return updated;
  }

  async updateProgress(id: string, updates: Partial<ImportProgress>): Promise<any> {
    const updated = await this.prisma.leadListImport.update({
      where: { id },
      data: updates,
    });

    return updated;
  }

  async completeProcessing(id: string, success: boolean, errorMessage?: string): Promise<any> {
    const updated = await this.prisma.leadListImport.update({
      where: { id },
      data: {
        status: success ? 'completed' : 'failed',
        completedAt: new Date(),
        errorMessage: errorMessage || null,
      },
    });

    return updated;
  }

  async findAll(tenantId: string, params: { leadListId?: string; status?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId };
    if (params.leadListId) where.leadListId = params.leadListId;
    if (params.status) where.status = params.status;

    const [imports, total] = await Promise.all([
      this.prisma.leadListImport.findMany({
        where,
        include: {
          leadList: true,
          creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.leadListImport.count({ where }),
    ]);

    return { imports, total };
  }

  async getImportRows(importId: string, params: { status?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { importId };
    if (params.status) where.status = params.status;

    const [rows, total] = await Promise.all([
      this.prisma.leadImportRow.findMany({
        where,
        orderBy: { rowNumber: 'asc' },
        skip: params.skip || 0,
        take: params.take || 100,
      }),
      this.prisma.leadImportRow.count({ where }),
    ]);

    return { rows, total };
  }
}
