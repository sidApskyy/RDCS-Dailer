import { canTransition, transition } from './state-machine';
import { CallState } from './telephony.types';

describe('call state machine', () => {
  it('accepts the manual call path', () => {
    expect(canTransition(CallState.Queued, CallState.Dialing)).toBe(true);
    expect(transition(CallState.Connected, CallState.Completed)).toBe(CallState.Completed);
  });

  it('rejects illegal transitions', () => {
    expect(() => transition(CallState.Completed, CallState.Connected)).toThrow('Illegal call state transition');
  });
});
