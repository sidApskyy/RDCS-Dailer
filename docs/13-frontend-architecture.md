# 13 — Frontend Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Frontend Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the frontend architecture for the RDCS In-House Dialer Platform. The frontend is a modern, responsive web application built with Next.js, React, TypeScript, and TailwindCSS.

## 2. Technology Stack

| Concern | Technology |
|---------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript 5+ |
| UI Library | React 18+ |
| Styling | TailwindCSS 3+ |
| Components | Shadcn UI / Radix UI primitives |
| State Management | Zustand |
| Server State | TanStack Query (React Query) v5 |
| Forms | React Hook Form + Zod |
| Real-Time | Socket.IO Client |
| Charts | Recharts |
| Icons | Lucide React |
| Testing | Vitest, React Testing Library, Playwright |

## 3. Architecture Principles

- **Feature-Based Organization**: Code organized by domain feature, not technical role.
- **Type Safety**: Strict TypeScript with shared DTO types from backend OpenAPI.
- **Server State Separation**: React Query for server state; Zustand for client state.
- **Optimistic UI**: Where safe, updates are applied optimistically with rollback on error.
- **Real-Time First**: Critical dashboards use WebSocket for live updates.
- **Accessibility**: WCAG 2.1 AA compliance where feasible.
- **Performance**: Code splitting, lazy loading, image optimization, caching.

## 4. Project Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (login, register, reset)
│   ├── (dashboard)/              # Dashboard route group
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
│   ├── api/                      # Next.js API route handlers (if any)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing / redirect
│   └── globals.css
├── components/
│   ├── ui/                       # Shadcn UI components (button, card, table, dialog)
│   ├── layout/                   # Sidebar, topbar, breadcrumbs
│   ├── forms/                    # Reusable form inputs, validators
│   ├── dashboards/               # Dashboard widgets
│   ├── campaigns/                # Campaign-specific components
│   ├── leads/                    # Lead-specific components
│   ├── calls/                    # Call controls and panels
│   ├── charts/                   # Recharts wrappers
│   └── shared/                   # Loading, error, empty states
├── hooks/                        # Custom React hooks
├── lib/
│   ├── api.ts                    # Axios / fetch API client
│   ├── socket.ts                 # Socket.IO client setup
│   ├── auth.ts                   # Auth helpers
│   ├── permissions.ts            # Permission helpers
│   └── utils.ts                  # Utility functions
├── stores/                       # Zustand stores
│   ├── auth-store.ts
│   ├── tenant-store.ts
│   ├── ui-store.ts
│   └── call-store.ts
├── queries/                      # TanStack Query hooks
│   ├── use-campaigns.ts
│   ├── use-leads.ts
│   ├── use-calls.ts
│   └── use-recordings.ts
├── types/                        # Shared TypeScript types (mirrored from backend)
├── services/                     # Domain service functions (thin wrappers over API)
├── features/                     # Feature slices (optional, co-located logic)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 5. State Management

### 5.1 Zustand Stores

- **auth-store**: token, user, permissions, MFA state, session expiry.
- **tenant-store**: current tenant, organizations, departments, teams.
- **ui-store**: sidebar state, theme, notifications, toast queue.
- **call-store**: current call, agent status, lead card, real-time call events.

### 5.2 React Query

- Queries keyed by resource + filters + tenant.
- Stale time and cache time configured per resource sensitivity.
- Mutations invalidate related queries and emit optimistic updates.
- Background refetch on window focus for non-critical data.

### 5.3 Real-Time State

- Socket.IO namespace `/agents` for agent events.
- Socket.IO namespace `/supervisors` for monitoring events.
- Socket.IO namespace `/dashboard` for live metrics.
- Events update Zustand stores and React Query cache.

## 6. API Client

- Centralized Axios instance with interceptors for:
  - Base URL and API version prefix `/api/v1`.
  - JWT injection and refresh token rotation.
  - Tenant header injection.
  - Request/response logging in development.
  - Standard error handling and toast notifications.
  - Rate-limit retry backoff.

## 7. Routing & Code Splitting

- Next.js App Router with parallel routes for complex dashboards.
- Route groups separate auth and dashboard layouts.
- Dynamic route segments for resources (e.g., `/campaigns/[id]`).
- `loading.tsx` and `error.tsx` boundaries per route segment.
- Lazy load heavy components (charts, audio player, editor).

## 8. Authentication Flow

1. User submits credentials.
2. Backend returns access token, refresh token, user, permissions, tenant list.
3. Tokens stored in http-only cookies (preferred) or secure storage with XSS mitigations.
4. Axios interceptor uses access token; refresh on 401.
5. Socket.IO authenticates with token.
6. On logout, tokens revoked and caches cleared.

## 9. Permission-Driven UI

- `usePermission(resource, action, scope)` hook checks user permissions.
- Menu items filtered by permission list from `auth-store`.
- Buttons disabled/hidden if permission missing.
- Server independently authorizes all requests.

## 10. Form Handling

- React Hook Form for form state and validation.
- Zod schemas shared with backend where possible (via generated types).
- Inline validation errors, submission loading states, and success/error toasts.
- CSV import wizard uses multi-step form with progress tracking.

## 11. Real-Time Dashboards

### 11.1 Agent Dashboard Real-Time
- Subscribe to `agent:{agentId}` events.
- Update call state, lead card, status in real time.
- Play subtle sound on incoming call (configurable).

### 11.2 Supervisor Dashboard Real-Time
- Subscribe to `supervisor:{departmentId}` or `supervisor:{teamId}`.
- Update agent grid, KPIs, alerts.
- Listen/barge streams managed via WebRTC or telephony adapter.

## 12. Call Interface Components

- **LeadCard**: Lead details, custom fields, script, previous call history.
- **CallControls**: Hold, mute, transfer, record pause, end.
- **DispositionPanel**: Campaign-specific dispositions, callback scheduler.
- **NotesPanel**: Call notes, tags.
- **ScriptPanel**: Dynamic script with merge fields.
- **TransferDialog**: Search agents/queues/external numbers.

## 13. Charting

- Recharts for line, bar, pie, area, and funnel charts.
- Dashboard charts are responsive and support tooltips.
- Common chart components: `MetricChart`, `FunnelChart`, `HeatmapChart`, `KpiCard`.

## 14. Error Handling

- Global error boundary catches unhandled errors.
- API errors displayed as toast notifications with retry.
- Form errors inline.
- 404/403 pages role-appropriate.
- Sentry integration for production error tracking.

## 15. Testing Strategy

- **Unit Tests**: Vitest + React Testing Library for components, hooks, utilities.
- **Integration Tests**: MSW for API mocking, component interaction flows.
- **E2E Tests**: Playwright for critical user journeys (login, campaign creation, make call, disposition).
- **Visual Regression**: Chromatic/Storybook (optional).

## 16. Performance Targets

- First Contentful Paint < 1.5s on dashboard pages.
- Time to Interactive < 3s.
- Real-time event latency < 500ms.
- Bundle size monitored per route.

## 17. Build & Deployment

- Next.js standalone output for Docker.
- Environment variables injected at runtime for multi-tenant config.
- Cloudflare CDN for static assets.
- Nginx routes to Next.js container.

## 18. Security Considerations

- CSP headers configured.
- All cookies secure, httpOnly, sameSite.
- XSS prevention via React escaping and input sanitization.
- CSRF protection via SameSite cookies and token headers.
- Dependency scanning in CI.
