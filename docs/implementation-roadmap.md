# RDCS Dialer Platform Implementation Roadmap

## 1. Delivery Rules

- Work is executed phase by phase; no phase is accepted without its verification gate.
- The repository must remain installable and buildable before feature work continues.
- Every feature includes API contract, persistence changes, authorization rules, tests, and operator documentation.
- Tenant isolation, auditability, compliance, and observability are release-blocking requirements.
- Telephony is integrated behind an adapter; business rules never depend directly on ViciDial internals.
- External integrations are tested with deterministic mocks before live credentials are introduced.

## 2. Current Baseline

The repository contains architecture documentation, a pnpm/Turborepo skeleton, NestJS API scaffolding, a Next.js shell, worker/socket placeholders, Docker Compose definitions, and a partial Prisma identity schema.

The baseline is not yet releasable. The first workstream is stabilization, not business feature development.

## 3. Phases and Gates

### Phase 0 — Repository Stabilization

**Objective:** Make the monorepo deterministic on a clean Windows developer machine and in CI.

**Deliverables:**

- Valid root and workspace package manifests.
- One authoritative Prisma package and schema location.
- Lockfile generated from the corrected workspace graph.
- Reproducible dependency installation.
- Valid TypeScript project references and package exports.
- Docker Compose paths aligned with the repository.
- Minimal health endpoints and startup diagnostics for API, worker, socket, and web.

**Verification gate:** `pnpm install --frozen-lockfile`, Prisma generate, TypeScript typecheck, lint, and package builds pass from a clean checkout.

### Phase 1 — Engineering Conventions and Test Harness

**Objective:** Establish the delivery safety net before expanding the domain.

**Deliverables:**

- Prettier, ESLint, commit hooks, conventional commits, and CI checks.
- Jest API unit/integration setup, Vitest web setup, and Playwright smoke setup.
- Test database and Redis bootstrap.
- Standard API response/error envelope, request correlation ID, validation, logging, and exception handling.
- Environment validation with safe development defaults and startup failure for missing production secrets.
- Seed script with deterministic tenant, users, roles, permissions, organization, campaign, and leads.

**Verification gate:** A clean developer can start infrastructure, seed data, run unit tests, and execute an authenticated health smoke test.

### Phase 2 — Identity, Tenancy, and Authorization

**Objective:** Deliver a secure platform boundary used by every future module.

**Deliverables:**

- Tenant provisioning and tenant context extraction.
- User lifecycle: invite, register, login, logout, refresh, password reset, deactivate, soft delete.
- Hashed refresh-token sessions with revocation and expiry.
- Rate limiting, lockout, secure cookie/token policy, and audit events.
- Roles and permissions seeded from the permission matrix.
- Tenant-aware authorization with own/team/department/organization/tenant/cross-tenant scopes.
- Organization, department, team, and membership management.
- Web login, session persistence, protected routes, and permission-aware navigation.

**Verification gate:** Cross-tenant access tests, privilege escalation tests, session revocation tests, and browser login flow pass.

### Phase 3 — Campaign, Lead, and Compliance Core

**Objective:** Make campaigns and compliant lead inventory operational without telephony.

**Deliverables:**

- Complete campaign model and lifecycle state machine.
- Schedules, time zones, caller IDs, dispositions, pacing, and compliance configuration.
- Lead lists, lead phones, CSV upload, mapping, validation, deduplication, import jobs, and error reporting.
- DNC lists and entries, dial-time scrubbing, consent, calling-window enforcement, and audit trails.
- Assignment, recycling, callbacks, and optimistic concurrency.
- Campaign and lead APIs plus functional web screens.

**Verification gate:** Seed/import 100,000 synthetic rows, reject invalid/DNC/out-of-window leads, and prove tenant isolation and idempotent re-import.

### Phase 4 — Telephony Adapter and Manual Calling

**Objective:** Complete the smallest end-to-end call path using a mock adapter first.

**Deliverables:**

- Stable `TelephonyAdapter` contract and domain call state machine.
- Mock adapter for automated tests.
- ViciDial/Asterisk adapter spike with documented AMI/AGI/ARI assumptions.
- Agent availability state and lease/locking rules.
- Manual and preview dial modes.
- Call initiation, events, failures, retries, dispositions, and callbacks.
- Socket events for agent and supervisor state.

**Verification gate:** An agent can select an eligible lead, initiate a mock call, receive state transitions, apply a disposition, and see a complete audit trail.

### Phase 5 — Recording, Call Controls, and Supervisor Operations

**Objective:** Make call operations usable and reviewable.

**Deliverables:**

- Hold, mute, transfer, conference, recording start/stop/pause.
- MinIO/S3 recording upload, signed playback URLs, retention metadata, and access control.
- Supervisor listen/whisper/barge authorization and event logging.
- Call history, notes, tags, callback queue, and disposition history.

**Verification gate:** Recording and privileged supervisor actions pass integration, authorization, retention, and failure-recovery tests.

### Phase 6 — Progressive, Power, and Predictive Dialing

**Objective:** Add automated dialing only after manual call correctness is proven.

**Deliverables:**

- Queue reservation and idempotency model.
- Progressive and power pacing.
- Predictive pacing with measurable inputs and abandon-rate guard.
- Agent availability coordination and backpressure.
- Dead-letter handling and operational controls.

**Verification gate:** Load tests demonstrate safe reservation, no duplicate calls, bounded abandon rate, recovery after worker restart, and deterministic pause/throttle behavior.

### Phase 7 — Reporting, Analytics, and Notifications

**Objective:** Turn events and calls into operational insight.

**Deliverables:**

- Event normalization and durable metrics aggregation.
- Live dashboards through Redis/socket events.
- Historical reports, exports, scheduled reports, and tenant-scoped queries.
- Notification preferences and in-app/email/webhook delivery.

**Verification gate:** Live metrics reconcile with transactional call data, exports are tenant-safe, and delayed/retried jobs are observable.

### Phase 8 — Integrations and Public API

**Objective:** Provide safe, versioned integration surfaces.

**Deliverables:**

- Versioned REST API and OpenAPI contract.
- API keys with hashing, scopes, rotation, revocation, and audit.
- Webhook subscriptions, HMAC signatures, retry/backoff, idempotency, and delivery logs.
- Connector abstraction and first CRM integration only after the generic contract is stable.

**Verification gate:** Contract tests, signature verification, replay protection, retry/DLQ behavior, and API-key abuse tests pass.

### Phase 9 — AI and Quality

**Objective:** Add asynchronous intelligence without coupling it to the call path.

**Deliverables:**

- Recording processing pipeline and provider abstraction.
- Transcripts, summaries, sentiment, QA rubrics, scoring, and review workflows.
- Cost, privacy, retention, and failure policies.
- Optional real-time transcription behind a feature flag.

**Verification gate:** Jobs are idempotent, provider failures recover safely, sensitive data is protected, and human QA can override automated results.

### Phase 10 — Production Hardening and Operations

**Objective:** Prove the platform is operable, secure, recoverable, and deployable.

**Deliverables:**

- GitHub Actions for lint, tests, build, dependency/security scans, migration checks, and image scanning.
- Production Dockerfiles/images, staging deployment, migration rollback/runbook, and smoke tests.
- Metrics, structured logs, traces, alerting, dashboards, backups, restore drills, and DR runbooks.
- Security review, threat model, penetration-test remediation, rate limits, secret management, and compliance evidence.
- Performance tests against agreed capacity targets.

**Verification gate:** Staging deployment is repeatable, restore drill succeeds, critical security tests pass, SLO dashboards are live, and release checklist is signed off.

## 4. Immediate Execution Order

1. Repair malformed package manifests and remove stale Prisma configuration.
2. Decide and enforce the canonical Prisma package layout.
3. Regenerate the lockfile and install from a clean workspace.
4. Run Prisma validation/generation and fix schema/client incompatibilities.
5. Add missing Dockerfiles or temporarily remove application services from the dev compose profile until images exist.
6. Make API, web, worker, and socket typecheck/build independently.
7. Add the first migration and deterministic seed data.
8. Add CI only after local checks are green.
9. Begin Phase 2 identity hardening; do not start campaign or telephony features before the identity gate passes.

## 5. Definition of Done for Every Phase

- Requirements and acceptance criteria are linked to implementation.
- Database migrations are reviewed and reversible where practical.
- Authorization and tenant-isolation tests exist.
- Unit and integration tests cover critical behavior.
- API and UI behavior are documented.
- Logs, metrics, and failure handling are present.
- No known critical or high-severity defect remains open.
- Local verification and CI verification produce the same result.

## 6. Release Strategy

- **Milestone A:** Foundation-ready repository after Phase 1.
- **Milestone B:** Secure admin platform after Phase 2.
- **Milestone C:** Campaign and compliant lead operations after Phase 3.
- **Milestone D:** First controlled mock call after Phase 4.
- **Milestone E:** Pilot-ready dialer after Phases 5–7.
- **Milestone F:** Integration/AI expansion after Phases 8–9.
- **Milestone G:** Production launch after Phase 10.
