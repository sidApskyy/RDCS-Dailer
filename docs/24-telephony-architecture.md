# 24 — Telephony Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Telephony Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the telephony architecture for the RDCS In-House Dialer Platform. ViciDial and Asterisk are used only as the telephony execution engine, while all business logic is implemented in the in-house application layer behind a vendor-neutral adapter.

## 2. Design Principles

- **Business Logic Isolation**: No campaign, lead, or disposition logic in ViciDial custom code.
- **Adapter Abstraction**: All telephony interactions go through `ITelephonyAdapter`.
- **Multi-Provider Support**: Future support for Asterisk ARI, FreeSWITCH, Twilio, Amazon Connect, Genesys Cloud, and SIP providers.
- **Event-Driven**: Telephony events flow to the application layer via adapters and Redis.
- **Reliability**: Redundant trunks, carriers, and media servers.

## 3. Telephony Components

| Component | Role | Technology |
|-----------|------|------------|
| Application Telephony Service | Initiates and controls calls; processes events | NestJS + Telephony Adapter |
| Telephony Adapter Layer | Abstracts telephony engines | TypeScript interface + adapters |
| ViciDial Manager | Agent screen pop, database, dialer disabled | ViciDial on Ubuntu |
| Asterisk | Media server, SIP signaling, recording, AMD | Asterisk LTS |
| SIP Trunks | Carrier connectivity | Telnyx, Twilio Elastic SIP, SignalWire |
| DID Routing | Inbound number routing (future) | Asterisk / Carrier |
| Recording Capture | Call recording files | Asterisk Monitor + S3/MinIO upload |

## 4. Telephony Adapter Layer

The adapter layer exposes a stable interface to the application. See `27-adapter-pattern-design.md` for the full interface.

```
┌─────────────────────────────────────┐
│        Application Layer            │
│  (Dialer, Call, Recording modules)   │
└─────────────┬───────────────────────┘
              │ ITelephonyAdapter
┌─────────────▼───────────────────────┐
│      Telephony Adapter Layer        │
│  (ViciDial, Asterisk ARI, Twilio,   │
│   FreeSWITCH, Amazon Connect, etc.) │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         Telephony Engine              │
│      (ViciDial/Asterisk Day 1)        │
└─────────────────────────────────────┘
```

## 5. ViciDial Role

ViciDial is used as the telephony engine only. The following ViciDial features are used:

- Agent login/logout and phone registration (used for authentication bridging, but controlled by in-house auth).
- Asterisk manager integration (AMI) for call control.
- Database tables for CDRs and agent states (read-only by adapter).
- WebRTC/SIP phone support for agents.
- Call recording file capture by Asterisk.

The following are NOT used from ViciDial:
- ViciDial campaign management (replaced by in-house campaign module).
- ViciDial lead management (replaced by in-house lead module).
- ViciDial disposition logic (replaced by in-house disposition module).
- ViciDial reports (replaced by in-house reporting).
- ViciDial user management (replaced by in-house auth/RBAC).

## 6. Asterisk Role

Asterisk handles:
- SIP registration and trunking.
- Call origination and termination.
- Media handling (RTP).
- Answering Machine Detection (AMD).
- Call recording (`Monitor`/`MixMonitor`).
- Hold, mute, transfer, conference.
- DTMF handling.
- CDR/CEL generation.

## 7. Call Control Flow

### 7.1 Outbound Call

1. Application Dialer Service decides to call a lead.
2. Telephony Adapter receives `originate()` command.
3. ViciDial/Asterisk adapter sends AMI `Originate` or AGI action.
4. Asterisk routes the call through the configured SIP trunk.
5. Asterisk emits events: `Dial`, `Ringing`, `Answer`, `Hangup`, `AMD`.
6. Adapter translates events to platform domain events and publishes to Redis.
7. Application updates call state, lead state, and agent state.
8. On answer, agent is connected via WebRTC/SIP phone.

### 7.2 Inbound Call (Future)

1. Call arrives at carrier DID.
2. Asterisk routes to queue or agent.
3. Adapter receives event and notifies application.
4. Application determines routing (ACD rules, future).

## 8. Agent Phone Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| WebRTC | Browser-based softphone | Primary agent mode |
| SIP Hardphone | Physical SIP phone | Supervisor/operations |
| SIP Softphone | External softphone | BYOD / backup |
| External Transfer | Bridge to external number | Escalations |

## 9. SIP Trunking

- Multiple SIP trunks from Telnyx, Twilio Elastic SIP, SignalWire for redundancy.
- Least-cost routing and carrier failover.
- Caller ID rotation across trunks and DIDs.
- Capacity monitoring per trunk.

## 10. Recording Architecture

- Asterisk `MixMonitor` records calls to local files.
- Recording completion event triggers upload worker.
- Worker uploads file to S3/MinIO with metadata.
- Recording metadata (path, duration, encryption key) stored in PostgreSQL.
- Playback served via signed URLs or streaming proxy.

## 11. Answering Machine Detection (AMD)

- Asterisk AMD application analyzes audio after answer.
- Result: `MACHINE`, `HUMAN`, `NOTSURE`, `HANGUP`.
- Adapter maps to platform events: `voicemail.detected`, `human.detected`.
- Dialer applies system disposition or routes to agent accordingly.

## 12. Telephony Event Flow

```
Asterisk
  │ AMI/ARI events
  ▼
Telephony Adapter
  │ translates to domain events
  ▼
Redis Pub/Sub or BullMQ
  │
  ├─> Application Call Service (state update)
  ├─> Socket.IO Gateway (push to clients)
  ├─> Recording Worker (upload)
  ├─> Dialer Worker (next decision)
  └─> Audit/Analytics (event logging)
```

## 13. Scalability

- Asterisk nodes can be added horizontally; calls distributed by adapter routing logic.
- SIP proxies or SBCs manage carrier connections and NAT traversal.
- ViciDial manager runs as a central coordinator; multiple Asterisk servers register to it.
- Media servers can be regionally distributed for latency.

## 14. High Availability

- Active/active Asterisk cluster with shared database.
- Multiple SIP trunks with automatic failover.
- Recording files replicated to object storage immediately.
- ViciDial manager with hot standby (or active/passive with shared storage).

## 15. Security

- SIP-TLS and SRTP where supported by carriers.
- Asterisk management interfaces restricted to application servers.
- AMI credentials rotated and stored in secret manager.
- WebRTC media over DTLS-SRTP.
- Fraud detection and rate limiting on SIP trunks.

## 16. Monitoring

- Asterisk channel usage, active calls, queue depth.
- SIP trunk status and quality (packet loss, latency, jitter).
- AMD accuracy and recording success rate.
- Adapter event latency and error rate.

## 17. Carrier Integration Checklist

- SIP trunk credentials and IP whitelist.
- Caller ID registration and verification.
- DID routing configuration.
- RTP port range and firewall rules.
- Codec preferences (G.711, G.722, Opus for WebRTC).
- E911 and regulatory requirements.
- Billing and capacity monitoring.

## 18. Future Telephony Options

Because of the adapter layer, the following can be added without changing application logic:
- **Asterisk ARI**: Direct ARI control for advanced call flows.
- **FreeSWITCH**: FreeSWITCH adapter for mod_event_socket and ESL.
- **Twilio Voice**: Twilio REST API and TwiML adapter.
- **Amazon Connect**: Connect Streams and contact flow API adapter.
- **Genesys Cloud**: Genesys Cloud API adapter.
- **Generic SIP Provider**: SIP trunk adapter with configurable registrar/proxy.
