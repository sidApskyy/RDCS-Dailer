import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { createTestApp, closeTestApp, seedAgentWithLead, authRequest, unauthRequest, SeededAgent } from '../helpers/telephony-test-helper';
import { testDb } from '../setup';

describe('Phase 4 — Telephony REST Integration Tests', () => {
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

  describe('PUT /api/v1/calls/agent/status', () => {
    it('should set agent to available', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'available' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('available');
    });

    it('should reject busy as lifecycle-managed', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'busy' });
      expect(res.status).toBe(400);
    });

    it('should reject on_call as lifecycle-managed', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'on_call' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid status', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'invalid_state' });
      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated', async () => {
      const res = await unauthRequest(app).put('/api/v1/calls/agent/status').send({ status: 'available' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/calls/agent/status', () => {
    it('should return agent presence', async () => {
      const res = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('available');
    });

    it('should reject unauthenticated', async () => {
      const res = await unauthRequest(app).get('/api/v1/calls/agent/status');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/calls/manual-dial', () => {
    it('should create a manual call', async () => {
      const res = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
        campaignId: agent.campaignId,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.state).toBe('queued');
      expect(res.body.data.agentId).toBe(agent.userId);
      expect(res.body.data.leadId).toBe(agent.leadId);
    });

    it('should mark agent as busy after dial', async () => {
      await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const statusRes = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(statusRes.body.data.status).toBe('busy');
    });

    it('should reject dial when agent already has active call', async () => {
      await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const res = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      expect(res.status).toBe(409);
    });

    it('should reject invalid lead', async () => {
      const res = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: 'nonexistent-lead',
        phoneNumber: agent.phoneNumber,
      });
      expect(res.status).toBe(404);
    });

    it('should reject phone not belonging to lead', async () => {
      const res = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: '+19999999999',
      });
      expect(res.status).toBe(400);
    });

    it('should reject invalid campaign', async () => {
      const res = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
        campaignId: 'nonexistent-campaign',
      });
      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated', async () => {
      const res = await unauthRequest(app).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      expect(res.status).toBe(401);
    });

    it('should reject missing fields', async () => {
      const res = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/calls/:id', () => {
    it('should retrieve a call by id', async () => {
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const callId = dialRes.body.data.id;
      const res = await authRequest(app, agent.token).get(`/api/v1/calls/${callId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(callId);
    });

    it('should return 404 for missing call', async () => {
      const res = await authRequest(app, agent.token).get('/api/v1/calls/nonexistent-call');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/calls', () => {
    it('should list calls for the agent', async () => {
      await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const res = await authRequest(app, agent.token).get('/api/v1/calls');
      expect(res.status).toBe(200);
      expect(res.body.data.calls.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const res = await authRequest(app, agent.token).get('/api/v1/calls?skip=0&take=1');
      expect(res.status).toBe(200);
      expect(res.body.data.calls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('DELETE /api/v1/calls/:id', () => {
    it('should cancel an active call', async () => {
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const callId = dialRes.body.data.id;
      const res = await authRequest(app, agent.token).delete(`/api/v1/calls/${callId}`);
      expect(res.status).toBe(200);
    });

    it('should reject cancelling a missing call', async () => {
      const res = await authRequest(app, agent.token).delete('/api/v1/calls/nonexistent-call');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/calls/:id/disposition', () => {
    it('should reject disposition on a non-terminal call', async () => {
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const callId = dialRes.body.data.id;
      const res = await authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({
        dispositionId: agent.dispositionId,
      });
      expect(res.status).toBe(400);
    });

    it('should reject disposition on missing call', async () => {
      const res = await authRequest(app, agent.token).post('/api/v1/calls/nonexistent-call/disposition').send({
        dispositionId: agent.dispositionId,
      });
      expect(res.status).toBe(404);
    });

    it('should reject duplicate disposition', async () => {
      const prisma = testDb.getPrisma();
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const callId = dialRes.body.data.id;
      await prisma.callSession.update({ where: { id: callId }, data: { state: 'completed', completedAt: new Date() } });
      await authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({ dispositionId: agent.dispositionId });
      const res = await authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({ dispositionId: agent.dispositionId });
      expect(res.status).toBe(409);
    });

    it('should return agent to available after disposition', async () => {
      const prisma = testDb.getPrisma();
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const callId = dialRes.body.data.id;
      await prisma.callSession.update({ where: { id: callId }, data: { state: 'completed', completedAt: new Date() } });
      await prisma.agentPresence.update({ where: { tenantId_agentId: { tenantId: agent.tenantId, agentId: agent.userId } }, data: { status: 'wrap_up' } });
      await authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({ dispositionId: agent.dispositionId });
      const statusRes = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(statusRes.body.data.status).toBe('available');
    });
  });
});
