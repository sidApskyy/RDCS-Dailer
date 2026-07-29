# Phase 4 Final Production Readiness Audit

**Date**: 2026-07-29
**Auditor**: Cascade AI
**Repository**: https://github.com/sidApskyy/RDCS-Dailer

---

## 1. Current Phase 4 Acceptance Status

Phase 4 core acceptance is **VERIFIED**. All 10 CI jobs pass, 56 Phase 4 tests are green.

| Gate | Status |
|------|--------|
| Phase 4 Implementation | PASS |
| Phase 4 Hardening | PASS |
| REST Integration | PASS |
| Concurrency | PASS |
| Socket.IO Integration | PASS |
| Compliance | PASS |
| Presence | PASS |
| Tenant Isolation | PASS |
| RBAC | PASS |
| CI Validation | PASS |

---

## 2. Existing Production-Readiness Controls

### Security Controls (Already Enforced)

- **JWT Authentication**: `JwtAuthGuard` on all telephony endpoints via `@UseGuards(JwtAuthGuard, TenantIsolationGuard, PermissionsGuard)` at controller level (`telephony.controller.ts:17`)
- **JWT Strategy**: Extracts Bearer token, validates `sub` + `tenantId`, `ignoreExpiration: false` (`jwt.strategy.ts:22`)
- **RBAC**: `PermissionsGuard` checks `rbac.hasPermission()` on every endpoint via `@RequirePermission` decorator. Scope hierarchy: `own < team < department < organization < tenant < cross-tenant`. Denials audited (`permissions.guard.ts:31-33`)
- **Tenant Isolation**: `TenantIsolationGuard` verifies `rbac.hasTenantAccess()` (`tenant-isolation.guard.ts:18`). All Prisma queries include `tenantId` in `where` clause. Cross-tenant → 404 (no info leakage)
- **Agent Ownership**: `cancel()` and `dispose()` check `call.agentId !== agentId` → 404
- **Socket.IO Auth**: JWT verified on connection via `auth.verifyToken()`. Invalid → `next(new Error('Unauthorized'))` (`telephony-socket.service.ts:20-31`)
- **Socket.IO Room Isolation**: Sockets join `tenant:${tenantId}` and `agent:${userId}` rooms. Events emitted to room-scoped targets only (`telephony-socket.service.ts:26-27, 34-35`)
- **Presence Manipulation Prevention**: `setAgentStatus()` rejects `Busy` and `OnCall` states (`telephony.service.ts:143`)
- **Concurrency Protection**: Transactional `agentPresence.updateMany` atomic claim with `ReadCommitted` isolation. Active call check inside transaction. Duplicate disposition → atomic `updateMany` with state guard
- **Compliance Enforcement**: DNC, consent, calling window, timezone — all checked server-side before adapter invocation. Blocked calls do not create sessions or mark agent busy (`telephony.service.ts:44-55`)
- **Audit Logging**: All call lifecycle and security events recorded in `audit` table

### Compliance Controls (Already Enforced)

- **DNC Scrubbing**: `DNCScrubbingService` checks tenant, campaign, and global DNC lists
- **Consent**: `ConsentService` checks latest consent record — `granted` required, `revoked`/`expired`/`unknown` → blocked
- **Calling Window**: `CallingWindowService` checks configured windows; if none → allowed
- **Timezone**: `TimezoneService` checks business hours (9-17) and weekday in lead's timezone
- **Blocked-Call Behavior**: Adapter NOT invoked, no call session created, agent NOT marked busy, audit record created

---

## 3. Browser E2E Status

**Status: NOT IMPLEMENTED**

- `playwright.config.ts` exists at project root with `testDir: './e2e'`, 3 browser projects (chromium, firefox, webkit), `webServer` config for `@rdcs/web` (port 3000) and `@rdcs/api` (port 3001)
- `@playwright/test` v1.49.0 in devDependencies
- Scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:debug` in root `package.json`
- **No `./e2e` directory exists** — no test specs written
- No CI job for E2E tests

### Web App Architecture (Ready for E2E)

- **Login page**: `apps/web/src/app/login/page.tsx` — form with `tenantId`, `email`, `password` fields. Calls `useAuth().login()` which POSTs to `${API_URL}/auth/login` with `x-tenant-id` header. Stores tokens in `localStorage('auth_tokens')`
- **Calls page**: `apps/web/src/app/calls/page.tsx` — lead selection dropdown, phone selection, manual dial button, agent status selector, call history list, Socket.IO integration for real-time updates
- **Auth context**: `apps/web/src/lib/auth-context.tsx` — `AuthProvider` manages auth state, `login()`, `logout()`, `refreshTokens()`
- **API client**: `apps/web/src/lib/api-client.ts` — axios instance with request interceptor (adds Bearer token) and response interceptor (401 → refresh, 403 → console error)
- **Seed data**: `packages/database/prisma/seed.ts` — creates Tenant A and Tenant B with admin and agent users each. Password hash for all users: `$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC6u8P4lY9Jr8h1l6c7u` (password: `password`)
- **Auth endpoint**: `POST /auth/login` with `x-tenant-id` header and `{ email, password }` body → returns `{ accessToken, refreshToken }`

### Files Requiring Modification

- **Create**: `e2e/` directory with Playwright test specs
- **Modify**: `apps/web/src/app/calls/page.tsx` — add `data-testid` attributes for stable selectors
- **Modify**: `apps/web/src/app/login/page.tsx` — add `data-testid` attributes for stable selectors
- **Modify**: `playwright.config.ts` — adjust for CI environment (env vars, build mode)
- **Modify**: `.github/workflows/ci.yml` — add `test-phase4-e2e` job

---

## 4. Rate Limiting Status

**Status: NOT IMPLEMENTED**

- No `@nestjs/throttler`, `ThrottlerGuard`, or custom rate-limiting middleware exists anywhere in the codebase
- No rate-limiting dependency in `apps/api/package.json`
- `HttpExceptionFilter` already maps HTTP 429 → `RATE_LIMIT_EXCEEDED` error code (`http-exception.filter.ts:100-101`), indicating rate limiting was anticipated but not implemented

### Current Mitigations

- Transactional agent claim prevents concurrent dials from same agent (one active call at a time)
- Active call session check inside transaction
- Compliance checks provide natural rate barriers
- Agent must be in `Available` status to dial

### Files Requiring Modification

- **Install**: `@nestjs/throttler` package
- **Modify**: `apps/api/src/app.module.ts` — register `ThrottlerModule` globally
- **Modify**: `apps/api/src/modules/telephony/telephony.controller.ts` — apply `ThrottlerGuard` with per-endpoint rate limits
- **Create**: `apps/api/src/common/guards/telephony-throttler.guard.ts` — tenant-aware throttler guard
- **Create**: `apps/api/test/integration/telephony-rate-limit.spec.ts` — rate limiting tests

---

## 5. Observability Status

**Status: PARTIAL — Audit table comprehensive, Winston not wired to telephony**

### What Exists

- **`LoggerService`** (`apps/api/src/common/logger/logger.service.ts`): Winston-based, implements `NestLoggerService`. Console transport (dev: colorized, prod: JSON), daily rotate file transports (prod only). Sensitive data filtering for `password`, `token`, `secret`, `apiKey`, `creditCard` keys
- **`LoggerService` is registered globally** in `AppModule` providers (`app.module.ts:53`) and set as application logger in `main.ts:20`
- **Audit table logging**: Comprehensive — all call lifecycle events, compliance blocks, auth denials, agent status changes recorded in `audit` table via `prisma.audit.create()`

### Gaps Identified

1. **`TelephonyService` does not inject `LoggerService`** — constructor only takes `PrismaService`, `ComplianceEngineService`, `TELEPHONY_ADAPTER`, `TelephonyEvents` (`telephony.service.ts:19-24`). No structured logging for dial requests, adapter invocations, failures, cancellations, completions, or presence transitions
2. **`TelephonySocketService` does not inject `LoggerService`** — constructor only takes `AuthService` and `TelephonyEvents` (`telephony-socket.service.ts:15`). Socket auth failures silently reject with `next(new Error('Unauthorized'))` — no log entry (`telephony-socket.service.ts:29-31`)
3. **Invalid state transitions** in `handleEvent()` catch block silently return without logging (`telephony.service.ts:181`)
4. **Intermediate call events** (dialing, ringing, connected) update call session and emit Socket.IO events but do not create audit records or log entries

### Files Requiring Modification

- **Modify**: `apps/api/src/modules/telephony/telephony.service.ts` — inject `LoggerService`, add structured logging for all lifecycle events
- **Modify**: `apps/api/src/modules/telephony/telephony-socket.service.ts` — inject `LoggerService`, log auth success/failure/connection errors
- **Modify**: `apps/api/src/modules/telephony/telephony.module.ts` — ensure `LoggerService` is available to telephony providers

---

## 6. Production Environment Configuration Status

**Status: INCONSISTENT — Multiple naming mismatches, no `.env.example`, weak Docker defaults**

### Environment Variable Usage Map

| Variable | env.validation.ts | app.controller.ts | telephony-socket.service.ts | worker env.validation.ts | CI (ci.yml) | Docker Compose |
|----------|-------------------|-------------------|-----------------------------|--------------------------|-------------|----------------|
| `NODE_ENV` | Required (enum, default `development`) | — | — | Required (enum, default `development`) | Not set (implicit) | Not set |
| `API_PORT` | Optional (default `3001`) | — | — | — | Not set | Not set |
| `DATABASE_URL` | Required (URL) | — | — | — | `postgresql://postgres:postgres@localhost:5432/rdcs_test` | Not set |
| `REDIS_URL` | Required (URL) | Fallback: `redis://:rdcs@localhost:6379/0` (`app.controller.ts:12`) | — | Required (URL) | **NOT SET** (uses `REDIS_HOST`/`REDIS_PORT` instead) | Not set |
| `REDIS_HOST` | NOT defined | — | — | NOT defined | `localhost` | Not set |
| `REDIS_PORT` | NOT defined | — | — | NOT defined | `6379` | Not set |
| `JWT_SECRET` | Required (min 32 chars) | — | — | — | `test-secret-key` (25 chars — **would fail validation**) | Not set |
| `JWT_EXPIRES_IN` | Optional (default `1d`) | — | — | — | Not set | Not set |
| `WEB_ORIGIN` | Optional (URL, singular) | — | — | — | Not set | Not set |
| `WEB_ORIGINS` | NOT defined | — | `process.env.WEB_ORIGINS` (plural, fallback `http://localhost:3000`) (`telephony-socket.service.ts:18`) | — | `http://localhost:3000` | Not set |
| `LOG_LEVEL` | Optional (enum, default `info`) | — | — | Optional (enum, default `info`) | Not set | Not set |

### Issues Found

1. **`WEB_ORIGIN` vs `WEB_ORIGINS`**: `env.validation.ts` validates `WEB_ORIGIN` (singular, optional). `telephony-socket.service.ts` reads `WEB_ORIGINS` (plural). CI provides `WEB_ORIGINS`. The env validation does not cover the variable actually used by the socket service. **Canonical: `WEB_ORIGINS`** (already used by socket service and CI)

2. **`REDIS_URL` vs `REDIS_HOST`/`REDIS_PORT`**: `env.validation.ts` requires `REDIS_URL`. `app.controller.ts` uses `REDIS_URL` with fallback. `worker/src/env.validation.ts` requires `REDIS_URL`. CI provides `REDIS_HOST` + `REDIS_PORT` (not `REDIS_URL`). Test Redis (`test-redis.ts`) uses `REDIS_HOST`/`REDIS_PORT`. **Canonical: `REDIS_URL`** for app/worker. Tests need to construct `REDIS_URL` from `REDIS_HOST`/`REDIS_PORT` or use `REDIS_URL` directly

3. **`JWT_SECRET` in CI**: `test-secret-key` is 25 chars, would fail `min(32)` validation. Tests don't call `validateEnv()` so this doesn't cause failures, but indicates validation is not exercised in CI

4. **No `.env.example` file exists** — no template for required env vars

5. **Docker Compose weak defaults**: `POSTGRES_PASSWORD: rdcs`, `REDIS_PASSWORD: rdcs`, `MINIO_ROOT_PASSWORD: minio123456` (`docker-compose.base.yml:8, 24, 42`)

6. **No production fail-fast**: `app.controller.ts` falls back to `redis://:rdcs@localhost:6379/0` if `REDIS_URL` is not set (`app.controller.ts:12`). In production, this would silently connect to localhost Redis with a weak password instead of failing

7. **`JWT_REFRESH_SECRET`**: Used by `app.config.ts:7` but NOT in `env.validation.ts`. In production, `config.getOrThrow('app.jwtRefreshSecret')` would return `undefined` and throw, but this is not validated at startup

### Files Requiring Modification

- **Modify**: `apps/api/src/common/validation/env.validation.ts` — rename `WEB_ORIGIN` → `WEB_ORIGINS`, add `JWT_REFRESH_SECRET`, add production fail-fast for secrets
- **Create**: `.env.example` — document all required env vars
- **Modify**: `apps/api/src/app.controller.ts` — remove insecure fallback for `REDIS_URL` in production
- **Modify**: `apps/worker/src/main.ts` — remove insecure fallback for `REDIS_URL` in production
- **Modify**: `apps/api/test/setup/test-redis.ts` — support `REDIS_URL` in addition to `REDIS_HOST`/`REDIS_PORT`
- **Modify**: `.github/workflows/ci.yml` — provide `REDIS_URL` instead of `REDIS_HOST`/`REDIS_PORT`, fix `JWT_SECRET` to be ≥32 chars
- **Modify**: `docker/docker-compose.base.yml` — remove weak default passwords, require explicit configuration

---

## 7. Exact Files Requiring Modification

### Production Configuration (Part 2)

| File | Action |
|------|--------|
| `apps/api/src/common/validation/env.validation.ts` | Modify — rename `WEB_ORIGIN` → `WEB_ORIGINS`, add `JWT_REFRESH_SECRET`, prod fail-fast |
| `apps/api/src/app.controller.ts` | Modify — remove insecure `REDIS_URL` fallback in production |
| `apps/worker/src/main.ts` | Modify — remove insecure `REDIS_URL` fallback in production |
| `apps/api/test/setup/test-redis.ts` | Modify — support `REDIS_URL` parsing |
| `.github/workflows/ci.yml` | Modify — use `REDIS_URL`, fix `JWT_SECRET` length |
| `docker/docker-compose.base.yml` | Modify — remove weak default passwords |
| `.env.example` | Create — document all env vars |

### Rate Limiting (Part 3)

| File | Action |
|------|--------|
| `apps/api/package.json` | Modify — add `@nestjs/throttler` dependency |
| `apps/api/src/app.module.ts` | Modify — register `ThrottlerModule` |
| `apps/api/src/modules/telephony/telephony.controller.ts` | Modify — apply `ThrottlerGuard` |
| `apps/api/src/common/guards/telephony-throttler.guard.ts` | Create — tenant-aware throttler |
| `apps/api/test/integration/telephony-rate-limit.spec.ts` | Create — rate limiting tests |

### Observability (Part 4)

| File | Action |
|------|--------|
| `apps/api/src/modules/telephony/telephony.service.ts` | Modify — inject `LoggerService`, add structured logging |
| `apps/api/src/modules/telephony/telephony-socket.service.ts` | Modify — inject `LoggerService`, log auth events |
| `apps/api/src/modules/telephony/telephony.module.ts` | Modify — import `LoggerModule` if needed |

### Browser E2E (Part 5)

| File | Action |
|------|--------|
| `e2e/telephony.spec.ts` | Create — Playwright E2E test specs |
| `e2e/helpers/auth.ts` | Create — E2E auth helper |
| `e2e/helpers/seed.ts` | Create — E2E seed data helper |
| `apps/web/src/app/login/page.tsx` | Modify — add `data-testid` attributes |
| `apps/web/src/app/calls/page.tsx` | Modify — add `data-testid` attributes |
| `playwright.config.ts` | Modify — adjust for CI environment |

### CI E2E Job (Part 6)

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Modify — add `test-phase4-e2e` job |

---

## 8. Risks Discovered

1. **No rate limiting** — compromised token could spam API. Mitigated by concurrency controls but not sufficient for production
2. **No Winston logging in telephony** — diagnostic logging gaps for debugging production issues
3. **Socket auth failures not logged** — no visibility into connection attack patterns
4. **Env var naming inconsistency** — `WEB_ORIGIN` vs `WEB_ORIGINS`, `REDIS_URL` vs `REDIS_HOST/PORT` could cause production misconfiguration
5. **Insecure Redis fallback** — `app.controller.ts` silently falls back to `redis://:rdcs@localhost:6379/0` — in production this could mask a missing `REDIS_URL`
6. **`JWT_SECRET` in CI is 25 chars** — would fail `min(32)` validation if `validateEnv()` were called in tests
7. **`JWT_REFRESH_SECRET` not validated** — `app.config.ts` reads it via `getOrThrow` but it's not in env validation schema
8. **Docker Compose weak passwords** — default passwords `rdcs`, `minio123456` are insecure
9. **No `.env.example`** — operators have no template for required env vars
10. **No browser E2E** — API integration tests cover backend but not full user workflow
11. **Seed data password** — all seed users share the same bcrypt hash for `password` — acceptable for test/dev but must not be used in production
12. **`test-redis.ts` uses `REDIS_HOST`/`REDIS_PORT`** — inconsistent with `REDIS_URL` canonical naming

---

## Audit Conclusion

Phase 4 core acceptance is verified. Four production-readiness gates remain:

1. **Browser E2E** — Playwright infra ready, no tests written
2. **Rate limiting** — No throttling on telephony endpoints
3. **Observability** — Winston not wired to telephony, socket auth failures not logged
4. **Production configuration** — Env var naming inconsistencies, insecure fallbacks, no `.env.example`

No code modifications have been made during this audit. Proceeding to remediation.
