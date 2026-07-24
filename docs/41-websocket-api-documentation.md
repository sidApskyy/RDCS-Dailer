# 41 — WebSocket API Documentation

**Document Control**

| Property | Value |
|----------|-------|
| Title | WebSocket API Documentation |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the WebSocket API for the RDCS In-House Dialer Platform. WebSocket is used for real-time communication between the server and connected clients (agents, supervisors, dashboards).

## 2. Technology

- **Server**: Socket.IO gateway running as a dedicated NestJS service.
- **Client**: Socket.IO client in the Next.js web application.
- **Transport**: WebSocket with HTTP long-polling fallback.
- **Scaling**: Redis adapter for cross-server broadcast.
- **Authentication**: JWT token passed in handshake auth payload or query parameter.

## 3. Connection URL

```
wss://ws.rdcs.example.com/
```

or via Nginx:

```
wss://app.rdcs.example.com/socket.io/
```

## 4. Namespaces

| Namespace | Purpose | Authorized Users |
|-----------|---------|------------------|
| `/` | Default namespace (health, connection metadata) | All authenticated |
| `/agents` | Agent call state, lead card, controls | Agents |
| `/supervisors` | Monitoring, listen, whisper, barge, team metrics | Supervisors |
| `/dashboard` | Live dashboard metrics and alerts | Operations, supervisors, admins |
| `/admin` | System health, audit, admin events | System admins |

## 5. Authentication Handshake

### Client

```javascript
const socket = io('wss://ws.rdcs.example.com/agents', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIs...'
  },
  transports: ['websocket']
});
```

### Server Validation

1. Extract token from handshake `auth.token` or `token` query parameter.
2. Validate JWT signature and expiration.
3. Extract `tenantId`, `userId`, `roles`, `permissions`.
4. Check user status and tenant status.
5. Join appropriate rooms based on user context.
6. Reject connection with `401` if invalid.

## 6. Room Structure

Clients are automatically joined to rooms based on context:

| Room | Pattern | Members |
|------|---------|---------|
| Tenant | `tenant:{tenantId}` | All users in tenant |
| Organization | `org:{organizationId}` | Users in organization |
| Department | `dept:{departmentId}` | Users in department |
| Team | `team:{teamId}` | Team members |
| User | `user:{userId}` | Single user's sessions |
| Agent | `agent:{agentId}` | Single agent's sessions |
| Campaign | `campaign:{campaignId}` | Users subscribed to campaign |

## 7. Client-to-Server Events

### 7.1 Agent Namespace

| Event | Payload | Description | Response |
|-------|---------|-------------|----------|
| `agent:status` | `{ status: 'available' | 'away' | 'wrap-up' }` | Update agent status | Broadcast `agent:status_changed` |
| `agent:ready` | `{ campaignId?: string }` | Signal ready for next call | Server may emit `call:offer` |
| `agent:accept_call` | `{ callId: string }` | Accept offered call | Initiates call setup |
| `agent:skip_preview` | `{ leadId: string, reason?: string }` | Skip preview lead | Lead dispositioned as skipped |
| `agent:wrap_up` | `{ callId: string }` | Complete wrap-up | Status becomes available |
| `agent:ping` | `{}` | Heartbeat | Server responds with `agent:pong` |

### 7.2 Supervisor Namespace

| Event | Payload | Description | Response |
|-------|---------|-------------|----------|
| `supervisor:subscribe_team` | `{ teamId: string }` | Subscribe to team updates | Join team room |
| `supervisor:unsubscribe_team` | `{ teamId: string }` | Unsubscribe | Leave team room |
| `supervisor:listen` | `{ callId: string }` | Start listening to call | `monitor:started` |
| `supervisor:whisper` | `{ callId: string }` | Start whisper to agent | `monitor:started` |
| `supervisor:barge` | `{ callId: string }` | Barge into call | `monitor:started` |
| `supervisor:stop_monitor` | `{ callId: string }` | Stop monitoring | `monitor:stopped` |
| `supervisor:send_message` | `{ agentId: string, message: string }` | Send message to agent | `agent:message` |
| `supervisor:pause_agent` | `{ agentId: string }` | Pause agent's calls | `agent:status_changed` |
| `supervisor:resume_agent` | `{ agentId: string }` | Resume agent | `agent:status_changed` |

### 7.3 Dashboard Namespace

| Event | Payload | Description | Response |
|-------|---------|-------------|----------|
| `dashboard:subscribe` | `{ campaignId?: string, departmentId?: string }` | Subscribe to metrics | `dashboard:metrics` |
| `dashboard:unsubscribe` | `{ campaignId?: string }` | Unsubscribe | Leave room |
| `dashboard:ping` | `{}` | Heartbeat | `dashboard:pong` |

### 7.4 Admin Namespace

| Event | Payload | Description | Response |
|-------|---------|-------------|----------|
| `admin:subscribe_health` | `{}` | Subscribe to health updates | `admin:health_update` |
| `admin:subscribe_audit` | `{}` | Subscribe to audit stream | `admin:audit_event` |

## 8. Server-to-Client Events

### 8.1 Agent Namespace

| Event | Payload | Description |
|-------|---------|-------------|
| `call:offer` | `{ callId, leadId, lead: {...}, campaignId, mode }` | Offer a new call to agent |
| `call:ringing` | `{ callId, phoneNumber }` | Call is ringing |
| `call:answered` | `{ callId, leadId, startTime }` | Call answered, conversation begins |
| `call:voicemail` | `{ callId, leadId }` | Voicemail/AMD detected |
| `call:completed` | `{ callId, duration, disposition }` | Call ended |
| `call:failed` | `{ callId, reason }` | Call failed |
| `lead:present` | `{ leadId, lead: {...}, script }` | Present lead for preview dialer |
| `disposition:required` | `{ callId, campaignId }` | Prompt for disposition |
| `recording:started` | `{ callId, recordingId }` | Recording started |
| `recording:stopped` | `{ callId, recordingId }` | Recording stopped |
| `recording:available` | `{ callId, recordingId, duration }` | Recording available for playback |
| `callback:due` | `{ callbackId, leadId, scheduledAt }` | Callback coming due |
| `agent:status_changed` | `{ agentId, status, previousStatus, timestamp }` | Agent status change |
| `agent:message` | `{ fromUserId, message, timestamp }` | Message from supervisor |
| `agent:error` | `{ code, message }` | Error notification |

### 8.2 Supervisor Namespace

| Event | Payload | Description |
|-------|---------|-------------|
| `team:agent_status` | `{ agentId, status, currentCallId, duration }` | Agent status update |
| `team:metrics` | `{ teamId, activeCalls, availableAgents, callsToday, abandonRate }` | Team metrics |
| `team:call_started` | `{ callId, agentId, leadId, startTime }` | Agent started call |
| `team:call_ended` | `{ callId, agentId, duration, disposition }` | Agent ended call |
| `team:alert` | `{ type, message, campaignId }` | Team alert (e.g., abandon rate) |
| `monitor:started` | `{ callId, monitorMode, recordingId? }` | Monitoring started |
| `monitor:stopped` | `{ callId }` | Monitoring stopped |
| `monitor:audio_stream` | `{ streamUrl, token }` | Audio stream for listen/whisper/barge |
| `supervisor:error` | `{ code, message }` | Error notification |

### 8.3 Dashboard Namespace

| Event | Payload | Description |
|-------|---------|-------------|
| `dashboard:metrics` | `{ activeAgents, callsInProgress, queueDepth, dialsPerMinute, connectionRate, abandonRate, avgHandleTime, campaigns: [...] }` | Live metrics update |
| `dashboard:campaign_update` | `{ campaignId, status, leadsRemaining, metrics }` | Campaign status change |
| `dashboard:alert` | `{ severity, type, message, campaignId }` | Dashboard alert |
| `dashboard:pong` | `{ timestamp }` | Heartbeat response |

### 8.4 Admin Namespace

| Event | Payload | Description |
|-------|---------|-------------|
| `admin:health_update` | `{ services: [...], status }` | Health status update |
| `admin:audit_event` | `{ actorId, action, resourceType, resourceId, timestamp }` | Audit event stream |
| `admin:queue_depth` | `{ queueName, depth, activeWorkers }` | Queue health |
| `admin:alert` | `{ severity, message }` | System alert |

## 9. Event Payload Examples

### 9.1 `call:offer`

```json
{
  "callId": "call_123",
  "leadId": "lead_456",
  "campaignId": "camp_789",
  "mode": "progressive",
  "lead": {
    "id": "lead_456",
    "firstName": "Alice",
    "lastName": "Johnson",
    "phone": "+15551234567",
    "customFields": { "accountNumber": "A12345" }
  },
  "script": "Hello {firstName}, this is...",
  "timestamp": "2026-07-21T10:00:00Z"
}
```

### 9.2 `agent:status_changed`

```json
{
  "agentId": "usr_123",
  "status": "on-call",
  "previousStatus": "available",
  "currentCallId": "call_123",
  "timestamp": "2026-07-21T10:00:05Z"
}
```

### 9.3 `dashboard:metrics`

```json
{
  "activeAgents": 45,
  "callsInProgress": 38,
  "queueDepth": 120,
  "dialsPerMinute": 120,
  "connectionRate": 0.42,
  "abandonRate": 0.02,
  "averageHandleTimeSeconds": 185,
  "campaigns": [
    {
      "campaignId": "camp_789",
      "name": "Summer Sales 2026",
      "activeAgents": 20,
      "callsInProgress": 18,
      "connectionRate": 0.45
    }
  ],
  "timestamp": "2026-07-21T10:00:05Z"
}
```

## 10. Connection Lifecycle

1. Client connects to namespace with JWT.
2. Server authenticates and joins rooms.
3. Server emits `connection:established` with room assignments.
4. Client subscribes to relevant resources (teams, campaigns, dashboard).
5. Server pushes real-time events as they occur.
6. Client sends heartbeat every 30 seconds; server responds with pong.
7. On disconnect, server updates presence and leaves rooms.
8. Client reconnects with exponential backoff on unexpected disconnect.

## 11. Error Handling

- Invalid token: connection rejected with `connect_error` containing `401`.
- Unauthorized event: server emits `error:unauthorized` and ignores event.
- Invalid payload: server emits `error:validation` with details.
- Rate limit: server emits `error:rate_limited` and may disconnect.

## 12. Scalability

- Socket.IO Redis adapter enables multi-server broadcast.
- Room-based routing minimizes fan-out.
- High-frequency events batched for dashboard updates (every 5 seconds).
- Presence TTL in Redis prevents stale data after disconnect.

## 13. Security

- All WebSocket connections over WSS (TLS).
- JWT validation on every handshake.
- Events filtered by tenant and scope before emission.
- Listen/whisper/barge require explicit permission and audit logging.
- No sensitive PII in event payloads beyond what is necessary.
- Connection limits per user and tenant to prevent abuse.

## 14. Monitoring

- Connected clients per namespace.
- Events emitted/received per second.
- Connection duration and disconnect reasons.
- Redis adapter lag and broadcast failures.
- Error rates and unauthorized attempts.

## 15. Client Implementation Notes

- Use Socket.IO client with reconnection strategy.
- Cache connection state in Zustand store.
- Handle reconnection by re-subscribing to resources.
- Degrade gracefully to polling if WebSocket unavailable.
- Display connection status indicator in UI.

## 16. Future Enhancements

- WebRTC signaling for agent calls over WebSocket.
- Binary message support for audio streams.
- Presence across multiple namespaces.
- Federation across regions for global deployments.
