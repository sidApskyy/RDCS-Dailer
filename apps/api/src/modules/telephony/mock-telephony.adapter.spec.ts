import { MockTelephonyAdapter } from './mock-telephony.adapter';
import { CallState } from './telephony.types';

describe('MockTelephonyAdapter', () => {
  it('emits a complete manual call lifecycle', async () => {
    jest.useFakeTimers();
    const adapter = new MockTelephonyAdapter();
    const events: CallState[] = [];
    await adapter.dial({ callId: 'call-1', tenantId: 'tenant-1', agentId: 'agent-1', leadId: 'lead-1', phoneNumber: '+10000000000' });
    adapter.events('call-1').subscribe((event) => events.push(event.state));
    jest.advanceTimersByTime(600);
    expect(events).toEqual([CallState.Dialing, CallState.Ringing, CallState.Connected, CallState.Completed, CallState.Disposed]);
    jest.useRealTimers();
  });

  it('cancels an active call', async () => {
    const adapter = new MockTelephonyAdapter();
    await adapter.dial({ callId: 'call-2', tenantId: 'tenant-1', agentId: 'agent-1', leadId: 'lead-1', phoneNumber: '+10000000000' });
    const events: CallState[] = [];
    adapter.events('call-2').subscribe((event) => events.push(event.state));
    await adapter.cancel('call-2');
    expect(events).toEqual([CallState.Cancelled, CallState.Disposed]);
  });
});
