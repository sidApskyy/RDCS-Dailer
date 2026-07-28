import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { createTestApp, closeTestApp, seedAgentWithLead, authRequest, SeededAgent } from '../helpers/telephony-test-helper';
import { testDb } from '../setup';

describe('Phase 4 — Telephony Tenant Isolation Tests', () => {
  let app: INestApplication;
  let module: TestingModule;
  let agentA: SeededAgent;
  let agentB: SeededAgent;

  beforeAll(async () => {
    ({ app, module } = await createTestApp());
  });

  afterAll(async () => {
    await closeTestApp(app, module);
  });

  beforeEach(async () => {
    await testDb.clean();
    agentA = await seedAgentWithLead({
      tenantId: 'tenant-a',
      userId: 'agent-a',
      email: 'agent-a@example.com',
      leadId: 'lead-a',
      phoneNumber: '+10000000001',
      campaignId: 'camp-a',
      dispositionId: 'disp-a',
    });
    agentB = await seedAgentWithLead({
      tenantId: 'tenant-b',
      userId: 'agent-b',
      email: 'agent-b@example.com',
      leadId: 'lead-b',
      phoneNumber: '+10000000002',
      campaignId: 'camp-b',
      dispositionId: 'disp-b',
    });
  });

  it('should not allow agent A to access agent B tenant calls', async () => {
    const dialRes = await authRequest(app, agentB.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentB.leadId,
      phoneNumber: agentB.phoneNumber,
    });
    const callId = dialRes.body.data.id;
    const res = await authRequest(app, agentA.token).get(`/api/v1/calls/${callId}`);
    expect(res.status).toBe(404);
  });

  it('should not allow agent A to cancel agent B call', async () => {
    const dialRes = await authRequest(app, agentB.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentB.leadId,
      phoneNumber: agentB.phoneNumber,
    });
    const callId = dialRes.body.data.id;
    const res = await authRequest(app, agentA.token).delete(`/api/v1/calls/${callId}`);
    expect(res.status).toBe(404);
  });

  it('should not allow agent A to disposition agent B call', async () => {
    const prisma = testDb.getPrisma();
    const dialRes = await authRequest(app, agentB.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentB.leadId,
      phoneNumber: agentB.phoneNumber,
    });
    const callId = dialRes.body.data.id;
    await prisma.callSession.update({ where: { id: callId }, data: { state: 'completed', completedAt: new Date() } });
    const res = await authRequest(app, agentA.token).post(`/api/v1/calls/${callId}/disposition`).send({
      dispositionId: agentA.dispositionId,
    });
    expect(res.status).toBe(404);
  });

  it('should only list calls for the authenticated tenant', async () => {
    await authRequest(app, agentA.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentA.leadId,
      phoneNumber: agentA.phoneNumber,
    });
    await authRequest(app, agentB.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentB.leadId,
      phoneNumber: agentB.phoneNumber,
    });

    const resA = await authRequest(app, agentA.token).get('/api/v1/calls');
    const resB = await authRequest(app, agentB.token).get('/api/v1/calls');

    expect(resA.body.data.calls.length).toBe(1);
    expect(resA.body.data.calls[0].tenantId).toBe('tenant-a');
    expect(resB.body.data.calls.length).toBe(1);
    expect(resB.body.data.calls[0].tenantId).toBe('tenant-b');
  });

  it('should not allow agent A to dial agent B lead', async () => {
    const res = await authRequest(app, agentA.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentB.leadId,
      phoneNumber: agentB.phoneNumber,
    });
    expect(res.status).toBe(404);
  });

  it('should isolate audit logs by tenant', async () => {
    await authRequest(app, agentA.token).post('/api/v1/calls/manual-dial').send({
      leadId: agentA.leadId,
      phoneNumber: agentA.phoneNumber,
    });
    const prisma = testDb.getPrisma();
    const auditsA = await prisma.audit.findMany({ where: { tenantId: 'tenant-a' } });
    const auditsB = await prisma.audit.findMany({ where: { tenantId: 'tenant-b' } });
    expect(auditsA.length).toBeGreaterThan(0);
    expect(auditsB.length).toBe(0);
  });
});
