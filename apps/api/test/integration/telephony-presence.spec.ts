import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import { AgentPresence } from '../../src/modules/telephony/telephony.types';
import { createTestApp, closeTestApp, seedAgentWithLead, authRequest, SeededAgent } from '../helpers/telephony-test-helper';
import { testDb } from '../setup';

describe('Phase 4 — Agent Presence Acceptance Tests', () => {
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
      dispositionId: 'disp-1',
    });
  });

  describe('Initial Presence', () => {
    it('should have available status after seeding', async () => {
      const res = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AgentPresence.Available);
    });
  });

  describe('User-Managed Status Transitions', () => {
    it('should allow available -> paused', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'paused' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AgentPresence.Paused);
    });

    it('should allow paused -> available', async () => {
      await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'paused' });
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'available' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AgentPresence.Available);
    });

    it('should allow available -> offline', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'offline' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AgentPresence.Offline);
    });

    it('should allow offline -> available', async () => {
      await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'offline' });
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'available' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AgentPresence.Available);
    });

    it('should allow available -> wrap_up', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'wrap_up' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(AgentPresence.WrapUp);
    });
      it('should allow wrap_up -> available', async () => {
        await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'wrap_up' });
        const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'available' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe(AgentPresence.Available);
      });
  });

  describe('Lifecycle-Managed Status Restrictions', () => {
    it('should reject manual busy status', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'busy' });
      expect(res.status).toBe(400);
    });

    it('should reject manual on_call status', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'on_call' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid status value', async () => {
      const res = await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('Lifecycle-Managed Transitions via Manual Dial', () => {
    it('should transition available -> busy on manual dial', async () => {
      await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const res = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(res.body.data.status).toBe(AgentPresence.Busy);
    });

    it('should transition to wrap_up after cancelling a call', async () => {
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      await authRequest(app, agent.token).delete(`/api/v1/calls/${dialRes.body.data.id}`);
      const res = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(res.body.data.status).toBe(AgentPresence.WrapUp);
    });

    it('should transition to available after disposition', async () => {
      const prisma = testDb.getPrisma();
      const dialRes = await authRequest(app, agent.token).post('/api/v1/calls/manual-dial').send({
        leadId: agent.leadId,
        phoneNumber: agent.phoneNumber,
      });
      const callId = dialRes.body.data.id;
      await prisma.callSession.update({ where: { id: callId }, data: { state: 'completed', completedAt: new Date() } });
      await prisma.agentPresence.update({
        where: { tenantId_agentId: { tenantId: agent.tenantId, agentId: agent.userId } },
        data: { status: 'wrap_up' },
      });
      await authRequest(app, agent.token).post(`/api/v1/calls/${callId}/disposition`).send({ dispositionId: agent.dispositionId });
      const res = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(res.body.data.status).toBe(AgentPresence.Available);
    });
  });

  describe('Presence Persistence', () => {
    it('should persist status across requests', async () => {
      await authRequest(app, agent.token).put('/api/v1/calls/agent/status').send({ status: 'paused' });
      const res1 = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      const res2 = await authRequest(app, agent.token).get('/api/v1/calls/agent/status');
      expect(res1.body.data.status).toBe(AgentPresence.Paused);
      expect(res2.body.data.status).toBe(AgentPresence.Paused);
    });
  });
});
