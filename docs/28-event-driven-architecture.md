# 28 — Event-Driven Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Event-Driven Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the event-driven architecture for the RDCS In-House Dialer Platform. Events are used to decouple modules, propagate state changes, trigger async processing, and feed real-time systems.

## 2. Event Types

### 2.1 Domain Events

Domain events represent significant business occurrences emitted by aggregate roots after persistence. They are lightweight, immutable, and contain the minimal information needed for handlers.

Examples: `CampaignActivated`, `CallCompleted`, `LeadStatusChanged`, `RecordingAvailable`.

### 2.2 Integration Events

Integration events are emitted for external systems. They have a published schema, event IDs, timestamps, and tenant context. They are delivered via webhooks or external message bus.

Examples: `lead.created`, `call.completed`, `recording.available`.

### 2.3 Real-Time Events

Real-time events are pushed to connected clients via WebSocket. They are high-frequency and scoped to rooms/namespaces.

Examples: `agent.status_changed`, `call.ringing`, `dashboard.metric_update`.

### 2.4 Job Events

Job events are internal queue messages processed by BullMQ workers. They are durable and support retries.

Examples: `ProcessLeadImport`, `GenerateTranscript`, `DeliverWebhook`, `SendEmail`.

## 3. Event Bus

The event bus is the central mechanism for publishing and subscribing to events. It has two layers:

- **In-Memory Event Bus**: For events within the same process (domain events).
- **Distributed Event Bus**: Redis Pub/Sub for cross-process delivery and BullMQ for durable jobs.

```
┌─────────────────────────────────────┐
│          Domain Event Emitter         │
│       (aggregate.addDomainEvent)       │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│         In-Memory Event Bus           │
│    (NestJS EventEmitter / RxJS)      │
└─────────────┬───────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌──────────┐      ┌──────────┐
│ Handlers │      │  Redis   │
│ (same    │      │ Pub/Sub  │
│ process) │      │          │
└──────────┘      └────┬─────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
      ┌────────┐ ┌────────┐ ┌────────┐
      │Socket  │ │BullMQ  │ │Webhook │
      │Gateway │ │Workers │ │Service │
      └────────┘ └────────┘ └────────┘
```

## 4. Domain Event Flow

1. Aggregate root mutates state.
2. Aggregate adds a domain event to its internal event list.
3. Repository saves the aggregate.
4. Application service retrieves domain events.
5. Events published to in-memory event bus.
6. In-process handlers execute synchronously or asynchronously.
7. Events also serialized to Redis Pub/Sub for cross-process consumers.
8. BullMQ jobs created for durable async processing.

## 5. Event Schema

All events include:
- `eventId`: Unique UUID.
- `eventType`: String type.
- `tenantId`: Tenant context.
- `timestamp`: ISO 8601.
- `payload`: Event-specific data.
- `correlationId`: Trace context.
- `version`: Schema version.

Example:

```json
{
  "eventId": "evt_123456",
  "eventType": "CallCompleted",
  "tenantId": "ten_abc",
  "timestamp": "2026-07-21T10:00:00Z",
  "correlationId": "corr_789",
  "version": 1,
  "payload": {
    "callId": "call_123",
    "leadId": "lead_456",
    "agentId": "agent_789",
    "campaignId": "camp_001",
    "dispositionCode": "converted",
    "durationSeconds": 120
  }
}
```

## 6. Event Handlers

### 6.1 In-Process Handlers

Run within the same API request lifecycle. Used for immediate side effects that must be consistent with the transaction.

Examples:
- Update lead status when call completes.
- Write audit log entry.
- Update agent state.

### 6.2 Out-of-Process Handlers

Run in separate workers or processes. Used for async, durable, or cross-cutting concerns.

Examples:
- Upload recording to S3.
- Generate transcript via AI.
- Deliver webhook to CRM.
- Send email notification.
- Aggregate analytics metrics.

## 7. Redis Pub/Sub Usage

- Redis Pub/Sub channels are named by event type and tenant.
- Example channels: `events:tenant:ten_abc`, `events:global`.
- Socket.IO gateway subscribes to tenant-specific channels and pushes to client rooms.
- Workers subscribe to relevant channels for background processing.

## 8. BullMQ Job Events

BullMQ is used for durable, retryable background processing. Each job type has a dedicated queue.

| Queue | Job Types | Worker |
|-------|-----------|--------|
| `imports` | ProcessLeadImport, ValidateLeads | ImportWorker |
| `recordings` | UploadRecording, ProcessRecording | RecordingWorker |
| `ai` | GenerateTranscript, SummarizeCall, AnalyzeSentiment, ScoreQA | AIWorker |
| `webhooks` | DeliverWebhook | WebhookWorker |
| `notifications` | SendEmail, SendSms, SendInApp | NotificationWorker |
| `exports` | GenerateReportExport | ExportWorker |
| `compliance` | ScrubDnc, CheckCompliance | ComplianceWorker |
| `dialer` | RecycleLead, UpdatePacing | DialerWorker |
| `analytics` | AggregateMetrics | AnalyticsWorker |

## 9. Event Sourcing vs. Current State

The platform uses **current state persistence** with **domain events as notifications**, not full event sourcing. This balances simplicity and auditability.

For audit-critical events, the raw event is persisted in the audit log table with an immutable record.

## 10. Event Ordering & Delivery Guarantees

- **In-process**: Ordered within the transaction.
- **Redis Pub/Sub**: Best-effort ordering; consumers handle idempotency.
- **BullMQ**: Ordered within a queue; workers process jobs in order with priority support.
- **Webhooks**: Best-effort ordering per subscription; event ID supports deduplication.

## 11. Idempotency

All event handlers and job processors are designed to be idempotent:
- Events include unique `eventId`.
- Handlers check for processed event IDs before acting.
- Jobs include idempotency keys.
- Database operations use upserts where appropriate.

## 12. Error Handling

- In-process handler failures roll back the transaction (if configured).
- Out-of-process job failures retry with exponential backoff.
- Exhausted retries move jobs to the dead-letter queue (DLQ).
- DLQ monitored and supports manual replay.
- Critical events trigger alerts.

## 13. Event Catalog

See `42-internal-event-documentation.md` for the complete event catalog, including schemas, producers, consumers, and examples.

## 14. Scalability

- Redis Pub/Sub scales horizontally with Redis Cluster.
- BullMQ workers scale independently by queue depth.
- Event handlers are stateless and can be replicated.
- High-frequency events (call state) are batched or throttled for dashboards.

## 15. Security

- Event payloads do not include secrets or PII beyond what is necessary.
- Tenant context enforced in all event handlers.
- Webhook events signed with HMAC.
- Internal events travel over encrypted Redis connections.

## 16. Monitoring

- Event volume, latency, and error rates tracked per event type.
- Queue depth and consumer lag monitored per BullMQ queue.
- Failed events and DLQ size alerted.
- Distributed tracing via correlation IDs.

## 17. Future Enhancements

- Event sourcing for selected aggregates (e.g., call state).
- Kafka/RabbitMQ option for very high-volume deployments.
- Schema registry for integration events.
- Event replay capability for recovery.
