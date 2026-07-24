# 68 — Folder Structure

**Document Control**

| Property | Value |
|----------|-------|
| Title | Folder Structure |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the recommended folder structure for the RDCS In-House Dialer Platform. The structure supports a monorepo with multiple applications and shared packages.

## 2. Monorepo Structure

```
rdcs-platform/
├── .github/
│   ├── workflows/              # GitHub Actions workflows
│   └── pull_request_template.md
├── apps/
│   ├── api/                    # NestJS backend
│   ├── web/                    # Next.js frontend
│   ├── socket/                 # Socket.IO gateway
│   ├── worker/                 # BullMQ workers
│   └── telephony/              # Telephony adapter service (optional)
├── packages/
│   ├── shared-types/           # Shared TypeScript types/DTOs
│   ├── ui/                     # Shared UI components (optional)
│   ├── eslint-config/          # Shared ESLint config
│   ├── tsconfig/               # Shared TypeScript configs
│   └── logger/                 # Shared logging utilities
├── docker/
│   ├── docker-compose.base.yml
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── docker-compose.telephony.yml
│   ├── docker-compose.monitoring.yml
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   └── monitoring/
│       ├── prometheus.yml
│       ├── loki-config.yml
│       ├── promtail-config.yml
│       └── grafana/
├── docs/                       # Architecture and engineering docs
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   ├── seed.ts
│   └── maintenance/
├── secrets/                    # Local secrets (gitignored)
├── tests/
│   ├── e2e/
│   └── performance/
├── README.md
├── package.json
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # or npm/yarn workspaces
└── .env.example
```

## 3. Backend (`apps/api`)

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── telephony.config.ts
│   │   └── storage.config.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── dto/
│   ├── core/
│   │   ├── base-entity.ts
│   │   ├── domain-event.ts
│   │   ├── result.ts
│   │   └── repository.interface.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── interface/
│   │   │   └── auth.module.ts
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
│   ├── telephony/
│   │   ├── telephony-adapter.interface.ts
│   │   ├── telephony.module.ts
│   │   ├── adapters/
│   │   ├── events/
│   │   └── services/
│   ├── events/
│   │   ├── event-bus.ts
│   │   ├── event-publisher.ts
│   │   └── handlers/
│   ├── jobs/
│   │   ├── import.worker.ts
│   │   ├── recording.worker.ts
│   │   ├── ai.worker.ts
│   │   ├── webhook.worker.ts
│   │   └── notification.worker.ts
│   └── infrastructure/
│       ├── prisma/
│       ├── redis/
│       ├── bullmq/
│       ├── s3/
│       └── logger/
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
├── jest.config.js
└── package.json
```

## 4. Frontend (`apps/web`)

```
apps/web/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── campaigns/
│   │   ├── leads/
│   │   ├── calls/
│   │   ├── recordings/
│   │   ├── quality/
│   │   ├── compliance/
│   │   ├── reports/
│   │   ├── crm/
│   │   ├── settings/
│   │   └── system/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # Shadcn UI components
│   ├── layout/                 # Sidebar, topbar, breadcrumbs
│   ├── forms/                  # Reusable form components
│   ├── dashboards/             # Dashboard widgets
│   ├── campaigns/
│   ├── leads/
│   ├── calls/
│   ├── recordings/
│   └── shared/                 # Loading, error, empty states
├── hooks/
├── lib/
│   ├── api.ts
│   ├── socket.ts
│   ├── auth.ts
│   ├── permissions.ts
│   └── utils.ts
├── stores/
│   ├── auth-store.ts
│   ├── tenant-store.ts
│   ├── ui-store.ts
│   └── call-store.ts
├── queries/
│   ├── use-campaigns.ts
│   ├── use-leads.ts
│   ├── use-calls.ts
│   └── use-recordings.ts
├── types/
├── services/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 5. Worker (`apps/worker`)

```
apps/worker/
├── src/
│   ├── main.ts
│   ├── worker.module.ts
│   ├── workers/
│   │   ├── import.worker.ts
│   │   ├── recording.worker.ts
│   │   ├── ai.worker.ts
│   │   ├── webhook.worker.ts
│   │   ├── notification.worker.ts
│   │   ├── export.worker.ts
│   │   └── compliance.worker.ts
│   └── config/
├── Dockerfile
├── tsconfig.json
└── package.json
```

## 6. Socket Gateway (`apps/socket`)

```
apps/socket/
├── src/
│   ├── main.ts
│   ├── socket.module.ts
│   ├── gateways/
│   │   ├── agent.gateway.ts
│   │   ├── supervisor.gateway.ts
│   │   ├── dashboard.gateway.ts
│   │   └── admin.gateway.ts
│   ├── services/
│   └── config/
├── Dockerfile
├── tsconfig.json
└── package.json
```

## 7. Shared Packages (`packages/`)

```
packages/
├── shared-types/
│   ├── src/
│   │   ├── dto/
│   │   ├── enums/
│   │   └── interfaces/
│   ├── package.json
│   └── tsconfig.json
├── eslint-config/
│   ├── index.js
│   └── package.json
├── tsconfig/
│   ├── base.json
│   ├── nestjs.json
│   └── nextjs.json
└── logger/
    ├── src/
    ├── package.json
    └── tsconfig.json
```

## 8. Prisma

- Prisma schema is shared at repository root `prisma/schema.prisma`.
- Migrations stored in `prisma/migrations/`.
- Seed script in `prisma/seed.ts`.
- Prisma Client generated for backend and workers.

## 9. Docker

- Docker Compose files in `docker/`.
- Dockerfiles in each app directory.
- Nginx and monitoring configs in `docker/`.

## 10. Documentation

- Architecture and engineering docs in `docs/`.
- README files in each app/package.
- ADRs in `docs/adrs/` (future).

## 11. Secrets

- Local secrets in `secrets/` (gitignored).
- Production secrets managed by secret manager.

## 12. Rationale

- Monorepo enables shared types, configs, and cross-app changes.
- Feature-based organization makes code discoverable.
- Clean Architecture layers within modules support testing and future microservices.
- Separation of API, socket, and worker services allows independent scaling.
