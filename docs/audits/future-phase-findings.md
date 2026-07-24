# Future-Phase Findings

These findings were discovered during the Phase 0 repository audit. They are documented only and are not being implemented during Phase 0.

## FPF-001 — Authentication Completeness

**Relevant future phase:** Phase 2 — Identity, Tenancy, and Authorization

The current auth service issues access and refresh JWTs but does not persist or rotate refresh sessions, enforce lockout, assign default roles, or provide complete session revocation. Do not expand this behavior during Phase 0.

**Evidence:** `apps/api/src/modules/auth/auth.service.ts`.

## FPF-002 — Domain Schema Expansion

**Relevant future phases:** Phase 3 onward

The current Prisma schema contains the identity foundation only. Campaign, lead, call, recording, reporting, webhook, notification, AI, and QA models described in the architecture documentation are not implemented. Do not add them during Phase 0 unless a narrowly scoped database connectivity test requires an existing identity model.

**Evidence:** `packages/database/prisma/schema.prisma` and `docs/36-prisma-schema-design.md`.

## FPF-003 — Telephony Adapter

**Relevant future phase:** Phase 4 — Telephony Adapter and Manual Calling

No telephony adapter contract or ViciDial integration exists. The worker and socket services are placeholders. Do not implement telephony behavior during Phase 0.

## FPF-004 — Operational Test Depth

**Relevant future phases:** Phase 1 and later

The repository has no meaningful unit, integration, E2E, performance, or security test suites. Phase 0 may add only the minimum harness and smoke checks required to prove stabilization; feature coverage belongs to the relevant feature phase.

## FPF-005 — Production CI/CD and Operations

**Relevant future phase:** Phase 10 — Production Hardening and Operations

The documentation describes production workflows, observability, DR, backups, security testing, and deployment automation, but those are not Phase 0 deliverables. Phase 0 should add only CI foundation checks required to reproduce local verification.
