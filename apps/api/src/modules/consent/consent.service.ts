import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface CreateConsentDto {
  leadId: string;
  phoneNumber?: string;
  status: 'granted' | 'revoked' | 'expired' | 'unknown';
  type: 'express' | 'implied' | 'verbal' | 'written' | 'electronic';
  source?: string;
  method?: string;
  evidence?: any;
  jurisdiction?: string;
  scope?: string;
  expiresAt?: Date;
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateConsentDto): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: dto.leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const consent = await this.prisma.consent.create({
      data: {
        tenantId,
        leadId: dto.leadId,
        phoneNumber: dto.phoneNumber,
        status: dto.status,
        type: dto.type,
        source: dto.source,
        method: dto.method,
        evidence: dto.evidence,
        jurisdiction: dto.jurisdiction,
        scope: dto.scope,
        expiresAt: dto.expiresAt,
      },
    });

    return consent;
  }

  async findById(tenantId: string, id: string): Promise<any> {
    const consent = await this.prisma.consent.findFirst({
      where: { tenantId, id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    return consent;
  }

  async findByLead(tenantId: string, leadId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const consents = await this.prisma.consent.findMany({
      where: { tenantId, leadId },
      orderBy: { createdAt: 'desc' },
    });

    return consents;
  }

  async findByPhoneNumber(tenantId: string, phoneNumber: string): Promise<any> {
    const consents = await this.prisma.consent.findMany({
      where: { tenantId, phoneNumber },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return consents;
  }

  async getLatestConsent(tenantId: string, leadId: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const consent = await this.prisma.consent.findFirst({
      where: { tenantId, leadId },
      orderBy: { createdAt: 'desc' },
    });

    return consent;
  }

  async checkConsent(tenantId: string, leadId: string): Promise<{ hasConsent: boolean; status: string; consent?: any }> {
    const consent = await this.getLatestConsent(tenantId, leadId);

    if (!consent) {
      return { hasConsent: false, status: 'unknown' };
    }

    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return { hasConsent: false, status: 'expired', consent };
    }

    return {
      hasConsent: consent.status === 'granted',
      status: consent.status,
      consent,
    };
  }

  async revoke(tenantId: string, leadId: string, reason?: string): Promise<any> {
    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: leadId, deletedAt: null },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const consent = await this.prisma.consent.create({
      data: {
        tenantId,
        leadId,
        status: 'revoked',
        type: 'electronic',
        source: 'manual',
        method: 'revocation',
        evidence: { reason },
      },
    });

    return consent;
  }

  async findAll(tenantId: string, params: { status?: string; type?: string; skip?: number; take?: number }): Promise<any> {
    const where: any = { tenantId };
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const [consents, total] = await Promise.all([
      this.prisma.consent.findMany({
        where,
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.consent.count({ where }),
    ]);

    return { consents, total };
  }
}
