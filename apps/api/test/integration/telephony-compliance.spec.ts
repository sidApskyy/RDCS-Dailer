import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { ComplianceEngineService } from '../../src/modules/compliance/compliance-engine.service';
import { createTestAppWithRealCompliance, closeTestApp, authRequest, seedConsent } from '../helpers/telephony-test-helper';
import { testDb, testAuth } from '../setup';

describe('Phase 4 — Compliance Acceptance Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let compliance: ComplianceEngineService;
  let prisma: ReturnType<typeof testDb.getPrisma>;

  beforeAll(async () => {
    ({ app, module } = await createTestAppWithRealCompliance());
    compliance = module.get(ComplianceEngineService);
    prisma = testDb.getPrisma();
  });

  afterAll(async () => {
    await closeTestApp(app, module);
  });

  beforeEach(async () => {
    await testDb.clean();
  });

  async function seedTenantAndLead(tenantId: string, userId: string, leadId: string, phoneNumber: string) {
    const passwordHash = await testAuth.hashPassword('TestPassword123!');
    await testDb.seedTenant({ id: tenantId, name: tenantId, slug: tenantId });
    await testDb.seedUser({ id: userId, tenantId, email: `${userId}@example.com`, passwordHash, status: 'active' });

    const roleId = `role-${userId}`;
    await testDb.seedRole({ id: roleId, name: `Role-${userId}`, tenantId });
    const perms = [
      { resource: 'calls', action: 'create', scope: 'tenant' },
      { resource: 'calls', action: 'read', scope: 'tenant' },
      { resource: 'calls', action: 'update', scope: 'tenant' },
    ];
    for (let i = 0; i < perms.length; i++) {
      const permId = `perm-${userId}-${i}`;
      await testDb.seedPermission({ id: permId, resource: perms[i].resource, action: perms[i].action, scope: perms[i].scope, tenantId });
      await testDb.seedRolePermission({ roleId, permissionId: permId });
    }
    await testDb.seedUserRole({ userId, roleId });

    const leadList = await prisma.leadList.create({
      data: {
        id: `ll-${leadId}`, tenantId, name: 'Test List', status: 'active',
        totalRows: 1, processedRows: 1, successfulRows: 1, failedRows: 0, duplicateRows: 0, suppressedRows: 0, createdBy: userId,
      },
    });
    await prisma.lead.create({
      data: {
        id: leadId, tenantId, leadListId: leadList.id, firstName: 'Test', lastName: 'Lead',
        email: `${leadId}@example.com`, status: 'new', timezone: 'UTC', createdBy: userId,
        phones: { create: [{ id: `phone-${leadId}`, tenantId, phoneNumber, type: 'mobile', isPrimary: true }] },
      },
    });
    await prisma.agentPresence.create({ data: { tenantId, agentId: userId, status: 'available' } });

    const token = testAuth.generateAccessToken({ id: userId, tenantId, email: `${userId}@example.com`, password: 'TestPassword123!', roles: ['agent'] });
    return { token, userId };
  }

  describe('DNC Compliance', () => {
    it('should block call when phone is on DNC list', async () => {
      const { userId } = await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await seedConsent('tenant-1', 'lead-1');

      const dncList = await prisma.dNCList.create({
        data: { id: 'dnc-1', tenantId: 'tenant-1', name: 'Tenant DNC', type: 'tenant', createdBy: userId },
      });
      await prisma.dNCEntry.create({
        data: { id: 'dnc-e-1', tenantId: 'tenant-1', dncListId: dncList.id, phoneNumber: '+10000000001', addedBy: userId },
      });

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: true, checkConsent: false, checkCallingWindow: false, checkTimezone: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('DNC_BLOCKED');
    });

    it('should allow call when phone is not on DNC list', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: true, checkConsent: false, checkCallingWindow: false, checkTimezone: false,
      });
      expect(result.eligible).toBe(true);
    });
  });

  describe('Consent Compliance', () => {
    it('should block call when no consent exists', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: true, checkCallingWindow: false, checkTimezone: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('CONSENT_MISSING');
    });

    it('should allow call when consent is granted', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await seedConsent('tenant-1', 'lead-1');

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: true, checkCallingWindow: false, checkTimezone: false,
      });
      expect(result.eligible).toBe(true);
    });

    it('should block call when consent is revoked', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await seedConsent('tenant-1', 'lead-1');
      await prisma.consent.create({
        data: { tenantId: 'tenant-1', leadId: 'lead-1', status: 'revoked', type: 'electronic', source: 'manual', method: 'revocation' },
      });

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: true, checkCallingWindow: false, checkTimezone: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('CONSENT_MISSING');
    });

    it('should block call when consent is expired', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await prisma.consent.create({
        data: { tenantId: 'tenant-1', leadId: 'lead-1', status: 'granted', type: 'express', expiresAt: new Date(Date.now() - 86400000) },
      });

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: true, checkCallingWindow: false, checkTimezone: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('CONSENT_MISSING');
    });
  });

  describe('Calling Window Compliance', () => {
    it('should allow call when no calling windows configured', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: false, checkCallingWindow: true, checkTimezone: false,
      });
      expect(result.eligible).toBe(true);
    });

    it('should block call when outside calling window', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await prisma.callingWindow.create({
        data: { id: 'cw-1', tenantId: 'tenant-1', name: 'Night Only', dayOfWeek: -1, startTime: '22:00', endTime: '23:00', timezone: 'UTC', isActive: true },
      });

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: false, checkCallingWindow: true, checkTimezone: false,
      });
      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('OUTSIDE_CALLING_WINDOW');
    });
  });

  describe('Timezone Compliance', () => {
    it('should block call outside business hours in lead timezone', async () => {
      await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');

      const result = await compliance.checkLeadEligibility('tenant-1', 'lead-1', '+10000000001', {
        checkDNC: false, checkConsent: false, checkCallingWindow: false, checkTimezone: true, timezone: 'Asia/Tokyo',
      });
      const tokyoHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour: 'numeric', hourCycle: 'h23' });
      const hour = parseInt(tokyoHour);
      const tokyoWeekday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();
      const isBusinessHours = hour >= 9 && hour < 17;
      const isWeekday = tokyoWeekday >= 1 && tokyoWeekday <= 5;
      if (!isBusinessHours || !isWeekday) {
        expect(result.eligible).toBe(false);
        expect(result.rule).toBe('OUTSIDE_BUSINESS_HOURS');
      } else {
        expect(result.eligible).toBe(true);
      }
    });
  });

  describe('Manual Dial Compliance Integration', () => {
    it('should reject manual dial with 400 when DNC blocked', async () => {
      const { token, userId } = await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await seedConsent('tenant-1', 'lead-1');

      const dncList = await prisma.dNCList.create({
        data: { id: 'dnc-1', tenantId: 'tenant-1', name: 'Tenant DNC', type: 'tenant', createdBy: userId },
      });
      await prisma.dNCEntry.create({
        data: { id: 'dnc-e-1', tenantId: 'tenant-1', dncListId: dncList.id, phoneNumber: '+10000000001', addedBy: userId },
      });

      const res = await authRequest(app, token).post('/api/v1/calls/manual-dial').send({
        leadId: 'lead-1',
        phoneNumber: '+10000000001',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not eligible');
    });

    it('should audit compliance block when dial is rejected', async () => {
      const { token, userId } = await seedTenantAndLead('tenant-1', 'agent-1', 'lead-1', '+10000000001');
      await seedConsent('tenant-1', 'lead-1');

      const dncList = await prisma.dNCList.create({
        data: { id: 'dnc-2', tenantId: 'tenant-1', name: 'Tenant DNC', type: 'tenant', createdBy: userId },
      });
      await prisma.dNCEntry.create({
        data: { id: 'dnc-e-2', tenantId: 'tenant-1', dncListId: dncList.id, phoneNumber: '+10000000001', addedBy: userId },
      });

      await authRequest(app, token).post('/api/v1/calls/manual-dial').send({
        leadId: 'lead-1',
        phoneNumber: '+10000000001',
      });

      const audit = await prisma.audit.findFirst({
        where: { tenantId: 'tenant-1', userId, action: 'call.compliance_blocked' },
      });
      expect(audit).not.toBeNull();
      expect((audit?.metadata as Record<string, unknown>)?.rule).toBe('DNC_BLOCKED');
    });
  });
});
