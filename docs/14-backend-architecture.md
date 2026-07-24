# 14 — Backend Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Backend Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the backend architecture for the RDCS In-House Dialer Platform. The backend is built with NestJS and TypeScript, organized as a modular monolith ready for future microservice decomposition.

## 2. Technology Stack

| Concern | Technology |
|---------|------------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10+ |
| Language | TypeScript 5+ |
| ORM | Prisma 5+ |
| Database | PostgreSQL 15+ |
| Cache / Pub-Sub | Redis 7+ |
| Job Queue | BullMQ 4+ |
| Authentication | Passport, JWT, bcrypt, speakeasy (TOTP) |
| Validation | class-validator / Zod |
| API Docs | Swagger / OpenAPI 3.0 |
| Real-Time | Socket.IO |
| Testing | Jest, Supertest, Testcontainers |

## 3. Architectural Principles

- **Modular Monolith**: Each domain is a NestJS module with clean internal boundaries.
- **Clean Architecture**: Domain logic independent of framework, database, and telephony engine.
- **CQRS**: Commands mutate state; queries read optimized views; separated where beneficial.
- **Event-Driven**: Domain events propagate changes across modules via Redis/BullMQ.
- **Adapter Pattern**: Telephony engine is abstracted behind a stable adapter interface.
- **API-First**: All public APIs documented in OpenAPI and validated at runtime.

## 4. Project Structure

```
apps/api/
├── src/
│   ├── main.ts                      # Application bootstrap
│   ├── app.module.ts                # Root module
│   ├── config/                      # Configuration schemas (database, redis, telephony, s3)
│   ├── common/                      # Guards, interceptors, filters, pipes, decorators, pipes
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── decorators/
│   │   ├── pipes/
│   │   └── dto/
│   ├── core/                        # Domain-agnostic primitives
│   │   ├── base-entity.ts
│   │   ├── base-repository.ts
│   │   ├── domain-event.ts
│   │   ├── result.ts
│   │   └── unit-of-work.ts
│   ├── modules/                     # Domain modules
│   │   ├── auth/
│   │   ├── rbac/
│   │   ├── tenant/
│   │   ├── organization/
│   │   ├── campaign/
│   │   ├── lead/
│   │   ├── dialer/
│   │   ├── call/
│   │   ├── recording/
│   │   ├── compliance/
│   │   ├── reporting/
│   │   ├── analytics/
│   │   ├── integration/
│   │   ├── webhook/
│   │   ├── notification/
│   │   ├── ai/
│   │   ├── audit/
│   │   └── system/
│   ├── telephony/                   # Telephony Adapter Layer
│   │   ├── telephony-adapter.interface.ts
│   │   ├── telephony.module.ts
│   │   ├── adapters/
│   │   │   ├── vicidial.adapter.ts
│   │   │   ├── asterisk-ari.adapter.ts
│   │   │   ├── freeswitch.adapter.ts
│   │   │   ├── twilio.adapter.ts
│   │   │   ├── amazon-connect.adapter.ts
│   │   │   └── sip-provider.adapter.ts
│   │   ├── events/
│   │   └── services/
│   ├── infrastructure/              # External adapters (persistence, messaging, storage)
│   │   ├── prisma/
│   │   ├── redis/
│   │   ├── bullmq/
│   │   ├── s3/
│   │   └── logger/
│   ├── events/                        # Event bus and handlers
│   │   ├── event-bus.ts
│   │   ├── event-publisher.ts
│   │   └── handlers/
│   └── jobs/                          # BullMQ job definitions and processors
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## 5. Module Organization

Each domain module contains:
- `domain/`: Entities, value objects, domain services, domain events, repository interfaces.
- `application/`: DTOs, command handlers, query handlers, services, mappers.
- `infrastructure/`: Repository implementations, external clients, ORM mappings.
- `interface/`: Controllers, presenters, HTTP/WebSocket handlers.
- `{module}.module.ts`: NestJS module definition.

## 6. Request Lifecycle

1. **Nginx** routes request to NestJS API container.
2. **API Gateway Middleware** validates API version, tenant header, rate limit.
3. **Auth Guard** validates JWT and attaches user context.
4. **Permissions Guard** checks resource-action-scope permission.
5. **Tenant Guard** ensures tenant isolation.
6. **Validation Pipe** validates and transforms DTOs.
7. **Controller** delegates to application service.
8. **Application Service** orchestrates domain services and repositories.
9. **Repository / Unit of Work** persists changes.
10. **Domain Events** emitted and published via event bus.
11. **Response** returned through interceptors for standard envelope formatting.

## 7. Domain Modules

### 7.1 Auth Module
- Register, login, logout, token refresh, password reset, MFA, SSO.
- Passport strategies: JWT, local, SAML, OIDC.
- Session and token management.

### 7.2 RBAC Module
- Roles, permissions, resource-action-scope evaluation.
- Permission guard and decorator (`@RequirePermission()`).
- Role assignment and tenant-scoped role inheritance.

### 7.3 Tenant Module
- Tenant provisioning, configuration, branding, limits, status.
- Tenant context resolution from JWT or header.

### 7.4 Organization Module
- Organizations, departments, teams, hierarchy.
- Team membership and department assignments.

### 7.5 Campaign Module
- Campaign CRUD, lifecycle, schedules, caller ID pools, disposition sets.
- Campaign validation and activation rules.

### 7.6 Lead Module
- Lead list management, CSV import, validation, deduplication, DNC scrubbing.
- Lead assignment, status, recycling.
- Import jobs processed asynchronously by BullMQ.

### 7.7 Dialer Module
- Agent state management, dialer session orchestration.
- Pacing algorithms for progressive, power, predictive modes.
- Queue management and next-lead selection.

### 7.8 Call Module
- Call lifecycle, state machine, dispositions, callbacks, transfers.
- Telephony adapter abstraction for all call control.

### 7.9 Recording Module
- Recording metadata, storage upload, playback URLs, retention.
- Encryption and access control.

### 7.10 Compliance Module
- DNC lists, timezone calling windows, consent tracking, abandon monitoring.
- Compliance reports and policy engine.

### 7.11 Reporting Module
- Query handlers for live and historical reports.
- Materialized views and cached aggregates.
- Export generation (async).

### 7.12 Analytics Module
- Event aggregation, metric computation, funnel analysis.
- OLAP-friendly data model and time-series support.

### 7.13 Integration & Webhook Module
- Webhook subscription management, event delivery, retries, HMAC signing.
- CRM connector framework and API key management.

### 7.14 Notification Module
- Notification templates, preferences, delivery via in-app, email, SMS.
- Multi-channel queue processing.

### 7.15 AI Module
- STT, summarization, sentiment, auto-QA, auto-disposition.
- Job queue processors for async AI tasks.
- Real-time transcription adapter hooks.

### 7.16 Audit Module
- Audit log recording, immutable storage, export.
- Activity timeline assembly.

### 7.17 System Module
- Health checks, metrics, tenant/system settings, worker status.

## 8. Telephony Adapter Layer

All telephony operations are abstracted behind `ITelephonyAdapter`:

```typescript
interface ITelephonyAdapter {
  register(): Promise<AdapterRegistration>;
  originate(call: OriginateRequest): Promise<CallResult>;
  hangup(callId: string): Promise<void>;
  hold(callId: string): Promise<void>;
  resume(callId: string): Promise<void>;
  mute(callId: string): Promise<void>;
  unmute(callId: string): Promise<void>;
  transfer(callId: string, destination: TransferRequest): Promise<void>;
  startRecording(callId: string): Promise<void>;
  stopRecording(callId: string): Promise<void>;
  pauseRecording(callId: string): Promise<void>;
  sendDtmf(callId: string, digits: string): Promise<void>;
  listen(callId: string, supervisorId: string): Promise<void>;
  subscribeToEvents(handler: EventHandler): void;
}
```

ViciDial adapter implements this by calling Asterisk AMI/AGI and reading ViciDial database events. Alternate adapters implement the same interface for Asterisk ARI, FreeSWITCH, Twilio, etc.

## 9. Event-Driven Communication

- Domain events are emitted by aggregate roots after persistence.
- Event bus dispatches to in-memory handlers and Redis Pub/Sub for cross-process delivery.
- BullMQ durable queues handle asynchronous jobs: imports, AI processing, exports, webhooks, notifications.
- Event catalog maintained in `42-internal-event-documentation.md`.

## 10. CQRS Implementation

- Commands: CreateCampaign, UpdateLeadStatus, ImportLeads, SetDisposition, InitiateCall.
- Queries: GetCampaigns, GetLeads, GetAgentPerformance, GetLiveMetrics.
- Command handlers use domain services; query handlers use optimized read models or Prisma projections.
- Reporting/Analytics module uses dedicated read paths for performance.

## 11. API Layer

- Controllers grouped by resource.
- Global prefix `/api/v1`.
- Standardized response envelope:
  ```json
  {
    "data": {},
    "meta": {},
    "error": null
  }
  ```
- Swagger documentation auto-generated from decorators and DTOs.
- Rate limiting per tenant and per endpoint.

## 12. WebSocket Layer

- Socket.IO gateway under `/socket.io`.
- Namespaces: `/agents`, `/supervisors`, `/dashboard`.
- Authentication via JWT in handshake.
- Room-based scoping: tenant rooms, department rooms, agent rooms.
- Events pushed by application services or event handlers.

## 13. Background Jobs

| Job | Queue | Priority | Worker |
|-----|-------|----------|--------|
| Lead CSV import | `imports` | Normal | ImportWorker |
| Lead validation | `imports` | Normal | ImportWorker |
| DNC scrubbing | `compliance` | High | ComplianceWorker |
| Recording upload | `recordings` | Normal | RecordingWorker |
| STT / AI | `ai` | Normal | AIWorker |
| Webhook delivery | `webhooks` | High | WebhookWorker |
| Email/SMS | `notifications` | Normal | NotificationWorker |
| Report export | `exports` | Low | ExportWorker |
| Lead recycling | `dialer` | Normal | DialerWorker |
| Analytics aggregation | `analytics` | Low | AnalyticsWorker |

## 14. Error Handling

- Global exception filter returns standard error envelope.
- Domain errors mapped to HTTP status codes.
- Retry logic for transient external failures.
- Circuit breakers for telephony and AI services.
- Sentry integration for unhandled exceptions.

## 15. Testing

- Unit tests for domain logic and services.
- Integration tests for repositories and controllers using Testcontainers.
- E2E tests for full API flows.
- Load tests for dialer and import paths.

## 16. Scalability

- Stateless API nodes scale horizontally behind Nginx.
- BullMQ workers scale independently based on queue depth.
- PostgreSQL read replicas for reporting queries.
- Redis Cluster for cache and pub/sub at scale.
- Telephony adapters can be sharded by tenant or campaign.

## 17. Security

- All endpoints authenticated except health checks.
- Tenant isolation enforced in every query.
- Input validation, SQL injection prevention via Prisma.
- Secrets externalized to Vault/Docker Secrets.
- Rate limiting, CORS, and CSP configured.

## 18. Observability

- Prometheus metrics endpoint `/metrics`.
- Structured JSON logging via Pino.
- Distributed tracing via OpenTelemetry (future).
- Health checks at `/health`, `/health/ready`, `/health/live`.
