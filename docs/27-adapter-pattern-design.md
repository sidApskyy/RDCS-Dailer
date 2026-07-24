# 27 — Adapter Pattern Design

**Document Control**

| Property | Value |
|----------|-------|
| Title | Adapter Pattern Design |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the Adapter Pattern design for the telephony layer of the RDCS In-House Dialer Platform. The adapter abstracts ViciDial/Asterisk and other telephony engines so the application layer is engine-agnostic.

## 2. Intent

- Decouple the in-house dialer business logic from any specific telephony engine.
- Enable swap/replacement of ViciDial with Asterisk ARI, FreeSWITCH, Twilio, Amazon Connect, Genesys Cloud, or generic SIP providers without changing application code.
- Centralize telephony-specific concerns in a single layer.
- Simplify testing by mocking the adapter interface.

## 3. Adapter Interface

```typescript
// telephony/telephony-adapter.interface.ts

export interface ITelephonyAdapter {
  readonly name: string;

  initialize(config: AdapterConfig): Promise<void>;
  shutdown(): Promise<void>;

  // Connection / Registration
  registerEndpoint(endpoint: EndpointRegistration): Promise<RegistrationResult>;
  unregisterEndpoint(endpointId: string): Promise<void>;

  // Call Control
  originate(request: OriginateRequest): Promise<CallResult>;
  hangup(callId: string): Promise<void>;
  answer(callId: string): Promise<void>;
  hold(callId: string): Promise<void>;
  resume(callId: string): Promise<void>;
  mute(callId: string): Promise<void>;
  unmute(callId: string): Promise<void>;
  sendDtmf(callId: string, digits: string): Promise<void>;

  // Transfer & Conference
  blindTransfer(callId: string, destination: string): Promise<void>;
  warmTransferInitiate(callId: string, destination: string): Promise<CallResult>;
  warmTransferComplete(callId: string, transferCallId: string): Promise<void>;
  warmTransferCancel(callId: string, transferCallId: string): Promise<void>;
  conference(callId: string, otherCallId: string): Promise<void>;

  // Recording
  startRecording(callId: string, options?: RecordingOptions): Promise<void>;
  stopRecording(callId: string): Promise<void>;
  pauseRecording(callId: string): Promise<void>;
  resumeRecording(callId: string): Promise<void>;

  // Monitoring
  listen(callId: string, supervisorEndpointId: string): Promise<void>;
  whisper(callId: string, supervisorEndpointId: string): Promise<void>;
  barge(callId: string, supervisorEndpointId: string): Promise<void>;
  stopMonitor(callId: string, supervisorEndpointId: string): Promise<void>;

  // Event Subscription
  onEvent(handler: TelephonyEventHandler): void;
  offEvent(handler: TelephonyEventHandler): void;
}

export type TelephonyEventHandler = (event: TelephonyEvent) => void | Promise<void>;
```

## 4. Request/Response Types

```typescript
export interface OriginateRequest {
  callId: string;
  tenantId: string;
  campaignId: string;
  leadId: string;
  agentId?: string;
  destination: string; // phone number or URI
  callerId: string;
  timeout: number;
  recordCall: boolean;
  customVariables?: Record<string, string>;
}

export interface CallResult {
  callId: string;
  telephonySessionId: string;
  status: 'initiated' | 'failed';
  failureReason?: string;
}

export interface EndpointRegistration {
  endpointId: string;
  tenantId: string;
  userId: string;
  type: 'webrtc' | 'sip' | 'softphone';
  credentials?: SipCredentials;
}

export interface RegistrationResult {
  endpointId: string;
  registered: boolean;
  sipUri?: string;
  wsUri?: string;
}

export interface RecordingOptions {
  format?: 'wav' | 'mp3';
  mix?: boolean;
  beepOnStart?: boolean;
  beepOnStop?: boolean;
}
```

## 5. Event Types

```typescript
export type TelephonyEvent =
  | CallInitiatedEvent
  | CallRingingEvent
  | CallAnsweredEvent
  | CallCompletedEvent
  | VoicemailDetectedEvent
  | HumanDetectedEvent
  | CallFailedEvent
  | RecordingStartedEvent
  | RecordingAvailableEvent
  | EndpointRegisteredEvent
  | EndpointUnregisteredEvent
  | DtmfReceivedEvent
  | TransferCompletedEvent
  | ConferenceJoinedEvent;

export interface CallInitiatedEvent {
  type: 'CALL_INITIATED';
  callId: string;
  telephonySessionId: string;
  timestamp: string;
}

export interface CallAnsweredEvent {
  type: 'CALL_ANSWERED';
  callId: string;
  telephonySessionId: string;
  timestamp: string;
}

export interface CallCompletedEvent {
  type: 'CALL_COMPLETED';
  callId: string;
  telephonySessionId: string;
  durationSeconds: number;
  reason: 'hangup' | 'busy' | 'noanswer' | 'congestion' | 'cancel' | 'error';
  timestamp: string;
}

export interface VoicemailDetectedEvent {
  type: 'VOICEMAIL_DETECTED';
  callId: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface RecordingAvailableEvent {
  type: 'RECORDING_AVAILABLE';
  callId: string;
  recordingId: string;
  filePath: string;
  durationSeconds: number;
  format: string;
  timestamp: string;
}
```

## 6. Adapter Factory

```typescript
@Injectable()
export class TelephonyAdapterFactory {
  constructor(
    @Inject(VICIDIAL_ADAPTER) private vicidialAdapter: ITelephonyAdapter,
    @Inject(ASTERISK_ARI_ADAPTER) private asteriskAriAdapter: ITelephonyAdapter,
    @Inject(TWILIO_ADAPTER) private twilioAdapter: ITelephonyAdapter,
  ) {}

  getAdapter(engine: TelephonyEngine, tenantId?: string): ITelephonyAdapter {
    switch (engine) {
      case 'vicidial':
        return this.vicidialAdapter;
      case 'asterisk-ari':
        return this.asteriskAriAdapter;
      case 'twilio':
        return this.twilioAdapter;
      default:
        throw new Error(`Unsupported telephony engine: ${engine}`);
    }
  }
}
```

## 7. Adapter Implementations

### 7.1 ViciDial Adapter

- Uses AMI for call control.
- Reads ViciDial database for CDR/agent state reconciliation.
- Subscribes to AMI events and translates to platform events.
- Records via Asterisk Monitor/MixMonitor.

### 7.2 Asterisk ARI Adapter

- Uses ARI over HTTP/WebSocket for channel control.
- Implements Stasis application logic for call flows.
- Direct Asterisk integration without ViciDial.

### 7.3 FreeSWITCH Adapter

- Uses ESL (Event Socket Library) for control.
- Translates FreeSWITCH events to platform events.
- Uses `mod_event_socket` and `mod_dptools`.

### 7.4 Twilio Voice Adapter

- Uses Twilio REST API for call origination.
- Uses Twilio StatusCallback webhooks for events.
- Uses Twilio Media Streams for recording/transcription.

### 7.5 Amazon Connect Adapter

- Uses Connect Streams and Contact APIs.
- Handles agent connections and call events via AWS SDK.

### 7.6 Genesys Cloud Adapter

- Uses Genesys Cloud Platform API.
- Handles outbound calls, agent state, and events.

### 7.7 Generic SIP Provider Adapter

- Uses a SIP library (e.g., drachtio, jssip) or SIP proxy.
- Configurable registrar, proxy, and codec settings.

## 8. Adapter Selection

Adapter selection is configured per tenant or per campaign:

```typescript
interface TelephonyConfig {
  tenantId: string;
  engine: TelephonyEngine;
  settings: Record<string, unknown>;
}
```

This allows gradual migration: one tenant uses ViciDial while another uses Twilio, without application changes.

## 9. Mock Adapter for Testing

A mock adapter implements `ITelephonyAdapter` and simulates events:

```typescript
@Injectable()
export class MockTelephonyAdapter implements ITelephonyAdapter {
  name = 'mock';
  private handlers: TelephonyEventHandler[] = [];

  async originate(request: OriginateRequest): Promise<CallResult> {
    setTimeout(() => this.emit({ type: 'CALL_INITIATED', callId: request.callId, telephonySessionId: 'mock-1', timestamp: new Date().toISOString() }), 100);
    setTimeout(() => this.emit({ type: 'CALL_ANSWERED', callId: request.callId, telephonySessionId: 'mock-1', timestamp: new Date().toISOString() }), 2000);
    return { callId: request.callId, telephonySessionId: 'mock-1', status: 'initiated' };
  }

  // ... other methods

  private emit(event: TelephonyEvent) {
    this.handlers.forEach(h => h(event));
  }

  onEvent(handler: TelephonyEventHandler) { this.handlers.push(handler); }
  offEvent(handler: TelephonyEventHandler) { this.handlers = this.handlers.filter(h => h !== handler); }
}
```

## 10. Error Translation

Each adapter translates engine-specific errors into platform error codes:

| Asterisk Cause | Platform Code | Description |
|----------------|---------------|-------------|
| `CHANUNAVAIL` | `CHANNEL_UNAVAILABLE` | Trunk/channel unavailable |
| `BUSY` | `BUSY` | Called party busy |
| `NOANSWER` | `NO_ANSWER` | No answer within timeout |
| `CONGESTION` | `CONGESTION` | Network congestion |
| `NORMAL_CLEARING` | `HANGUP` | Normal hangup |
| `ORIGINATOR_CANCEL` | `CANCELLED` | Caller cancelled |

| Twilio Status | Platform Code |
|---------------|---------------|
| `queued` | `INITIATED` |
| `ringing` | `RINGING` |
| `in-progress` | `ANSWERED` |
| `completed` | `COMPLETED` |
| `busy` | `BUSY` |
| `failed` | `FAILED` |
| `no-answer` | `NO_ANSWER` |

## 11. Adapter Lifecycle

1. Application bootstrap loads adapter configuration.
2. Adapter factory initializes the selected adapter.
3. Adapter establishes connection to telephony engine.
4. Adapter subscribes to events and registers handlers.
5. Application services call adapter methods for call control.
6. Adapter publishes events to the application event bus.
7. On shutdown, adapter closes connections gracefully.

## 12. Testing Strategy

- Unit tests for each adapter's event translator.
- Integration tests with a local Asterisk container.
- Mock adapter for application layer unit tests.
- Contract tests ensuring all adapters emit the same event set for the same scenarios.

## 13. Benefits

- **Vendor Independence**: Swap telephony engines without rewriting business logic.
- **Testability**: Mock adapter enables full application testing without telephony infrastructure.
- **Parallel Development**: Teams can work on application and telephony adapters independently.
- **Risk Mitigation**: Reduces lock-in and simplifies future migrations.
- **Multi-Tenant Flexibility**: Different tenants can use different engines.
