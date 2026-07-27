import { CallState } from './telephony.types';

const transitions: Record<CallState, readonly CallState[]> = {
  [CallState.Idle]: [CallState.Queued],
  [CallState.Queued]: [CallState.Dialing, CallState.Cancelled, CallState.Timeout, CallState.Failed],
  [CallState.Dialing]: [CallState.Ringing, CallState.Connected, CallState.Busy, CallState.NoAnswer, CallState.Failed, CallState.Cancelled, CallState.Timeout],
  [CallState.Ringing]: [CallState.Connected, CallState.Busy, CallState.NoAnswer, CallState.Failed, CallState.Cancelled, CallState.Timeout],
  [CallState.Connected]: [CallState.OnHold, CallState.Completed, CallState.Failed, CallState.Cancelled],
  [CallState.OnHold]: [CallState.Connected, CallState.Completed, CallState.Cancelled, CallState.Failed],
  [CallState.Completed]: [CallState.Disposed],
  [CallState.Busy]: [CallState.Disposed],
  [CallState.Failed]: [CallState.Disposed],
  [CallState.Cancelled]: [CallState.Disposed],
  [CallState.NoAnswer]: [CallState.Disposed],
  [CallState.Timeout]: [CallState.Disposed],
  [CallState.Disposed]: [],
};

export function canTransition(from: CallState, to: CallState): boolean {
  return transitions[from].includes(to);
}

export function transition(from: CallState, to: CallState): CallState {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal call state transition: ${from} -> ${to}`);
  }
  return to;
}

export function allowedTransitions(from: CallState): readonly CallState[] {
  return transitions[from];
}
