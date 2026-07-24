# Phase 0 — Repository Stabilization Implementation Plan

**Plan status:** Ready for implementation
**Scope:** Phase 0 only
**Prerequisite:** `docs/audits/phase-0-repository-audit.md`

## Execution Principles

- Execute tasks in order unless a task is explicitly independent.
- Do not implement authentication, campaigns, leads, telephony, dialing, AI, reporting, integrations, or other future-phase business features.
- Do not claim verification until the exact command has been executed and its output recorded.
- Every failed command requires root-cause diagnosis, a targeted fix, and rerunning dependent checks.
- Preserve the current partial identity schema; do not expand the schema beyond what is required for Phase 0 reproducibility.

## Task Inventory

### P0-PLAN-001 — Repair package manifests

**Objective:** Make every workspace manifest valid JSON and make the root scripts executable.

**Files affected:**

- `package.json`
- `apps/api/package.json`

**Dependencies:** None.

**Implementation steps:**

1. Remove the malformed trailing quote from the root `db:seed` script.
2. Remove the trailing comma from the API `typecheck` script.
3. Parse every `package.json` recursively.
4. Confirm all root script names point to existing workspace scripts.

**Expected result:** pnpm can parse the root and API manifests.

**Verification command:**

```powershell
Get-ChildItem -Filter package.json -Recurse -File | ForEach-Object { Get-Content -Raw $_.FullName | ConvertFrom-Json | Out-Null }
pnpm --version
pnpm run db:generate --if-present
```

**Rollback consideration:** Restore the two manifest files from the pre-task copy if parsing or script resolution regresses.

### P0-PLAN-002 — Normalize workspace ownership

**Objective:** Make pnpm the single workspace source of truth.

**Files affected:**

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`

**Dependencies:** P0-PLAN-001.

**Implementation steps:**

1. Keep `pnpm-workspace.yaml` as the authoritative workspace declaration.
2. Remove the duplicate root `workspaces` property unless a verified tool requires it.
3. Confirm every `apps/*` and `packages/*` directory with a manifest is intentionally included.
4. Verify Turbo task names against package scripts.
5. Ensure `db:generate` is available only from the authoritative database package.

**Expected result:** The workspace graph is deterministic and contains no duplicate package ownership rules.

**Verification command:**

```powershell
pnpm list --depth -1
pnpm turbo run build --dry
pnpm turbo run typecheck --dry
```

**Rollback consideration:** Restore the root manifest and Turbo configuration if package discovery changes unexpectedly; do not reintroduce duplicate workspace sources without evidence.

### P0-PLAN-003 — Establish authoritative Prisma package

**Objective:** Make `@rdcs/database` the only Prisma owner and make generation independent of API package resolution.

**Files affected:**

- `packages/database/package.json`
- `packages/database/prisma/schema.prisma`
- `packages/database/src/index.ts`
- `packages/database/tsconfig.json`
- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/prisma/prisma.service.ts`
- Optional `packages/database/prisma.config.ts` if required by installed Prisma version.

**Dependencies:** P0-PLAN-001, P0-PLAN-002.

**Implementation steps:**

1. Keep the schema under `packages/database/prisma/schema.prisma`.
2. Ensure the database package declares matching `prisma` and `@prisma/client` versions.
3. Ensure the database package exports the generated client used by the API.
4. Remove stale API Prisma scripts/dependencies/configuration and stale API Prisma include paths.
5. Add Prisma configuration only if required by the selected Prisma version.
6. Validate the schema and generate the client from `@rdcs/database`.
7. Add a minimal migration baseline only after generation succeeds.

**Expected result:** Prisma generation and API compilation use one package and one schema.

**Verification command:**

```powershell
pnpm --filter @rdcs/database exec prisma validate
pnpm --filter @rdcs/database db:generate
pnpm --filter @rdcs/database build
pnpm --filter @rdcs/api typecheck
```

**Rollback consideration:** Preserve the existing schema before migration changes. Roll back package ownership changes if generation cannot resolve the client without reintroducing a second schema.

### P0-PLAN-004 — Align dependencies and regenerate lockfile

**Objective:** Make the lockfile reflect all current manifests and direct imports.

**Files affected:**

- All package manifests as required by direct import review.
- `pnpm-lock.yaml`

**Dependencies:** P0-PLAN-003.

**Implementation steps:**

1. Add `@socket.io/redis-adapter` to the socket package because it is imported directly.
2. Remove stale direct API Prisma dependencies if no longer imported directly.
3. Review all direct imports against package manifests.
4. Run lockfile regeneration from the repository root.
5. Review the diff for unexpected package removals or additions.

**Expected result:** The lockfile importer sections match all package manifests.

**Verification command:**

```powershell
pnpm install --lockfile-only
pnpm install --frozen-lockfile
pnpm why @prisma/client
pnpm why @socket.io/redis-adapter
```

**Rollback consideration:** Keep the previous lockfile copy until frozen installation succeeds and the importer diff has been reviewed.

### P0-PLAN-005 — Normalize TypeScript and package exports

**Objective:** Make every package typecheck/build with a consistent runtime strategy.

**Files affected:**

- `packages/tsconfig/base.json`
- `packages/tsconfig/nestjs.json`
- `packages/tsconfig/nextjs.json`
- `apps/api/tsconfig.json`
- `apps/web/tsconfig.json`
- `apps/worker/tsconfig.json`
- `apps/socket/tsconfig.json`
- `packages/database/tsconfig.json`
- `packages/shared-types/tsconfig.json`
- `packages/shared-types/package.json`
- `packages/eslint-config/package.json`

**Dependencies:** P0-PLAN-004.

**Implementation steps:**

1. Remove stale Prisma include paths from the API project.
2. Verify `rootDir` and `outDir` do not include files outside each package boundary.
3. Decide whether shared types are source-exported or built; implement the smallest consistent option.
4. Correct ESLint package file declarations to match actual files.
5. Ensure Node services and Next compile with the intended module systems.
6. Build each package independently before invoking Turbo.

**Expected result:** No project references files owned by another package accidentally, and all package exports resolve in development and build mode.

**Verification command:**

```powershell
pnpm --filter @rdcs/shared-types typecheck
pnpm --filter @rdcs/database typecheck
pnpm --filter @rdcs/api typecheck
pnpm --filter @rdcs/worker typecheck
pnpm --filter @rdcs/socket typecheck
pnpm --filter @rdcs/web typecheck
pnpm build
```

**Rollback consideration:** Revert only the affected config/package export changes if a runtime module-resolution regression appears; keep the workspace and Prisma fixes intact.

### P0-PLAN-006 — Add environment contract and startup diagnostics

**Objective:** Make service configuration explicit and make dependency failures observable without implementing future business behavior.

**Files affected:**

- `.env.example`
- API config/bootstrap files.
- Worker startup file.
- Socket startup file.
- Web configuration only if required for startup.
- Minimal health controller/service files.

**Dependencies:** P0-PLAN-005.

**Implementation steps:**

1. Add a safe `.env.example` containing non-secret local variables and documented placeholders.
2. Define API, database, Redis, socket, web, and MinIO variable names consistently with Compose.
3. Add minimal `/api/v1/health` or equivalent health endpoint for process/dependency status.
4. Add startup diagnostics for configuration presence, database connectivity, and Redis connectivity.
5. Add graceful shutdown hooks for Prisma, Redis, worker, and socket resources.
6. Do not implement authentication or business endpoints as part of this task.

**Expected result:** Developers can understand startup failures and health checks can distinguish process-up from dependency-ready.

**Verification command:**

```powershell
pnpm --filter @rdcs/api build
pnpm --filter @rdcs/worker build
pnpm --filter @rdcs/socket build
pnpm --filter @rdcs/web build
```

**Rollback consideration:** Keep diagnostics additive and remove only the new health/startup code if it causes a boot regression; do not weaken validation to hide configuration failures.

### P0-PLAN-007 — Add Dockerfiles and correct Compose paths

**Objective:** Make the documented development stack buildable with the repository’s actual layout.

**Files affected:**

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/worker/Dockerfile`
- `apps/socket/Dockerfile`
- `docker/docker-compose.dev.yml`
- `docker/docker-compose.base.yml` only if validation requires it.
- `.dockerignore`

**Dependencies:** P0-PLAN-005, P0-PLAN-006.

**Implementation steps:**

1. Create minimal development Dockerfiles using Node 20 and pnpm 9-compatible setup.
2. Ensure the build context and workspace installation strategy work from the repository root.
3. Replace stale root Prisma mounts with the database package schema location or package it into the image.
4. Ensure each service has required environment variables and dependency ordering.
5. Add health checks only where they can be verified reliably.
6. Validate the merged Compose configuration.

**Expected result:** Compose can build and start infrastructure plus all four application services.

**Verification command:**

```powershell
docker compose -f docker/docker-compose.base.yml -f docker/docker-compose.dev.yml config
docker compose -f docker/docker-compose.base.yml -f docker/docker-compose.dev.yml build
docker compose -f docker/docker-compose.base.yml -f docker/docker-compose.dev.yml up -d
```

**Rollback consideration:** Use a separate Compose override or revert Dockerfiles if image builds destabilize the host; do not delete local data volumes without explicit approval.

### P0-PLAN-008 — Add migration and deterministic seed baseline

**Objective:** Make the current identity schema reproducible in local and CI environments.

**Files affected:**

- `packages/database/prisma/migrations/*`
- `packages/database/prisma/seed.ts`
- `packages/database/package.json`
- Optional seed configuration required by Prisma.

**Dependencies:** P0-PLAN-003, database connectivity from P0-PLAN-007 or local PostgreSQL.

**Implementation steps:**

1. Create the first migration from the current schema.
2. Add deterministic synthetic tenant/user/role/permission data only as required for startup and smoke tests.
3. Ensure seed credentials are clearly development-only and not production secrets.
4. Run migration and seed against a disposable database.
5. Do not add campaign, lead, call, or telephony data models.

**Expected result:** A clean PostgreSQL instance can be migrated and seeded reproducibly.

**Verification command:**

```powershell
pnpm --filter @rdcs/database db:migrate:deploy
pnpm --filter @rdcs/database db:seed
pnpm --filter @rdcs/database exec prisma validate
```

**Rollback consideration:** Drop and recreate only disposable verification databases; preserve migration history and never rewrite an applied migration.

### P0-PLAN-009 — Add test and lint command determinism

**Objective:** Ensure local quality commands fail clearly and do not silently mutate source.

**Files affected:**

- Root `package.json`.
- App/package manifests.
- ESLint configuration.
- Jest configuration if needed for current API tests.
- Minimal smoke test configuration only if required by existing scripts.

**Dependencies:** P0-PLAN-005.

**Implementation steps:**

1. Make lint verification non-mutating.
2. Ensure every workspace targeted by root Turbo commands has the expected script or is excluded intentionally.
3. Add a minimal API test configuration only if the API test script is retained.
4. Avoid adding broad test suites or future-phase behavior tests.
5. Run lint and available tests, recording missing-test behavior explicitly.

**Expected result:** `pnpm lint` and `pnpm test` have deterministic, documented behavior.

**Verification command:**

```powershell
pnpm lint
pnpm test
```

**Rollback consideration:** Keep test infrastructure changes isolated; if no tests exist, preserve a clear no-tests result rather than creating fake coverage.

### P0-PLAN-010 — Add CI-equivalent verification

**Objective:** Make CI run the same Phase 0 checks as a clean local environment.

**Files affected:**

- `.github/workflows/ci.yml`
- Optional `.github/workflows/phase-0.yml`
- Optional CI documentation.

**Dependencies:** P0-PLAN-004 through P0-PLAN-009.

**Implementation steps:**

1. Use Node 20 and pnpm 9 matching repository requirements.
2. Use frozen lockfile installation.
3. Run Prisma validation/generation, typecheck, lint, build, and available tests.
4. Add PostgreSQL and Redis services for database/runtime checks if required.
5. Do not add deployment workflows in Phase 0.
6. Keep CI secrets out of source and use non-production test values.

**Expected result:** CI validates the same foundation commands required by the Phase 0 exit gate.

**Verification command:**

```powershell
pnpm install --frozen-lockfile
pnpm --filter @rdcs/database exec prisma validate
pnpm --filter @rdcs/database db:generate
pnpm typecheck
pnpm lint
pnpm build
```

**Rollback consideration:** Disable only the failing new CI job while diagnosing; do not weaken required checks or mark skipped jobs as passed.

## Phase 0 Verification Sequence

After all implementation tasks complete, run these checks in order and record exact output in `docs/audits/phase-0-final-verification.md`:

1. JSON/package manifest validation.
2. `pnpm install --frozen-lockfile`.
3. Prisma schema validation.
4. Prisma client generation.
5. Migration/seed against disposable PostgreSQL.
6. Workspace typecheck.
7. Workspace lint.
8. Workspace build.
9. Docker Compose config validation.
10. Docker Compose build/start.
11. PostgreSQL connectivity.
12. Redis connectivity.
13. API health check.
14. Web startup check.
15. Worker startup check.
16. Socket startup check.
17. CI workflow validation.

Any failure blocks Phase 0 completion.

## Phase 0 Exit Checklist

- [ ] Clean pnpm installation works.
- [ ] Frozen lockfile installation works.
- [ ] Prisma generation works.
- [ ] Prisma schema validates.
- [ ] TypeScript typecheck passes.
- [ ] ESLint passes.
- [ ] Build passes.
- [ ] API builds.
- [ ] Web builds.
- [ ] Worker builds.
- [ ] Socket service builds.
- [ ] Docker Compose starts successfully.
- [ ] PostgreSQL connectivity works.
- [ ] Redis connectivity works.
- [ ] Health endpoints work.
- [ ] Startup diagnostics work.
- [ ] No critical build errors remain.
- [ ] No high-severity repository issue remains unresolved.
- [ ] CI and local verification produce equivalent results.

## Plan Approval and Execution Boundary

This plan is complete. Implementation may begin with `P0-PLAN-001` only. Phase 1 must not begin until the final verification report proves every exit checklist item or documents an approved external blocker.
