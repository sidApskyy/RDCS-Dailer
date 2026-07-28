import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/exceptions/http-exception.filter';
import { CorrelationMiddleware } from '../../src/common/middleware/correlation.middleware';
import { ComplianceEngineService, EligibilityResult } from '../../src/modules/compliance/compliance-engine.service';
import { TelephonySocketService } from '../../src/modules/telephony/telephony-socket.service';
import { testDb, testAuth } from '../setup';

class MockComplianceEngineService {
  async checkLeadEligibility(): Promise<EligibilityResult> {
    return { eligible: true, reason: 'Mock: eligible', rule: 'ELIGIBLE' };
  }
  async checkBulkEligibility(
    _tenantId: string,
    leads: Array<{ id: string; phoneNumber: string; timezone?: string }>,
  ): Promise<Map<string, EligibilityResult>> {
    const results = new Map<string, EligibilityResult>();
    for (const lead of leads) {
      results.set(lead.id, { eligible: true, reason: 'Mock: eligible', rule: 'ELIGIBLE' });
    }
    return results;
  }
}

export async function createTestApp(): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
    providers: [
      { provide: ComplianceEngineService, useClass: MockComplianceEngineService },
    ],
  })
    .overrideProvider(ComplianceEngineService)
    .useClass(MockComplianceEngineService)
    .compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(CorrelationMiddleware);
  await app.init();
  app.get(TelephonySocketService).attach(app.getHttpServer());
  return { app, module };
}

export async function createTestAppWithRealCompliance(): Promise<{ app: INestApplication; module: TestingModule }> {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(CorrelationMiddleware);
  await app.init();
  app.get(TelephonySocketService).attach(app.getHttpServer());
  return { app, module };
}

export interface SeededAgent {
  tenantId: string;
  userId: string;
  token: string;
  leadId: string;
  phoneNumber: string;
  campaignId?: string;
  dispositionId?: string;
}

export async function closeTestApp(app: INestApplication, module: TestingModule): Promise<void> {
  await app.close();
  await module.close();
}

export async function seedConsent(tenantId: string, leadId: string): Promise<void> {
  const prisma = testDb.getPrisma();
  await prisma.consent.create({
    data: {
      tenantId,
      leadId,
      status: 'granted',
      type: 'express',
      source: 'website',
      method: 'checkbox',
    },
  });
}

export async function seedAgentWithLead(opts: {
  tenantId: string;
  userId: string;
  email: string;
  leadId: string;
  phoneNumber: string;
  campaignId?: string;
  dispositionId?: string;
  roles?: string[];
  permissions?: Array<{ resource: string; action: string; scope: string }>;
}): Promise<SeededAgent> {
  const prisma = testDb.getPrisma();
  const passwordHash = await testAuth.hashPassword('TestPassword123!');

  await testDb.seedTenant({ id: opts.tenantId, name: opts.tenantId, slug: opts.tenantId });
  await testDb.seedUser({
    id: opts.userId,
    tenantId: opts.tenantId,
    email: opts.email,
    passwordHash,
    status: 'active',
  });

  const roleId = `role-${opts.userId}`;
  await testDb.seedRole({ id: roleId, name: `Role-${opts.userId}`, tenantId: opts.tenantId });

  const perms = opts.permissions || [
    { resource: 'calls', action: 'create', scope: 'tenant' },
    { resource: 'calls', action: 'read', scope: 'tenant' },
    { resource: 'calls', action: 'update', scope: 'tenant' },
  ];

  for (let i = 0; i < perms.length; i++) {
    const p = perms[i];
    const permId = `perm-${opts.userId}-${i}`;
    await testDb.seedPermission({ id: permId, resource: p.resource, action: p.action, scope: p.scope, tenantId: opts.tenantId });
    await testDb.seedRolePermission({ roleId, permissionId: permId });
  }
  await testDb.seedUserRole({ userId: opts.userId, roleId });

  const leadList = await prisma.leadList.create({
    data: {
      id: `ll-${opts.leadId}`,
      tenantId: opts.tenantId,
      name: 'Test List',
      status: 'active',
      totalRows: 1,
      processedRows: 1,
      successfulRows: 1,
      failedRows: 0,
      duplicateRows: 0,
      suppressedRows: 0,
      createdBy: opts.userId,
    },
  });

  await prisma.lead.create({
    data: {
      id: opts.leadId,
      tenantId: opts.tenantId,
      leadListId: leadList.id,
      firstName: 'Test',
      lastName: 'Lead',
      email: `${opts.leadId}@example.com`,
      status: 'new',
      timezone: 'UTC',
      createdBy: opts.userId,
      phones: { create: [{ id: `phone-${opts.leadId}`, tenantId: opts.tenantId, phoneNumber: opts.phoneNumber, type: 'mobile', isPrimary: true }] },
    },
  });

  if (opts.campaignId) {
    await prisma.campaign.create({
      data: {
        id: opts.campaignId,
        tenantId: opts.tenantId,
        name: 'Test Campaign',
        slug: `camp-${opts.campaignId}`,
        type: 'outbound',
        purpose: 'sales',
        timezone: 'UTC',
        priority: 1,
        status: 'active',
        createdBy: opts.userId,
      },
    });
  }

  if (opts.dispositionId) {
    await prisma.disposition.create({
      data: {
        id: opts.dispositionId,
        tenantId: opts.tenantId,
        code: 'test-disp',
        name: 'Test Disposition',
        category: 'neutral',
        outcome: 'terminal',
        description: 'Test',
        createdBy: opts.userId,
      },
    });
  }

  await prisma.agentPresence.create({
    data: { tenantId: opts.tenantId, agentId: opts.userId, status: 'available' },
  });

  await prisma.consent.create({
    data: {
      tenantId: opts.tenantId,
      leadId: opts.leadId,
      status: 'granted',
      type: 'express',
      source: 'website',
      method: 'checkbox',
    },
  });

  const token = testAuth.generateAccessToken({
    id: opts.userId,
    tenantId: opts.tenantId,
    email: opts.email,
    password: 'TestPassword123!',
    roles: opts.roles || ['agent'],
  });

  return {
    tenantId: opts.tenantId,
    userId: opts.userId,
    token,
    leadId: opts.leadId,
    phoneNumber: opts.phoneNumber,
    campaignId: opts.campaignId,
    dispositionId: opts.dispositionId,
  };
}

export function authRequest(app: INestApplication, token: string) {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}

export function unauthRequest(app: INestApplication) {
  return request(app.getHttpServer());
}

export { testDb, testAuth };
