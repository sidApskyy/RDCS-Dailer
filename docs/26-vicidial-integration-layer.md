# 26 — ViciDial Integration Layer

**Document Control**

| Property | Value |
|----------|-------|
| Title | ViciDial Integration Layer |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the ViciDial integration layer for the RDCS In-House Dialer Platform. ViciDial is used only as a telephony execution engine, while all business logic is retained in the in-house application layer.

## 2. Integration Scope

### In Scope (ViciDial/Asterisk as Engine)

- Asterisk media handling and SIP signaling.
- Agent phone registration (WebRTC/SIP).
- Call origination via AMI/AGI.
- Call state event capture via AMI/ARI/CDR/CEL.
- Answering Machine Detection (AMD).
- Call recording capture via Asterisk Monitor/MixMonitor.
- Reading ViciDial database tables for CDRs and agent states (read-only).

### Out of Scope (In-House Logic)

- Campaign management, lead management, dialer pacing, and dispositions.
- User authentication, authorization, and RBAC.
- Reporting, analytics, and compliance logic.
- Recording storage, playback, and AI processing.
- Webhooks, CRM integration, and notifications.

## 3. ViciDial Configuration Strategy

To prevent business logic leakage into ViciDial:

- Campaigns in ViciDial are configured as pass-through or minimal placeholders.
- ViciDial's built-in dialer is disabled or not used; the in-house dialer controls origination.
- Lead data is not imported into ViciDial; leads are stored in the in-house PostgreSQL database.
- Dispositions are recorded in the in-house application, not ViciDial.
- Agent screens are replaced by the in-house Next.js web application; ViciDial agent screens are not used.

## 4. Integration Architecture

```
┌─────────────────────────────────────────┐
│         In-House Application            │
│  (Campaign, Lead, Dialer, Call, etc.)   │
└─────────────┬───────────────────────────┘
              │ ITelephonyAdapter
┌─────────────▼───────────────────────────┐
│      ViciDial/Asterisk Adapter          │
│  - AMI/AGI client                       │
│  - ARI client (optional)                │
│  - Database event reader                │
│  - CDR/CEL reconciler                   │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│           ViciDial / Asterisk           │
│  - Manager / Web interface (minimal)   │
│  - Asterisk media servers               │
│  - Database (CDR/CEL/agent state)       │
└─────────────────────────────────────────┘
```

## 5. AMI/AGI Integration

### 5.1 AMI Connection

The adapter maintains a persistent TCP connection to Asterisk Manager Interface (AMI) on port 5038 (or 5039 for TLS).

Actions used:
- `Originate`: Start outbound calls.
- `Hangup`: End calls.
- `Pause/Unpause`: Hold handling.
- `Mute/Unmute`: Mute handling.
- `Redirect`: Transfers.
- `PlayDTMF`: Send digits.
- `Monitor`/`StopMonitor`: Recording control.
- `Queue` (future): Inbound queue management.

Events subscribed:
- `Dial`, `Ringing`, `Answer`, `Hangup`, `Bridge`, `Unbridge`.
- `AMD` events (if using AMD application).
- `MonitorStart`, `MonitorStop` for recording.
- `VarSet` for custom variables.

### 5.2 AGI Scripts (if needed)

Minimal AGI scripts may be used for:
- Passing custom variables from Asterisk to the adapter.
- Triggering adapter webhooks on call events.
- Custom AMD or whisper logic.

AGI scripts call the in-house API and do not contain business logic.

### 5.3 ARI (Optional Future)

Asterisk REST Interface (ARI) can be used for more modern control:
- Channel creation and manipulation.
- Stasis applications for complex call flows.
- WebSocket event subscription.

The adapter can be extended to support ARI while keeping the same `ITelephonyAdapter` interface.

## 6. ViciDial Database Read Model

The adapter reads select ViciDial tables for reconciliation and event sourcing, but does not write business data.

| Table | Read Purpose | Notes |
|-------|--------------|-------|
| `vicidial_log` | Outbound call logs / CDRs | Reconcile with in-house call records. |
| `vicidial_closer_log` | Inbound call logs (future) | Inbound reconciliation. |
| `vicidial_agent_log` | Agent state and activity | Cross-check agent login/logout. |
| `recording_log` | Recording references | Cross-check recording file names. |
| `vicidial_users` | Agent mapping (read-only) | Map ViciDial agent IDs to in-house users. |

## 7. Agent Phone Bridging

### 7.1 WebRTC Agent

- Agent logs into the in-house web app.
- Web app receives SIP/WebRTC credentials from the backend.
- Agent browser registers to Asterisk via WSS (PJSIP WebSocket transport).
- On answer, Asterisk bridges the outbound call to the agent's WebRTC channel.

### 7.2 SIP Agent

- Agent uses SIP hardphone or softphone.
- SIP credentials provisioned by the in-house system.
- Agent registers to Asterisk via SIP UDP/TCP/TLS.
- Outbound calls bridged to the agent's SIP endpoint.

## 8. Mapping In-House to ViciDial

| In-House Concept | ViciDial/Asterisk Concept | Mapping |
|------------------|---------------------------|---------|
| Agent | vicidial_users | User ID mapping |
| Campaign | vicidial_campaigns | Placeholder ID only |
| Lead | External phone number | Dialed via Originate |
| Call | Channel / CDR | Channel ID / unique call ID |
| Disposition | In-house only | Not written to ViciDial |
| Recording | recording_log | File path cross-reference |
| Agent Status | vicidial_agent_log | Login/logout cross-reference |

## 9. ViciDial Minimal Setup

To use ViciDial purely as engine:

1. Install ViciDial and Asterisk on Ubuntu servers.
2. Configure carriers/SIP trunks in Asterisk.
3. Create minimal campaigns in ViciDial (one per dialing mode or one global placeholder).
4. Create agent users mapped to in-house users.
5. Disable ViciDial auto-dialing if not using ViciDial's dialer.
6. Configure AMI/AGI/ARI users for the adapter.
7. Ensure Asterisk can write recordings to shared storage.
8. Configure CDR/CEL to PostgreSQL or local database readable by adapter.

## 10. Adapter Implementation Details

### 10.1 Connection Manager

Maintains AMI connection, reconnects on failure, and buffers events during reconnect.

### 10.2 Event Translator

Maps Asterisk/ViciDial events to platform domain events:

| Asterisk/ViciDial Event | Platform Domain Event |
|-------------------------|------------------------|
| `Dial` with `SubEvent: Begin` | `CallInitiated` |
| `Dial` with `SubEvent: End` + `DialStatus: ANSWER` | `CallAnswered` |
| `Hangup` | `CallCompleted` |
| `AMD` with `AMDSTATUS: MACHINE` | `VoicemailDetected` |
| `AMD` with `AMDSTATUS: HUMAN` | `HumanDetected` |
| `MonitorStop` + file path | `RecordingAvailable` |
| `AgentLogin` / `AgentLogout` | `AgentStatusChanged` |

### 10.3 Idempotency

Events are processed idempotently using call IDs and event sequence numbers to prevent duplicate state updates during reconnects or retries.

## 11. Error Handling

- AMI connection loss: buffer events, reconnect with exponential backoff, replay missed events via CDR reconciliation.
- Call origination failure: map Asterisk cause codes to platform call states (busy, no-answer, failed).
- Timeout handling: apply no-answer disposition if answer timeout exceeded.
- Carrier failure: retry on alternate trunk or mark failed.

## 12. Performance Considerations

- AMI events are high-volume; adapter processes asynchronously.
- Use event queuing to decouple Asterisk event handling from application logic.
- Connection pooling for AMI if multiple Asterisk servers are used.
- CDR reconciliation runs periodically to catch missed events.

## 13. Security

- AMI credentials stored in secret manager.
- AMI over TLS (port 5039) in production.
- IP whitelist for AMI/AGI/ARI access.
- WebRTC over WSS with DTLS-SRTP.
- No direct public access to ViciDial web interface; restrict to admin VPN.

## 14. Migration Path Away from ViciDial

Because all business logic is in the in-house layer, migration to another engine requires only:
1. Implement a new adapter for the target engine (Asterisk ARI, FreeSWITCH, Twilio, etc.).
2. Configure tenant/adapter mapping.
3. Gradually migrate traffic (campaign by campaign or tenant by tenant).
4. Decommission ViciDial when no traffic remains.

No frontend, business logic, or database changes are required.
