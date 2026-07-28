import { Inject, Injectable, Optional } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import { TelephonyAdapter } from './telephony.adapter';
import { CallCapabilities, CallCommand, CallEvent, CallEventType, CallResult, CallState } from './telephony.types';

export type MockOutcome = 'connected' | 'busy' | 'no_answer' | 'failed' | 'timeout';

export interface MockTelephonyAdapterOptions {
  outcome?: MockOutcome;
  latencyMs?: number;
  randomFailureRate?: number;
}

export const MOCK_TELEPHONY_OPTIONS = 'MOCK_TELEPHONY_OPTIONS';

interface MockCall {
  command: CallCommand;
  providerRef: string;
  subject: Subject<CallEvent>;
  timers: NodeJS.Timeout[];
}

@Injectable()
export class MockTelephonyAdapter implements TelephonyAdapter {
  readonly capabilities: CallCapabilities = {
    manualDial: true,
    cancel: true,
    hold: false,
    recording: false,
    transfer: false,
  };

  private readonly calls = new Map<string, MockCall>();
  private readonly options: Required<MockTelephonyAdapterOptions>;

  constructor(@Optional() @Inject(MOCK_TELEPHONY_OPTIONS) options: MockTelephonyAdapterOptions = {}) {
    this.options = { outcome: options.outcome || 'connected', latencyMs: options.latencyMs || 75, randomFailureRate: options.randomFailureRate || 0 };
  }

  async dial(command: CallCommand): Promise<CallResult> {
    const providerRef = `mock-${command.callId}`;
    const mockCall: MockCall = {
      command,
      providerRef,
      subject: new Subject<CallEvent>(),
      timers: [],
    };
    this.calls.set(command.callId, mockCall);
    const latency = this.options.latencyMs;
    const outcome = Math.random() < this.options.randomFailureRate ? 'failed' : this.options.outcome;
    mockCall.timers.push(setTimeout(() => this.emit(mockCall, 'call.dialing', CallState.Dialing), 0));
    mockCall.timers.push(setTimeout(() => this.emit(mockCall, 'call.ringing', CallState.Ringing), latency));
    if (outcome === 'connected') {
      mockCall.timers.push(setTimeout(() => this.emit(mockCall, 'call.connected', CallState.Connected), latency * 2));
      mockCall.timers.push(setTimeout(() => this.finish(mockCall, CallState.Completed), latency * 6));
    } else {
      const terminalState: Record<Exclude<MockOutcome, 'connected'>, CallState> = { busy: CallState.Busy, no_answer: CallState.NoAnswer, failed: CallState.Failed, timeout: CallState.Timeout };
      mockCall.timers.push(setTimeout(() => this.finish(mockCall, terminalState[outcome]), outcome === 'timeout' ? latency * 12 : latency * 2));
    }
    return { providerRef, acceptedAt: new Date() };
  }

  private finish(mockCall: MockCall, state: CallState): void {
    this.emit(mockCall, state === CallState.Completed ? 'call.completed' : 'call.failed', state);
    mockCall.timers.push(setTimeout(() => {
      this.emit(mockCall, 'call.disposed', CallState.Disposed);
      mockCall.subject.complete();
      this.calls.delete(mockCall.command.callId);
    }, 1));
  }

  async cancel(callId: string): Promise<void> {
    const mockCall = this.calls.get(callId);
    if (!mockCall) return;
    mockCall.timers.forEach(clearTimeout);
    this.emit(mockCall, 'call.cancelled', CallState.Cancelled);
    this.emit(mockCall, 'call.disposed', CallState.Disposed);
    mockCall.subject.complete();
    this.calls.delete(callId);
  }

  events(callId: string): Observable<CallEvent> {
    return this.calls.get(callId)?.subject.asObservable() ?? new Observable<CallEvent>((subscriber) => subscriber.complete());
  }

  private emit(mockCall: MockCall, type: CallEventType, state: CallState): void {
    mockCall.subject.next({
      type,
      callId: mockCall.command.callId,
      tenantId: mockCall.command.tenantId,
      agentId: mockCall.command.agentId,
      state,
      occurredAt: new Date(),
      providerRef: mockCall.providerRef,
    });
  }
}
