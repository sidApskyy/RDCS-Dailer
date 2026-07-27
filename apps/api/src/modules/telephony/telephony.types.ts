export enum CallState {
  Idle = 'idle', Queued = 'queued', Dialing = 'dialing', Ringing = 'ringing', Connected = 'connected', OnHold = 'on_hold', Completed = 'completed', Busy = 'busy', Failed = 'failed', Cancelled = 'cancelled', NoAnswer = 'no_answer', Timeout = 'timeout', Disposed = 'disposed',
}

export enum AgentPresence {
  Offline = 'offline', Available = 'available', Busy = 'busy', OnCall = 'on_call', Paused = 'paused', WrapUp = 'wrap_up',
}

export type CallEventType = 'call.created' | 'call.dialing' | 'call.ringing' | 'call.connected' | 'call.completed' | 'call.failed' | 'call.cancelled' | 'call.disposed' | 'agent.status_changed';

export interface CallCommand { callId: string; tenantId: string; agentId: string; leadId: string; phoneNumber: string; campaignId?: string; }
export interface CallResult { providerRef: string; acceptedAt: Date; }
export interface CallFailure { code: string; message: string; retryable: boolean; }
export interface CallEvent { type: CallEventType; callId: string; tenantId: string; agentId: string; state: CallState; occurredAt: Date; providerRef?: string; failure?: CallFailure; }
export interface CallCapabilities { manualDial: boolean; cancel: boolean; hold: boolean; recording: boolean; transfer: boolean; }
