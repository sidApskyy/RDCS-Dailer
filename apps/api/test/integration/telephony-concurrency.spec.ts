import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { createTestApp, closeTestApp, seedAgentWithLead, authRequest, SeededAgent } from '../helpers/telephony-test-helper';
import { testDb } from '../setup';

describe('Phase 4 — Telephony Concurrency Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let agent: SeededAgent;

  beforeAll(async () => {
    ({ app, module } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, module);
  });

  beforeEach(async () => {
    await testDb.clean();
    agent = await seedAgentWithLead({
      tenantId: 'tenant-1',
      userId: 'agent-1',
      email: 'agent-1@example.com',
      leadId: 'lead-1',
      phoneNumber: '+10000000001',
      campaignId: 'camp-1',
      dispositionId: 'disp-1',
    });
  });

  it('should prevent concurrent manual dials from same agent', async () => {
    const [res1, res2] = await Promise.all([
      authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      }),
      authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      }),
    ]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
  });

  it('should handle concurrent cancellation of same call', async () => {
    const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
      leadId: agent.leadId,
      phoneNumber: agent.phoneNumber,
    });
    const callId = dialRes.body.data.id;
    const [res1, res2] = await Promise.all([
      authRequest(app, agent.token).delete(`/api/v1/calls/${callId}`),
      authRequest(app, agent.token).delete(`/api/v1/calls/${callId}`),
    ]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toContain(200);
  });

  it('should prevent duplicate disposition on same call', async () => {
    const prisma = testDb.getPrisma();
    const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
      leadId: agent.leadId,
      phoneNumber: agent.phoneNumber,
    });
    const callId = dialRes.body.data.id;
    await prisma.callSession.update({ where: { id: callId }, data: { state: 'completed', completedAt: new Date() } });

    const [res1, res2] = await Promise.all([
      authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({ dispositionId: agent.dispositionId }),
      authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({ dispositionId: agent.dispositionId }),
    ]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });

  it('should allow concurrent dials from different agents', async () => {
    const prisma = testDb.getPrisma();

    await testDb.seedUser({
      id: 'agent-2',
      tenantId: 'tenant-1',
      email: 'agent-2@example.com',
      passwordHash: await import('bcrypt').then(b => b.hash('TestPassword123!', 12)),
      status: 'active',
    });
    const roleId = 'role-agent-2';
    await testDb.seedRole({ id: roleId, name: 'Role-agent-2', tenantId: 'tenant-1' });
    const perms = [
      { resource: 'calls', action: 'create', scope: 'tenant' },
      { resource: 'calls', action: 'read', scope: 'tenant' },
      { resource: 'calls', action: 'update', scope: 'tenant' },
    ];
    for (let i = 0; i < perms.length; i++) {
      const permId = `perm-agent-2-${i}`;
      const perm = await testDb.seedPermission({ id: permId, resource: perms[i].resource, action: perms[i].action, scope: perms[i].scope, tenantId: 'tenant-1' });
      await testDb.seedRolePermission({ roleId, permissionId: perm.id });
    }
    await testDb.seedUserRole({ userId: 'agent-2', roleId });
    await prisma.agentPresence.create({ data: { tenantId: 'tenant-1', agentId: 'agent-2', status: 'available' } });

    const leadList2 = await prisma.leadList.create({
      data: {
        id: 'll-2', tenantId: 'tenant-1', name: 'List 2', status: 'active',
        totalRows: 1, processedRows: 1, successfulRows: 1, failedRows: 0, duplicateRows: 0, suppressedRows: 0, createdBy: 'agent-2',
      },
    });
    await prisma.lead.create({
      data: {
        id: 'lead-2', tenantId: 'tenant-1', leadListId: leadList2.id, firstName: 'Test2', lastName: 'Lead2',
        email: 'lead-2@example.com', status: 'new', timezone: 'UTC', createdBy: 'agent-2',
        phones: { create: [{ id: 'phone-2', tenantId: 'tenant-1', phoneNumber: '+10000000002', type: 'mobile', isPrimary: true }] },
      },
    });

    const token2 = (await import('../setup')).testAuth.generateAccessToken({
      id: 'agent-2', tenantId: 'tenant-1', email: 'agent-2@example.com', password: 'TestPassword123!', roles: ['agent'],
    });

    const [res1, res2] = await Promise.all([
      authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      }),
      authRequest(app, token2).post('/api/v1/calls/manual-dial').send({
        leadId: 'lead-2',
        phoneNumber: '+10000000002',
      }),
    ]);
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  it('should ensure only one call session exists per agent after race', async () => {
    await Promise.all([
      authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      }).catch(() => undefined),
      authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      }).catch(() => undefined),
    ]);
    const prisma = testDb.getPrisma();
    const activeCalls = await prisma.callSession.findMany({
      where: { tenantId: 'tenant-1', agentId: 'agent-1', state: { in: ['queued', 'dialing', 'ringing', 'connected', 'on_hold'] } },
    });
    expect(activeCalls.length).toBe(1);
  });
});
