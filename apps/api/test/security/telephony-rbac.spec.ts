import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { createTestApp, closeTestApp, authRequest, unauthRequest } from '../helpers/telephony-test-helper';
import { testDb, testAuth } from '../setup';

describe('Phase 4 — Telephony RBAC Scope Tests', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    ({ app, module } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, module);
  });

  beforeEach(async () => {
    await testDb.clean();
  });

  async function seedUserWithPermissions(
    userId: string,
    tenantId: string,
    perms: Array<{ resource: string; action: string; scope: string }>,
  ): Promise<string> {
    const passwordHash = await testAuth.hashPassword('TestPassword123!');
    await testDb.seedTenant({ id: tenantId, name: tenantId, slug: tenantId });
    await testDb.seedUser({ id: userId, tenantId, email: `${userId}@example.com`, passwordHash, status: 'active' });
    const roleId = `role-${userId}`;
    await testDb.seedRole({ id: roleId, name: `Role-${userId}`, tenantId });
    for (let i = 0; i < perms.length; i++) {
      const p = perms[i];
      const permId = `perm-${userId}-${i}`;
      await testDb.seedPermission({ id: permId, resource: p.resource, action: p.action, scope: p.scope, tenantId });
      await testDb.seedRolePermission({ roleId, permissionId: permId });
    }
    await testDb.seedUserRole({ userId, roleId });
    await testDb.getPrisma().agentPresence.create({ data: { tenantId, agentId: userId, status: 'available' } });
    return testAuth.generateAccessToken({ id: userId, tenantId, email: `${userId}@example.com`, password: 'TestPassword123!', roles: ['agent'] });
  }

  async function seedLead(tenantId: string, userId: string, leadId: string, phoneNumber: string): Promise<void> {
    const prisma = testDb.getPrisma();
    const leadList = await prisma.leadList.create({
      data: {
        id: `ll-${leadId}`,
        tenantId,
        name: 'Test List',
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
    await prisma.lead.create({
      data: {
        id: leadId,
        tenantId,
        leadListId: leadList.id,
        firstName: 'Test',
        lastName: 'Lead',
        email: `${leadId}@example.com`,
        status: 'new',
        timezone: 'UTC',
        createdBy: userId,
        phones: { create: [{ id: `phone-${leadId}`, tenantId, phoneNumber, type: 'mobile', isPrimary: true }] },
      },
    });
  }

  it('should allow access with tenant scope (satisfies own default)', async () => {
    const token = await seedUserWithPermissions('user-tenant', 'tenant-1', [
      { resource: 'calls', action: 'create', scope: 'tenant' },
      { resource: 'calls', action: 'read', scope: 'tenant' },
    ]);
    await seedLead('tenant-1', 'user-tenant', 'lead-1', '+10000000001');
    const res = await authRequest(app, token).get('/api/v1/calls/agent/status');
    expect(res.status).toBe(200);
  });

  it('should allow access with own scope for own-level requirement', async () => {
    const token = await seedUserWithPermissions('user-own', 'tenant-1', [
      { resource: 'calls', action: 'read', scope: 'own' },
    ]);
    const res = await authRequest(app, token).get('/api/v1/calls/agent/status');
    expect(res.status).toBe(200);
  });

  it('should deny access with no permissions', async () => {
    const passwordHash = await testAuth.hashPassword('TestPassword123!');
    await testDb.seedTenant({ id: 'tenant-1', name: 'tenant-1', slug: 'tenant-1' });
    await testDb.seedUser({ id: 'user-noperm', tenantId: 'tenant-1', email: 'noperm@example.com', passwordHash, status: 'active' });
    await testDb.getPrisma().agentPresence.create({ data: { tenantId: 'tenant-1', agentId: 'user-noperm', status: 'available' } });
    const token = testAuth.generateAccessToken({ id: 'user-noperm', tenantId: 'tenant-1', email: 'noperm@example.com', password: 'TestPassword123!', roles: [] });
    const res = await authRequest(app, token).get('/api/v1/calls/agent/status');
    expect(res.status).toBe(403);
  });

  it('should deny calls:create without create permission', async () => {
    const token = await seedUserWithPermissions('user-readonly', 'tenant-1', [
      { resource: 'calls', action: 'read', scope: 'tenant' },
    ]);
    await seedLead('tenant-1', 'user-readonly', 'lead-1', '+10000000001');
    const res = await authRequest(app, token).post('/api/v1/calls/manual-dial').send({
      leadId: 'lead-1',
      phoneNumber: '+10000000001',
    });
    expect(res.status).toBe(403);
  });

  it('should deny calls:update without update permission', async () => {
    const token = await seedUserWithPermissions('user-noupdate', 'tenant-1', [
      { resource: 'calls', action: 'read', scope: 'tenant' },
      { resource: 'calls', action: 'create', scope: 'tenant' },
    ]);
    await seedLead('tenant-1', 'user-noupdate', 'lead-1', '+10000000001');
    const dialRes = await authRequest(app, token).post('/api/v1/calls/manual-dial').send({
      leadId: 'lead-1',
      phoneNumber: '+10000000001',
    });
    expect(dialRes.status).toBe(201);
    const cancelRes = await authRequest(app, token).delete(`/api/v1/calls/${dialRes.body.data.id}`);
    expect(cancelRes.status).toBe(403);
  });

  it('should deny cross-tenant scope from satisfying own requirement for different tenant', async () => {
    const token = await seedUserWithPermissions('user-cross', 'tenant-1', [
      { resource: 'calls', action: 'read', scope: 'cross-tenant' },
    ]);
    const res = await authRequest(app, token).get('/api/v1/calls/agent/status');
    expect(res.status).toBe(200);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await unauthRequest(app).get('/api/v1/calls/agent/status');
    expect(res.status).toBe(401);
  });

  it('should log authorization denial in audit', async () => {
    const passwordHash = await testAuth.hashPassword('TestPassword123!');
    await testDb.seedTenant({ id: 'tenant-1', name: 'tenant-1', slug: 'tenant-1' });
    await testDb.seedUser({ id: 'user-denied', tenantId: 'tenant-1', email: 'denied@example.com', passwordHash, status: 'active' });
    await testDb.getPrisma().agentPresence.create({ data: { tenantId: 'tenant-1', agentId: 'user-denied', status: 'available' } });
    const token = testAuth.generateAccessToken({ id: 'user-denied', tenantId: 'tenant-1', email: 'denied@example.com', password: 'TestPassword123!', roles: [] });
    await authRequest(app, token).get('/api/v1/calls/agent/status');
    const prisma = testDb.getPrisma();
    const denial = await prisma.audit.findFirst({ where: { tenantId: 'tenant-1', userId: 'user-denied', action: 'auth.denied' } });
    expect(denial).not.toBeNull();
  });
});
