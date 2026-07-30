import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/exceptions/http-exception.filter';
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

describe('Telephony Rate Limiting (Phase 4 Production Readiness)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let agentToken: string;
  let tenantId: string;
  let leadId: string;
  let phoneNumber: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ComplianceEngineService)
      .useClass(MockComplianceEngineService)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    app.get(TelephonySocketService).attach(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await module.close();
  });

  // The global `beforeEach` (registered by importing `../setup`) truncates
  // all tables before every test, so seed data must be re-created here
  // rather than once in `beforeAll`.
  beforeEach(async () => {
    const prisma = testDb.getPrisma();
    tenantId = 'rate-limit-tenant';
    const userId = 'rate-limit-agent';
    const passwordHash = await testAuth.hashPassword('TestPassword123!');

    await testDb.seedTenant({ id: tenantId, name: tenantId, slug: tenantId });
    await testDb.seedUser({ id: userId, tenantId, email: 'rl-agent@test.local', passwordHash, status: 'active' });

    const roleId = 'role-rl';
    await testDb.seedRole({ id: roleId, name: 'Role-RL', tenantId });
    const perms = [
      { resource: 'calls', action: 'create', scope: 'tenant' },
      { resource: 'calls', action: 'read', scope: 'tenant' },
      { resource: 'calls', action: 'update', scope: 'tenant' },
    ];
    for (let i = 0; i < perms.length; i++) {
      const p = perms[i];
      const perm = await testDb.seedPermission({ id: `perm-rl-${i}`, resource: p.resource, action: p.action, scope: p.scope, tenantId });
      await testDb.seedRolePermission({ roleId, permissionId: perm.id });
    }
    await testDb.seedUserRole({ userId, roleId });

    const leadList = await prisma.leadList.create({
      data: {
        id: 'll-rl',
        tenantId,
        name: 'RL Test List',
        status: 'active',
        totalRows: 1,
        processedRows: 1,
        successfulRows: 1,
        failedRows: 0,
        duplicateRows: 0,
        suppressedRows: 0,
        createdBy: userId,
      },
    });

    leadId = 'lead-rl';
    phoneNumber = '5550100';
    await prisma.lead.create({
      data: {
        id: leadId,
        tenantId,
        leadListId: leadList.id,
        firstName: 'RL',
        lastName: 'Lead',
        email: 'rl-lead@test.local',
        status: 'new',
        timezone: 'UTC',
        createdBy: userId,
        phones: { create: [{ id: 'phone-rl', tenantId, phoneNumber, type: 'mobile', isPrimary: true }] },
      },
    });

    await prisma.consent.create({
      data: { tenantId, leadId, status: 'granted', type: 'express', source: 'website', method: 'checkbox' },
    });

    await prisma.agentPresence.create({
      data: { tenantId, agentId: userId, status: 'available' },
    });

    agentToken = testAuth.generateAccessToken({
      id: userId,
      tenantId,
      email: 'rl-agent@test.local',
      password: 'TestPassword123!',
      roles: ['agent'],
    });
  });

  it('should return 429 when manual-dial rate limit is exceeded (10 requests/min)', async () => {
    // Use a nonexistent leadId so each request fails fast (404) without
    // mutating agent/call state. The throttler guard runs before the
    // handler, so failed requests still count toward the rate limit.
    const dial = () =>
      request(app.getHttpServer())
        .post('/api/v1/calls/manual-dial')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ leadId: 'nonexistent-lead-id', phoneNumber });

    for (let i = 0; i < 10; i++) {
      const r = await dial();
      expect(r.status).toBe(404);
    }

    const r11 = await dial();
    expect(r11.status).toBe(429);
    expect(r11.body.success).toBe(false);
  });

  it('should return 429 when agent status update rate limit is exceeded (15 requests/min)', async () => {
    const updateStatus = () =>
      request(app.getHttpServer())
        .put('/api/v1/calls/agent/status')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'available' });

    for (let i = 0; i < 15; i++) {
      const r = await updateStatus();
      expect(r.status).toBe(200);
    }

    const r16 = await updateStatus();
    expect(r16.status).toBe(429);
  });

  it('should not rate-limit GET endpoints (read operations)', async () => {
    const getStatus = () =>
      request(app.getHttpServer())
        .get('/api/v1/calls/agent/status')
        .set('Authorization', `Bearer ${agentToken}`);

    for (let i = 0; i < 10; i++) {
      const r = await getStatus();
      expect(r.status).toBe(200);
    }
  });

  it('should rate-limit per tenant:user tracker (different agents not affected)', async () => {
    const tenant2 = 'rate-limit-tenant-2';
    const userId2 = 'rate-limit-agent-2';
    const passwordHash = await testAuth.hashPassword('TestPassword123!');

    await testDb.seedTenant({ id: tenant2, name: tenant2, slug: tenant2 });
    await testDb.seedUser({ id: userId2, tenantId: tenant2, email: 'rl-agent2@test.local', passwordHash, status: 'active' });

    const roleId2 = 'role-rl-2';
    await testDb.seedRole({ id: roleId2, name: 'Role-RL-2', tenantId: tenant2 });
    const perms = [
      { resource: 'calls', action: 'create', scope: 'tenant' },
      { resource: 'calls', action: 'read', scope: 'tenant' },
      { resource: 'calls', action: 'update', scope: 'tenant' },
    ];
    for (let i = 0; i < perms.length; i++) {
      const p = perms[i];
      const perm = await testDb.seedPermission({ id: `perm-rl2-${i}`, resource: p.resource, action: p.action, scope: p.scope, tenantId: tenant2 });
      await testDb.seedRolePermission({ roleId: roleId2, permissionId: perm.id });
    }
    await testDb.seedUserRole({ userId: userId2, roleId: roleId2 });

    const leadList2 = await testDb.getPrisma().leadList.create({
      data: {
        id: 'll-rl-2',
        tenantId: tenant2,
        name: 'RL Test List 2',
        status: 'active',
        totalRows: 1,
        processedRows: 1,
        successfulRows: 1,
        failedRows: 0,
        duplicateRows: 0,
        suppressedRows: 0,
        createdBy: userId2,
      },
    });

    const leadId2 = 'lead-rl-2';
    const phoneNumber2 = '5550200';
    await testDb.getPrisma().lead.create({
      data: {
        id: leadId2,
        tenantId: tenant2,
        leadListId: leadList2.id,
        firstName: 'RL2',
        lastName: 'Lead',
        email: 'rl2-lead@test.local',
        status: 'new',
        timezone: 'UTC',
        createdBy: userId2,
        phones: { create: [{ id: 'phone-rl-2', tenantId: tenant2, phoneNumber: phoneNumber2, type: 'mobile', isPrimary: true }] },
      },
    });

    await testDb.getPrisma().consent.create({
      data: { tenantId: tenant2, leadId: leadId2, status: 'granted', type: 'express', source: 'website', method: 'checkbox' },
    });

    await testDb.getPrisma().agentPresence.create({
      data: { tenantId: tenant2, agentId: userId2, status: 'available' },
    });

    const agent2Token = testAuth.generateAccessToken({
      id: userId2,
      tenantId: tenant2,
      email: 'rl-agent2@test.local',
      password: 'TestPassword123!',
      roles: ['agent'],
    });

    const r = await request(app.getHttpServer())
      .post('/api/v1/calls/manual-dial')
      .set('Authorization', `Bearer ${agent2Token}`)
      .send({ leadId: leadId2, phoneNumber: phoneNumber2 });

    expect(r.status).toBe(201);
  });
});
