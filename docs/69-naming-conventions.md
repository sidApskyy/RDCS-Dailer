# 69 — Naming Conventions

**Document Control**

| Property | Value |
|----------|-------|
| Title | Naming Conventions |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the naming conventions for the RDCS In-House Dialer Platform. Consistent naming improves readability, discoverability, and maintainability across the codebase.

## 2. General Rules

- Be descriptive and unambiguous.
- Avoid abbreviations unless universally understood.
- Use American English spelling.
- Keep names concise but clear.
- Avoid magic numbers and strings; use named constants.

## 3. Code Naming

### 3.1 Variables

- `camelCase` for variables and function parameters.
- Boolean variables prefixed with `is`, `has`, `can`, `should` when appropriate.

Examples:
- `userId`, `campaignName`, `isActive`, `hasPermission`, `canDial`

### 3.2 Constants

- `SCREAMING_SNAKE_CASE` for module-level constants.
- `camelCase` for exported constants from config if object-based.

Examples:
- `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`, `JWT_EXPIRY_SECONDS`

### 3.3 Functions

- `camelCase`, descriptive verb phrases.
- Use `get`, `set`, `create`, `update`, `delete`, `validate`, `calculate`, `handle`, `publish` as prefixes.

Examples:
- `getCampaignById`, `createLead`, `validatePhoneNumber`, `handleCallCompleted`, `publishEvent`

### 3.4 Classes

- `PascalCase` for classes, interfaces, enums, and types.
- Use nouns for entities; use `Service`, `Repository`, `Controller`, `Handler`, `Adapter` suffixes.

Examples:
- `CampaignService`, `PrismaCampaignRepository`, `CampaignController`, `CreateCampaignHandler`, `VicidialAdapter`

### 3.5 Interfaces

- `PascalCase` without `I` prefix (NestJS/TypeScript convention).
- Exception: repository interfaces may use `IRepository` if team prefers explicit interface naming.

Examples:
- `CampaignRepository`, `TelephonyAdapter`, `UserService`

### 3.6 Enums

- `PascalCase` for enum name.
- Members: `PascalCase` or `SCREAMING_SNAKE_CASE`.

Examples:
```typescript
enum CampaignStatus {
  Draft = 'draft',
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Archived = 'archived',
}
```

### 3.7 Types & Type Aliases

- `PascalCase`.

Examples:
- `CampaignResponse`, `CreateCampaignInput`, `PermissionScope`

## 4. File Naming

### 4.1 Backend Files

- `kebab-case.ts` for most files.
- CQRS files: `feature-name.command.ts`, `feature-name.handler.ts`, `feature-name.query.ts`.
- Test files: `*.spec.ts` (unit), `*.test.ts` (integration).

Examples:
- `campaign.service.ts`, `create-campaign.command.ts`, `campaign.controller.ts`, `campaign.spec.ts`

### 4.2 Frontend Files

- Components: `PascalCase.tsx`.
- Pages: `page.tsx` (Next.js App Router convention).
- Utilities/hooks: `camelCase.ts` or `useCamelCase.ts` for hooks.
- Styles: `kebab-case.module.css` or inline Tailwind.

Examples:
- `CampaignList.tsx`, `useCampaigns.ts`, `campaign-utils.ts`

### 4.3 Test Files

- Unit: `*.spec.ts`.
- Integration: `*.test.ts`.
- E2E: `*.e2e.ts` or `*.spec.ts` in e2e folder.

Examples:
- `campaign.service.spec.ts`, `campaign.controller.test.ts`, `agent-calls.e2e.ts`

## 5. Database Naming

### 5.1 Tables

- Plural `snake_case`.

Examples:
- `campaigns`, `lead_lists`, `call_events`, `dnc_entries`

### 5.2 Columns

- `snake_case`.

Examples:
- `tenant_id`, `created_at`, `assigned_to_user_id`, `caller_id`

### 5.3 Constraints & Indexes

- Primary key: `pk_{table}`.
- Foreign key: `fk_{table}_{column}`.
- Unique: `uq_{table}_{columns}`.
- Index: `idx_{table}_{columns}`.

Examples:
- `pk_campaigns`, `fk_calls_campaign_id`, `uq_users_tenant_email`, `idx_leads_tenant_status`

### 5.4 Prisma Models

- Singular `PascalCase`.
- Fields: `camelCase`.

Examples:
- `Campaign`, `LeadList`, `CallEvent`, `tenantId`, `createdAt`

## 6. API Naming

### 6.1 Endpoints

- `kebab-case`, plural nouns for resources.
- Action verbs in path for operations beyond CRUD.

Examples:
- `/api/v1/campaigns`, `/api/v1/campaigns/:id/activate`, `/api/v1/leads/import`

### 6.2 DTOs

- `PascalCase` with suffix `Dto` or `Input`/`Response`.

Examples:
- `CreateCampaignDto`, `CampaignResponse`, `UpdateLeadInput`

### 6.3 Query Parameters

- `camelCase`.

Examples:
- `campaignId`, `pageSize`, `createdAtFrom`

## 7. Git Branch Naming

- `feature/{ticket-id}-{short-description}`
- `bugfix/{ticket-id}-{short-description}`
- `hotfix/{ticket-id}-{short-description}`
- `release/{version}`

Examples:
- `feature/RDCS-123-campaign-activation`, `hotfix/RDCS-456-auth-lockout`

## 8. Environment Variables

- `SCREAMING_SNAKE_CASE`.
- Group by service with prefix if needed.

Examples:
- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `MINIO_ROOT_USER`, `API_PORT`

## 9. Docker & Infrastructure

- Service names: `kebab-case`.
- Container names: `rdcs_{service}`.
- Image tags: `rdcs/{service}:{version}`.

Examples:
- `rdcs_api`, `rdcs/web:v1.2.3`, `rdcs_nginx`

## 10. Events

- Event classes: `PascalCase` with suffix `Event`.
- Event types (strings): `PascalCase` or `kebab-case` depending on channel.

Examples:
- `CampaignActivatedEvent`, `call.completed`, `recording.available`

## 11. Exceptions

- `PascalCase` with suffix `Exception` or `Error`.

Examples:
- `CampaignNotFoundException`, `UnauthorizedError`, `ValidationError`

## 12. Documentation Files

- `kebab-case.md`.
- Numbered for architecture docs: `01-executive-summary.md`.

Examples:
- `campaign-flow.md`, `api-gateway.md`, `01-executive-summary.md`
