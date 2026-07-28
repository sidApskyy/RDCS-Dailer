import { ConflictException, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@rdcs/database';

import { PrismaService } from '../../prisma/prisma.service';
import { ComplianceEngineService } from '../compliance/compliance-engine.service';

import { ManualDialDto } from './dto/manual-dial.dto';
import { transition } from './state-machine';
import { TELEPHONY_ADAPTER, TelephonyAdapter } from './telephony.adapter';
import { TelephonyEvents } from './telephony.events';
import { CallState, AgentPresence } from './telephony.types';

const terminalStates = new Set<CallState>([
  CallState.Completed, CallState.Busy, CallState.Failed, CallState.Cancelled, CallState.NoAnswer, CallState.Timeout, CallState.Disposed,
]);

@Injectable()
export class TelephonyService {
  constructor(
      private readonly prisma: PrismaService,
    private readonly compliance: ComplianceEngineService,
    @Inject(TELEPHONY_ADAPTER) private readonly adapter: TelephonyAdapter,
    private readonly events: TelephonyEvents,
  ) {}

  private readonly eventQueues = new Map<string, Promise<void>>();

  async manualDial(tenantId: string, agentId: string, dto: ManualDialDto): Promise<unknown> {
    const agent = await this.prisma.user.findFirst({ where: { tenantId, id: agentId, deletedAt: null } });
    if (!agent) throw new NotFoundException('Agent not found');

    const lead = await this.prisma.lead.findFirst({
      where: { tenantId, id: dto.leadId, deletedAt: null },
      include: { phones: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!lead.phones.some((phone) => phone.phoneNumber === dto.phoneNumber)) throw new BadRequestException('Phone number does not belong to lead');

    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findFirst({ where: { tenantId, id: dto.campaignId } });
      if (!campaign) throw new NotFoundException('Campaign not found');
    }

    const eligibility = await this.compliance.checkLeadEligibility(tenantId, lead.id, dto.phoneNumber, {
      checkDNC: true,
      checkConsent: true,
      checkCallingWindow: true,
      checkTimezone: true,
      campaignId: dto.campaignId,
      timezone: lead.timezone,
    });
    if (!eligibility.eligible) {
      await this.prisma.audit.create({ data: { tenantId, userId: agentId, action: 'call.compliance_blocked', resource: 'Lead', resourceId: lead.id, metadata: { phoneNumber: dto.phoneNumber, reason: eligibility.reason, rule: eligibility.rule } } });
      throw new BadRequestException(`Lead is not eligible: ${eligibility.reason}`);
    }

    let call;
    try {
      call = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.agentPresence.updateMany({
        where: { tenantId, agentId, status: AgentPresence.Available },
        data: { status: AgentPresence.Busy },
      });
      if (claimed.count !== 1) throw new ConflictException('Agent is not available for manual dialing');

      const active = await tx.callSession.findFirst({
        where: { tenantId, agentId, state: { in: [CallState.Queued, CallState.Dialing, CallState.Ringing, CallState.Connected, CallState.OnHold] } },
        select: { id: true },
      });
      if (active) throw new ConflictException('Agent already has an active call');

      const previousAttempt = await tx.leadAttempt.findFirst({ where: { tenantId, leadId: lead.id }, orderBy: { attemptNumber: 'desc' }, select: { attemptNumber: true } });
      const attempt = await tx.leadAttempt.create({
        data: { tenantId, agentId, leadId: lead.id, campaignId: dto.campaignId, phoneNumber: dto.phoneNumber, attemptNumber: (previousAttempt?.attemptNumber || 0) + 1, source: 'manual', startedAt: new Date() },
      });
      const created = await tx.callSession.create({
        data: { tenantId, agentId, leadId: lead.id, campaignId: dto.campaignId, phoneNumber: dto.phoneNumber, attemptId: attempt.id, state: CallState.Queued },
      });
      await tx.audit.create({ data: { tenantId, userId: agentId, action: 'call.created', resource: 'CallSession', resourceId: created.id, metadata: { leadId: lead.id, phoneNumber: dto.phoneNumber } } });
      return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
        throw new ConflictException('Agent already has an active call');
      }
      throw error;
    }
    this.emit(call.id, tenantId, agentId, CallState.Queued);

    const subscription = this.adapter.events(call.id).subscribe((event) => { this.enqueueEvent(event); });
    try {
      const result = await this.adapter.dial({ callId: call.id, tenantId, agentId, leadId: lead.id, campaignId: dto.campaignId, phoneNumber: dto.phoneNumber });
      await this.prisma.callSession.update({ where: { id: call.id }, data: { providerRef: result.providerRef } });
    } catch (error) {
      subscription.unsubscribe();
      const completedAt = new Date();
      const reason = error instanceof Error ? error.message : 'adapter failure';
      await this.prisma.callSession.update({ where: { id: call.id }, data: { state: CallState.Failed, terminationReason: reason, completedAt } });
      if (call.attemptId) await this.prisma.leadAttempt.update({ where: { id: call.attemptId }, data: { outcome: CallState.Failed, endedAt: completedAt } });
      await this.prisma.audit.create({ data: { tenantId, userId: agentId, action: 'call.failed', resource: 'CallSession', resourceId: call.id, metadata: { reason } } });
      await this.setPresence(tenantId, agentId, AgentPresence.WrapUp);
      throw error;
    }
    return this.getCall(tenantId, call.id);
  }

  async cancel(tenantId: string, agentId: string, id: string): Promise<unknown> {
    const call = await this.getCall(tenantId, id);
    if (call.agentId !== agentId) throw new NotFoundException('Call not found');
    if (terminalStates.has(call.state as CallState)) {
      await this.waitForEvents(id);
      throw new BadRequestException('Call is already terminated');
    }
    await this.adapter.cancel(id);
    await this.waitForEvents(id);
    return this.getCall(tenantId, id);
  }

  async getCall(tenantId: string, id: string): Promise<{ agentId: string; state: string }> {
    const call = await this.prisma.callSession.findFirst({ where: { tenantId, id }, include: { lead: true, campaign: true, agent: true, disposition: true } });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async listCalls(tenantId: string, agentId: string, skip = 0, take = 50): Promise<{ calls: unknown[]; total: number }> {
    const [calls, total] = await Promise.all([
      this.prisma.callSession.findMany({ where: { tenantId, agentId }, orderBy: { createdAt: 'desc' }, skip, take, include: { lead: true, campaign: true, disposition: true } }),
      this.prisma.callSession.count({ where: { tenantId, agentId } }),
    ]);
    return { calls, total };
  }

  async setPresence(tenantId: string, agentId: string, status: AgentPresence) {
    const presence = await this.prisma.agentPresence.upsert({ where: { tenantId_agentId: { tenantId, agentId } }, update: { status }, create: { tenantId, agentId, status } });
    await this.prisma.audit.create({ data: { tenantId, userId: agentId, action: 'agent.status_changed', resource: 'AgentPresence', resourceId: presence.id, metadata: { status } } });
    this.events.emit({ type: 'agent.status_changed', callId: '', tenantId, agentId, state: CallState.Idle, occurredAt: new Date() });
    return presence;
  }

  async setAgentStatus(tenantId: string, agentId: string, status: AgentPresence) {
    if ([AgentPresence.Busy, AgentPresence.OnCall].includes(status)) throw new BadRequestException('Busy states are managed by call lifecycle');
    return this.setPresence(tenantId, agentId, status);
  }

  async getPresence(tenantId: string, agentId: string) {
    return this.prisma.agentPresence.findUnique({ where: { tenantId_agentId: { tenantId, agentId } } });
  }

  async dispose(tenantId: string, agentId: string, id: string, dispositionId: string) {
    const call = await this.getCall(tenantId, id);
    if (call.agentId !== agentId) throw new NotFoundException('Call not found');
    if (call.state === CallState.Disposed) throw new ConflictException('Call disposition was already submitted');
    if (!terminalStates.has(call.state as CallState)) throw new BadRequestException('Call must be terminated before disposition');
    const updated = await this.prisma.callSession.updateMany({ where: { id, tenantId, agentId, state: { in: [CallState.Completed, CallState.Busy, CallState.Failed, CallState.Cancelled, CallState.NoAnswer, CallState.Timeout] } }, data: { dispositionId, state: CallState.Disposed } });
    if (updated.count !== 1) throw new ConflictException('Call disposition was already submitted');
    const disposed = await this.prisma.callSession.findFirst({ where: { id, tenantId }, select: { attemptId: true } });
    if (disposed?.attemptId) await this.prisma.leadAttempt.update({ where: { id: disposed.attemptId }, data: { dispositionId, endedAt: new Date() } });
    await this.setPresence(tenantId, agentId, AgentPresence.Available);
    await this.prisma.audit.create({ data: { tenantId, userId: agentId, action: 'call.dispositioned', resource: 'CallSession', resourceId: id, metadata: { dispositionId } } });
    return this.getCall(tenantId, id);
  }

  private enqueueEvent(event: import('./telephony.types').CallEvent): void {
    const previous = this.eventQueues.get(event.callId) || Promise.resolve();
    const next = previous.then(() => this.handleEvent(event)).catch(() => undefined);
    this.eventQueues.set(event.callId, next);
    void next.finally(() => {
      if (this.eventQueues.get(event.callId) === next) this.eventQueues.delete(event.callId);
    });
  }

  private async waitForEvents(callId: string): Promise<void> {
    await this.eventQueues.get(callId);
  }

  private async handleEvent(event: import('./telephony.types').CallEvent): Promise<void> {
    const call = await this.prisma.callSession.findFirst({ where: { id: event.callId, tenantId: event.tenantId } });
    if (!call || call.state === event.state) return;
    try { transition(call.state as CallState, event.state); } catch { return; }
    const now = event.occurredAt;
    const data: Record<string, unknown> = { state: event.state };
    if (event.providerRef) data.providerRef = event.providerRef;
    if (event.state === CallState.Dialing) data.dialingAt = now;
    if (event.state === CallState.Ringing) data.ringingAt = now;
    if (event.state === CallState.Connected) data.connectedAt = now;
    if (terminalStates.has(event.state)) { data.completedAt = now; data.terminationReason = event.state; }
    if (event.state === CallState.Completed && call.connectedAt) data.duration = Math.max(0, Math.floor((now.getTime() - call.connectedAt.getTime()) / 1000));
    await this.prisma.callSession.update({ where: { id: call.id }, data });
    if (terminalStates.has(event.state) && call.attemptId) {
      await this.prisma.leadAttempt.update({ where: { id: call.attemptId }, data: { outcome: event.state, duration: typeof data.duration === 'number' ? data.duration : undefined, endedAt: now, providerRef: event.providerRef } });
    }
    if (terminalStates.has(event.state)) {
      await this.prisma.audit.create({ data: { tenantId: call.tenantId, userId: call.agentId, action: `call.${event.state}`, resource: 'CallSession', resourceId: call.id, metadata: { providerRef: event.providerRef } } });
    }
    this.emit(call.id, call.tenantId, call.agentId, event.state, event.providerRef);
    if (terminalStates.has(event.state) && event.state !== CallState.Disposed) await this.setPresence(call.tenantId, call.agentId, AgentPresence.WrapUp);
  }

  private emit(callId: string, tenantId: string, agentId: string, state: CallState, providerRef?: string): void {
    const eventTypes: Record<CallState, import('./telephony.types').CallEventType> = {
      [CallState.Idle]: 'call.disposed', [CallState.Queued]: 'call.created', [CallState.Dialing]: 'call.dialing', [CallState.Ringing]: 'call.ringing', [CallState.Connected]: 'call.connected', [CallState.OnHold]: 'call.connected', [CallState.Completed]: 'call.completed', [CallState.Busy]: 'call.failed', [CallState.Failed]: 'call.failed', [CallState.Cancelled]: 'call.cancelled', [CallState.NoAnswer]: 'call.failed', [CallState.Timeout]: 'call.failed', [CallState.Disposed]: 'call.disposed',
    };
    const type = eventTypes[state];
    this.events.emit({ type, callId, tenantId, agentId, state, occurredAt: new Date(), providerRef });
  }
}
