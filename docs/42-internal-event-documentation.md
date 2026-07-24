# 42 — Internal Event Documentation

**Document Control**

| Property | Value |
|----------|-------|
| Title | Internal Event Documentation |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document catalogs the internal events used within the RDCS In-House Dialer Platform. Internal events are published and consumed by application modules, workers, and real-time gateways via Redis Pub/Sub and BullMQ.

## 2. Event Schema

All internal events share a common envelope:

```json
{
  "eventId": "uuid",
  "eventType": "EventName",
  "tenantId": "ten_xxx",
  "correlationId": "corr_xxx",
  "timestamp": "2026-07-21T10:00:00Z",
  "version": 1,
  "payload": { ... }
}
```

## 3. Event Categories

### 3.1 Identity & Organization Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `UserRegistered` | userId, email, tenantId | Auth Module | Audit, Notification |
| `UserActivated` | userId, tenantId | User Module | Audit, Notification |
| `UserDeactivated` | userId, tenantId, reason | User Module | Audit, Socket.IO, Dialer |
| `UserLoggedIn` | userId, tenantId, ip, userAgent | Auth Module | Audit |
| `UserLoggedOut` | userId, tenantId, sessionId | Auth Module | Audit, Socket.IO |
| `TenantProvisioned` | tenantId, name, adminUserId | Tenant Module | Audit, Notification, Billing |
| `TenantSuspended` | tenantId, reason | Admin Module | Audit, Socket.IO |
| `RoleAssigned` | userId, roleId, tenantId | RBAC Module | Audit, Socket.IO |
| `RoleRevoked` | userId, roleId, tenantId | RBAC Module | Audit, Socket.IO |

### 3.2 Campaign Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `CampaignCreated` | campaignId, tenantId, departmentId | Campaign Module | Audit, Webhook |
| `CampaignActivated` | campaignId, tenantId | Campaign Module | Dialer, Audit, Socket.IO, Webhook |
| `CampaignPaused` | campaignId, tenantId, reason | Campaign Module | Dialer, Audit, Socket.IO, Webhook |
| `CampaignResumed` | campaignId, tenantId | Campaign Module | Dialer, Audit, Socket.IO |
| `CampaignCompleted` | campaignId, tenantId | Campaign Module | Audit, Reporting, Webhook |
| `CampaignArchived` | campaignId, tenantId | Campaign Module | Audit, Reporting |
| `CampaignUpdated` | campaignId, tenantId, changedFields | Campaign Module | Audit, Socket.IO |
| `CallerIdAdded` | campaignId, callerIdId | Campaign Module | Audit |
| `CallerIdRemoved` | campaignId, callerIdId | Campaign Module | Audit |

### 3.3 Lead Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `LeadImported` | leadListId, tenantId, totalRows, validRows | Lead Module | Audit, Reporting, Dialer, Webhook |
| `LeadValidated` | leadId, tenantId, status, errors | Lead Module | Audit, Dialer |
| `LeadStatusChanged` | leadId, tenantId, oldStatus, newStatus | Lead Module | Dialer, Audit, Socket.IO, Webhook |
| `LeadAssigned` | leadId, tenantId, assignedToUserId/teamId | Lead Module | Audit, Socket.IO, Dialer |
| `LeadRecycled` | leadId, tenantId, recycleAttempt | Lead Module | Dialer, Audit |
| `DncMatchFound` | leadId, dncEntryId, tenantId | Compliance Module | Lead Module, Audit, Socket.IO |
| `LeadExported` | tenantId, exportedBy, count | Lead Module | Audit |

### 3.4 Dialer Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `AgentStatusChanged` | agentId, tenantId, oldStatus, newStatus, campaignId | Dialer Module | Socket.IO, Reporting, Audit |
| `AgentReady` | agentId, tenantId, campaignId | Dialer Module | Dialer Worker, Socket.IO |
| `AgentNotReady` | agentId, tenantId, reason | Dialer Module | Dialer Worker |
| `PacingUpdated` | campaignId, tenantId, newPacingRate | Dialer Module | Socket.IO, Audit |
| `DialingDecisionMade` | campaignId, leadId, agentId | Dialer Module | Audit, Reporting |
| `CallOffered` | callId, leadId, agentId, campaignId | Dialer Module | Socket.IO |
| `LeadReserved` | leadId, agentId, callId | Dialer Module | Socket.IO, Lead Module |
| `LeadReleased` | leadId, callId | Dialer Module | Lead Module |

### 3.5 Call Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `CallInitiated` | callId, tenantId, campaignId, leadId, agentId | Telephony Adapter | Call Module, Socket.IO, Dialer |
| `CallRinging` | callId, tenantId, timestamp | Telephony Adapter | Socket.IO, Call Module |
| `CallAnswered` | callId, tenantId, answerTime | Telephony Adapter | Socket.IO, Call Module, Reporting |
| `CallCompleted` | callId, tenantId, duration, reason | Telephony Adapter | Call Module, Socket.IO, Dialer, Reporting, Webhook |
| `VoicemailDetected` | callId, tenantId, confidence | Telephony Adapter | Call Module, Dialer, Reporting |
| `HumanDetected` | callId, tenantId | Telephony Adapter | Dialer, Socket.IO |
| `DispositionSet` | callId, tenantId, dispositionId, leadStatus | Call Module | Reporting, Socket.IO, Webhook, Dialer |
| `CallbackScheduled` | callId, callbackId, leadId, agentId, scheduledAt | Call Module | Dialer, Socket.IO, Webhook |
| `CallTransferred` | callId, tenantId, fromAgentId, toDestination | Call Module | Socket.IO, Audit, Reporting |
| `CallRecordingStarted` | callId, recordingId | Call Module | Socket.IO |
| `CallRecordingPaused` | callId, recordingId | Call Module | Socket.IO |
| `CallRecordingResumed` | callId, recordingId | Call Module | Socket.IO |

### 3.6 Recording Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `RecordingAvailable` | recordingId, callId, tenantId, storagePath | Recording Module | AI Module, Socket.IO, Webhook |
| `RecordingUploaded` | recordingId, tenantId, fileSize, duration | Recording Worker | Recording Module, Audit |
| `RecordingDeleted` | recordingId, tenantId, deletedBy | Recording Module | Audit, Socket.IO |
| `RecordingRetentionDue` | recordingId, tenantId, retentionUntil | Recording Module | Retention Worker |

### 3.7 Compliance Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `DncListCreated` | dncListId, tenantId | Compliance Module | Audit |
| `DncEntryAdded` | dncEntryId, dncListId, tenantId, phoneNumber | Compliance Module | Lead Module (scrub), Audit, Socket.IO |
| `DncEntryRemoved` | dncEntryId, dncListId, tenantId | Compliance Module | Lead Module, Audit |
| `ComplianceViolation` | tenantId, campaignId, leadId, rule, timestamp | Compliance Module | Audit, Socket.IO, Notification |
| `AbandonRateExceeded` | campaignId, tenantId, currentRate, threshold | Compliance Module | Socket.IO, Notification, Dialer |
| `TimezoneViolation` | callId, tenantId, campaignId, leadId | Compliance Module | Audit, Notification |
| `ConsentRevoked` | leadId, tenantId, campaignId | Compliance Module | Recording Module, Audit |

### 3.8 Reporting & Analytics Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `MetricAggregated` | tenantId, campaignId, metric, value, timestamp | Analytics Worker | Reporting Module, Socket.IO |
| `ReportGenerated` | reportId, tenantId, generatedBy, format | Reporting Module | Audit, Notification, Webhook |
| `DashboardMetricUpdate` | tenantId, metrics, timestamp | Reporting Module | Socket.IO (Dashboard namespace) |
| `FunnelUpdated` | tenantId, campaignId, stageCounts | Analytics Module | Reporting, Socket.IO |

### 3.9 AI Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `TranscriptionRequested` | recordingId, tenantId | AI Module | AI Worker |
| `TranscriptionCompleted` | recordingId, transcriptId, tenantId | AI Worker | Recording Module, Socket.IO, Webhook |
| `SummaryGenerated` | recordingId, summaryId, tenantId | AI Worker | Recording Module, Socket.IO |
| `SentimentAnalyzed` | recordingId, sentimentId, tenantId | AI Worker | Recording Module, Reporting, Socket.IO |
| `QaScoreGenerated` | recordingId, scoreId, tenantId | AI Worker | QA Module, Socket.IO |
| `AutoDispositionSuggested` | callId, recordingId, suggestedDispositionId | AI Worker | Call Module, Socket.IO |

### 3.10 Integration & Webhook Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `WebhookSubscribed` | webhookId, tenantId, url | Webhook Module | Audit |
| `WebhookEventPublished` | eventId, webhookId, tenantId, eventType | Webhook Module | Webhook Worker |
| `WebhookDelivered` | deliveryId, webhookId, tenantId, status | Webhook Worker | Audit, Webhook Module |
| `WebhookFailed` | deliveryId, webhookId, tenantId, error | Webhook Worker | Audit, Notification |
| `IntegrationSynced` | integrationId, tenantId, direction, records | Integration Module | Audit, Webhook |
| `CrmLeadPushed` | integrationId, tenantId, leadId, crmId | Integration Module | Lead Module, Audit |

### 3.11 Notification Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `NotificationCreated` | notificationId, tenantId, userId, channel | Notification Module | Notification Worker |
| `NotificationSent` | notificationId, tenantId, channel, status | Notification Worker | Notification Module, Audit |
| `NotificationRead` | notificationId, userId, tenantId | Notification Module | Audit |

### 3.12 Audit Events

| Event Type | Payload | Producer | Consumers |
|------------|---------|----------|-----------|
| `AuditRecordCreated` | auditId, tenantId, actorId, action | Audit Module | Audit Log, Reporting |

## 4. Event Delivery Channels

| Channel | Use Case | Durability | Ordering |
|---------|----------|------------|----------|
| In-memory EventEmitter | Same-process handlers | None | Synchronous |
| Redis Pub/Sub | Cross-process real-time | None | Best-effort |
| BullMQ | Durable async jobs | Yes | Per-queue |
| Redis Streams | Event log / replay | Configurable | Ordered by stream |

## 5. Event Handling Rules

- Handlers should be idempotent.
- Handlers should validate tenant context before processing.
- Failed handlers must not crash the application; log and retry where appropriate.
- In-process handlers run synchronously within the request lifecycle.
- Out-of-process handlers run in BullMQ workers.
- Event payload should not include secrets or excessive PII.

## 6. Event Idempotency

- Every event has a unique `eventId`.
- Consumers track processed event IDs for a window (e.g., 24 hours) using Redis `SET` with TTL.
- BullMQ jobs deduplicate by event ID when possible.

## 7. Event Schema Evolution

- `version` field in envelope supports schema versioning.
- Consumers validate payload against expected version.
- Breaking changes require new event type or major version bump.
- Deprecated events maintained for at least one release cycle.

## 8. Example Event Producer

```typescript
const event = new CallCompletedEvent({
  callId: call.id.value,
  tenantId: call.tenantId.value,
  campaignId: call.campaignId.value,
  leadId: call.leadId?.value,
  agentId: call.agentId?.value,
  dispositionId: call.dispositionId?.value,
  durationSeconds: call.durationSeconds,
  timestamp: new Date().toISOString(),
});

await this.eventBus.publish(event);
```

## 9. Example Event Consumer

```typescript
@Injectable()
export class CallCompletedReportingHandler implements IEventHandler<CallCompletedEvent> {
  async handle(event: CallCompletedEvent): Promise<void> {
    await this.reportingService.incrementCounter({
      tenantId: event.tenantId,
      campaignId: event.campaignId,
      metric: 'calls_completed',
      value: 1,
      timestamp: event.timestamp,
    });
  }
}
```

## 10. Monitoring

- Events emitted/consumed per second per type.
- Event processing latency histograms.
- Failed event handler counts.
- Dead-letter queue sizes.
- Event ordering anomalies.
