import { BadRequestException, ConflictException } from '@nestjs/common';

import { TelephonyService } from './telephony.service';
import { AgentPresence, CallState } from './telephony.types';

describe('TelephonyService hardening', () => {
  const lead = {
    id: 'lead-1', tenantId: 'tenant-1', timezone: 'UTC', deletedAt: null,
    phones: [{ id: 'phone-1', phoneNumber: '+10000000000', isPrimary: true }],
  };

  function createDependencies(overrides: Record<string, unknown> = {}) {
    const adapter = { dial: jest.fn().mockResolvedValue({ providerRef: 'mock-1', acceptedAt: new Date() }), cancel: jest.fn(), events: jest.fn(() => ({ subscribe: jest.fn() })) };
    const tx = {
      agentPresence: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      callSession: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'call-1' }) },
      leadAttempt: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'attempt-1' }) },
      audit: { create: jest.fn() },
    };
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'agent-1', tenantId: 'tenant-1' }) },
      lead: { findFirst: jest.fn().mockResolvedValue(lead) },
      campaign: { findFirst: jest.fn() },
      agentPresence: { findUnique: jest.fn().mockResolvedValue({ status: AgentPresence.Available }), upsert: jest.fn().mockResolvedValue({ id: 'presence-1', status: AgentPresence.Busy }) },
      callSession: { findFirst: jest.fn().mockResolvedValue({ id: 'call-1', agentId: 'agent-1', state: CallState.Completed, attemptId: 'attempt-1' }), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      leadAttempt: { update: jest.fn() },
      audit: { create: jest.fn() },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      ...overrides,
    };
    const compliance = { checkLeadEligibility: jest.fn().mockResolvedValue({ eligible: true, reason: 'ok', rule: 'ELIGIBLE' }) };
    const events = { emit: jest.fn(), on: jest.fn() };
    return { service: new TelephonyService(prisma as never, compliance as never, adapter as never, events as never), prisma, tx, adapter, compliance, events };
  }

  it('claims availability and creates the call plus linked attempt in one transaction', async () => {
    const { service, tx, adapter } = createDependencies();
    await service.manualDial('tenant-1', 'agent-1', { leadId: 'lead-1', phoneNumber: '+10000000000' });
    expect(tx.agentPresence.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: AgentPresence.Available }) }));
    expect(tx.leadAttempt.create).toHaveBeenCalled();
    expect(tx.callSession.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ attemptId: 'attempt-1' }) }));
    expect(adapter.dial).toHaveBeenCalledTimes(1);
  });

  it('rejects a concurrent dial when the transactional availability claim loses', async () => {
    const { service, tx, adapter } = createDependencies();
    tx.agentPresence.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.manualDial('tenant-1', 'agent-1', { leadId: 'lead-1', phoneNumber: '+10000000000' })).rejects.toBeInstanceOf(ConflictException);
    expect(adapter.dial).not.toHaveBeenCalled();
  });

  it('audits and blocks an ineligible call before creating a session', async () => {
    const { service, tx, compliance, adapter, prisma } = createDependencies();
    compliance.checkLeadEligibility.mockResolvedValue({ eligible: false, reason: 'DNC blocked', rule: 'DNC_BLOCKED' });
    await expect(service.manualDial('tenant-1', 'agent-1', { leadId: 'lead-1', phoneNumber: '+10000000000' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.audit.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'call.compliance_blocked' }) }));
    expect(tx.callSession.create).not.toHaveBeenCalled();
    expect(adapter.dial).not.toHaveBeenCalled();
  });
});
