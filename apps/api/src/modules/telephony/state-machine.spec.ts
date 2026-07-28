import { canTransition, transition } from './state-machine';
import { CallState } from './telephony.types';

describe('call state machine', () => {
  it.each([
    [CallState.Idle, CallState.Queued],
    [CallState.Queued, CallState.Dialing], [CallState.Queued, CallState.Cancelled], [CallState.Queued, CallState.Timeout], [CallState.Queued, CallState.Failed],
    [CallState.Dialing, CallState.Ringing], [CallState.Dialing, CallState.Failed], [CallState.Dialing, CallState.Cancelled], [CallState.Dialing, CallState.Timeout],
    [CallState.Ringing, CallState.Connected], [CallState.Ringing, CallState.Failed], [CallState.Ringing, CallState.Cancelled], [CallState.Ringing, CallState.NoAnswer], [CallState.Ringing, CallState.Timeout],
    [CallState.Connected, CallState.Completed], [CallState.Connected, CallState.Failed], [CallState.Connected, CallState.Cancelled], [CallState.Connected, CallState.OnHold],
    [CallState.OnHold, CallState.Connected], [CallState.OnHold, CallState.Completed], [CallState.OnHold, CallState.Failed], [CallState.OnHold, CallState.Cancelled],
    [CallState.Completed, CallState.Disposed], [CallState.Busy, CallState.Disposed], [CallState.Failed, CallState.Disposed], [CallState.Cancelled, CallState.Disposed], [CallState.NoAnswer, CallState.Disposed], [CallState.Timeout, CallState.Disposed],
  ])('accepts %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(transition(from, to)).toBe(to);
  });

  it.each([
    [CallState.Completed, CallState.Connected], [CallState.Disposed, CallState.Queued], [CallState.Disposed, CallState.Disposed],
    [CallState.Dialing, CallState.Completed], [CallState.Ringing, CallState.Disposed], [CallState.Connected, CallState.Dialing],
  ])('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => transition(from, to)).toThrow('Illegal call state transition');
  });
});
