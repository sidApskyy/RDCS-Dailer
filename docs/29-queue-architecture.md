# 29 — Queue Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Queue Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the queue architecture for the RDCS In-House Dialer Platform. BullMQ backed by Redis is used for durable, scalable, and reliable background job processing.

## 2. Queue Technology

- **BullMQ 4+**: Redis-backed queue system with workers, delayed jobs, priorities, retries, and rate limiting.
- **Redis 7+**: Persistence enabled (AOF) for durability.
- **Redis Sentinel/Cluster**: For high availability and scale.

## 3. Queue Design Principles

- One queue per job type or domain concern.
- Workers are stateless and horizontally scalable.
- Jobs are idempotent where possible.
- Retry policies configurable per queue.
- Dead-letter queues for failed jobs.
- Rate limiting for external-facing jobs (webhooks, AI, SMS).

## 4. Queue Inventory

| Queue | Purpose | Priority | Worker Count | Retry Policy |
|-------|---------|----------|--------------|--------------|
| `imports` | CSV lead import, validation, deduplication | Normal | 2–5 | 3 retries, 30s backoff |
| `dialer` | Lead recycling, pacing updates, callback scheduling | High | 3–5 | 3 retries, 10s backoff |
| `recordings` | Recording upload, metadata processing | Normal | 2–4 | 5 retries, 60s backoff |
| `ai` | Transcription, summarization, sentiment, QA | Normal | 2–5 | 3 retries, 60s backoff |
| `webhooks` | Webhook delivery | High | 3–5 | 10 retries, exponential backoff up to 24h |
| `notifications` | Email, SMS, in-app notifications | Normal | 2–4 | 3 retries, 30s backoff |
| `exports` | Report and data exports | Low | 1–3 | 3 retries, 30s backoff |
| `compliance` | DNC scrubbing, compliance checks | High | 2–3 | 3 retries, 30s backoff |
| `analytics` | Metric aggregation, materialized view refresh | Low | 1–2 | 3 retries, 5min backoff |
| `audit` | Audit log writes | High | 2–3 | 5 retries, immediate |

## 5. Job Definition Example

```typescript
import { Job, Queue } from 'bullmq';

export interface ProcessLeadImportJob {
  importId: string;
  tenantId: string;
  filePath: string;
  mapping: Record<string, string>;
  campaignId: string;
  uploadedBy: string;
}

export const leadImportQueue = new Queue<ProcessLeadImportJob>('imports', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export class LeadImportWorker extends Worker<ProcessLeadImportJob> {
  constructor() {
    super('imports', async (job: Job<ProcessLeadImportJob>) => {
      // Process import in batches
    }, { connection: redisConnection, concurrency: 2 });
  }
}
```

## 6. Worker Architecture

Workers are deployed as separate containers and can be scaled independently.

```
┌─────────────────────────────────────┐
│           Redis Cluster              │
│    (Queues, Jobs, Schedules, Locks)  │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Worker │ │ Worker │ │ Worker │
│ (A)    │ │ (B)    │ │ (C)    │
└────────┘ └────────┘ └────────┘
```

## 7. Concurrency & Rate Limiting

- Worker concurrency set per job type (e.g., 2 for imports, 5 for webhooks).
- Rate limiter for webhook queue to avoid overwhelming CRM endpoints.
- AI queue rate-limited based on external STT service capacity.
- Export queue limited to avoid database contention.

```typescript
new Queue('webhooks', {
  connection: redisConnection,
  limiter: {
    max: 100,
    duration: 1000, // 100 webhooks per second
  },
});
```

## 8. Delayed Jobs

Delayed jobs are used for:
- Callbacks scheduled at future times.
- Lead recycling after interval.
- Compliance checks and report generation.
- Retention policy enforcement.

```typescript
await dialerQueue.add('scheduleCallback', payload, {
  delay: callbackDate.getTime() - Date.now(),
});
```

## 9. Job Progress & Flows

- Long-running jobs report progress (e.g., CSV import: 25%, 50%, 100%).
- BullMQ Flows used for multi-step job pipelines:
  - Import job → validate job → DNC scrub job → assign job.
  - Recording upload → STT → summary → QA scoring.

## 10. Dead Letter Queue (DLQ)

- Failed jobs exceeding retries are moved to a DLQ.
- DLQ jobs are visible in the admin dashboard.
- Operators can retry, inspect, or delete DLQ jobs.
- Alerts fire when DLQ grows beyond threshold.

## 11. Monitoring

- Queue depth, active jobs, completed jobs, failed jobs.
- Worker CPU/memory via Prometheus.
- Job duration and wait time histograms.
- Alerts on stuck jobs, DLQ growth, and high failure rates.

## 12. Redis Persistence

- Redis configured with AOF (`appendonly yes`) and RDB snapshots.
- Critical job data must survive Redis restart.
- Job state is persisted in Redis; workers resume after restart.

## 13. Backpressure

- When queues exceed thresholds, producers throttle or pause.
- Campaign dialing pauses if recording/AI queues are too deep (configurable).
- Dashboards display queue health to operators.

## 14. Worker Deployment

- Workers run as Docker containers.
- One container type per worker role (or combined worker container).
- Horizontal scaling based on queue depth via HPA in Kubernetes or manual scaling in Compose.

## 15. Security

- Redis authentication enabled.
- Redis connections over TLS in production.
- Job payloads do not include secrets.
- Workers validate tenant context and permissions before processing.

## 16. Example Worker Container

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "dist/workers/main.js"]
```

## 17. Future Enhancements

- Separate queue clusters for high-volume tenants.
- Job scheduling with BullMQ cron patterns.
- Priority lanes for VIP tenants/campaigns.
- Queue-based backpressure for AI services.
