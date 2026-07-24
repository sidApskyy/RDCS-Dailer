# 07 — User Personas

**Document Control**

| Property | Value |
|----------|-------|
| Title | User Personas |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the user personas for the RDCS In-House Dialer Platform. Personas guide feature prioritization, UX design, and permission modeling.

## 2. Personas

### 2.1 Agent — Samantha “Sam” Reyes

- **Role**: Outbound Contact Center Agent
- **Department**: Sales, West Region
- **Tenure**: 6 months
- **Goals**: Make calls efficiently, hit quota, follow scripts, minimize after-call work.
- **Frustrations**: Slow UI, confusing disposition flows, unclear callback handling, unstable calls.
- **Needs**:
  - One-click dial or auto-next-call.
  - Clear lead details and script guidance.
  - Fast disposition selection.
  - Callback scheduling visible in queue.
  - Call controls (hold, mute, transfer, recording).
- **Daily Workflow**:
  1. Log in and set status to Available.
  2. Receive or initiate next call.
  3. Review lead, follow script, take notes.
  4. Set disposition and schedule callback if needed.
  5. Enter wrap-up and repeat.
- **Permissions**: `lead:read` (own/team), `call:create`, `disposition:set`, `recording:read` (own), `callback:create`.

### 2.2 Supervisor — Marcus Chen

- **Role**: Team Supervisor / Floor Manager
- **Department**: Sales, West Region
- **Tenure**: 3 years
- **Goals**: Ensure team performance, coach agents, maintain compliance, resolve escalations.
- **Frustrations**: Lack of real-time visibility, poor alerting, slow reporting, no easy coaching tools.
- **Needs**:
  - Real-time team dashboard with agent statuses.
  - Listen, whisper, barge capabilities.
  - One-click campaign controls (pause, reassign leads).
  - Performance coaching reports.
  - Compliance monitoring.
- **Daily Workflow**:
  1. Review dashboard for team status and KPIs.
  2. Monitor calls and coach agents via whisper.
  3. Reassign leads or adjust campaign settings.
  4. End-of-day review reports and feedback sessions.
- **Permissions**: `agent:read`, `campaign:read/update`, `lead:read/update` (team/department), `call:read`, `recording:read` (team), `report:read`, `realtime:monitor`.

### 2.3 Operations Manager — Priya Patel

- **Role**: Contact Center Operations Manager
- **Tenure**: 5 years
- **Goals**: Optimize campaigns, ensure lead quality, manage compliance, control costs.
- **Frustrations**: Manual lead imports, limited visibility into conversion drivers, compliance risk.
- **Needs**:
  - Campaign creation and configuration.
  - Bulk CSV import with validation.
  - Caller ID management and rotation.
  - Compliance reporting (DNC, abandon, timezone).
  - Historical analytics and trend reports.
- **Daily Workflow**:
  1. Review campaign performance and KPIs.
  2. Configure new campaigns and lead lists.
  3. Import and validate leads.
  4. Review compliance reports and DNC updates.
  5. Share insights with leadership.
- **Permissions**: `campaign:manage`, `lead:manage`, `report:read`, `compliance:read`, `setting:read/update` (tenant).

### 2.4 QA Analyst — David Okafor

- **Role**: Quality Assurance Analyst
- **Tenure**: 2 years
- **Goals**: Evaluate calls, ensure script adherence, improve agent performance, maintain compliance.
- **Frustrations**: Manual call sampling, slow playback, no scoring rubrics, no AI assistance.
- **Needs**:
  - Searchable recording library with filters.
  - Playback with transcript and sentiment overlay.
  - Scoring rubrics and calibration.
  - Auto-QA suggestions.
  - Quality reports and agent scorecards.
- **Daily Workflow**:
  1. Sample calls from queues or filters.
  2. Listen and score against rubric.
  3. Review AI-generated summaries and sentiment.
  4. Provide feedback and generate reports.
- **Permissions**: `recording:read`, `call:read`, `qa:score`, `report:read`, `ai:read`.

### 2.5 Compliance Officer — Elena Rossi

- **Role**: Compliance Officer
- **Tenure**: 7 years
- **Goals**: Ensure TCPA, DNC, recording, and privacy compliance; respond to audits.
- **Frustrations**: Incomplete audit trails, manual DNC management, lack of jurisdictional controls.
- **Needs**:
  - DNC list management with audit trail.
  - Timezone and calling window enforcement reports.
  - Abandon rate monitoring.
  - Recording consent tracking.
  - Immutable exportable audit logs.
- **Daily Workflow**:
  1. Review DNC additions and scrubbing logs.
  2. Audit abandon rate and timezone compliance.
  3. Verify recording consent policies.
  4. Respond to internal or external audits.
- **Permissions**: `compliance:manage`, `dnc:manage`, `audit:read`, `report:read`, `recording:read` (tenant).

### 2.6 System Administrator — James “Jim” Holloway

- **Role**: Platform Administrator
- **Tenure**: 4 years
- **Goals**: Keep platform secure, available, and performant; manage tenants and integrations.
- **Frustrations**: Poor observability, manual user provisioning, lack of automation.
- **Needs**:
  - Tenant provisioning and configuration.
  - User/role management.
  - Integration settings (SSO, webhooks, CRM).
  - System health dashboards and alerts.
  - Audit log access.
- **Daily Workflow**:
  1. Monitor system health and alerts.
  2. Provision or configure tenants and users.
  3. Manage security settings and integrations.
  4. Investigate incidents and review logs.
- **Permissions**: `tenant:manage`, `user:manage`, `role:manage`, `setting:manage`, `audit:read`, `system:read`.

### 2.7 CRM Integrator / Developer — Fatima Al-Rashid

- **Role**: Integration Engineer
- **Tenure**: 3 years
- **Goals**: Build reliable CRM sync, automate workflows, ensure data consistency.
- **Frustrations**: Poor API docs, missing webhooks, inconsistent data formats.
- **Needs**:
  - Comprehensive REST API with examples.
  - Webhook event catalog with signatures.
  - API keys and scoped permissions.
  - Sandbox environment.
  - Error handling and retry clarity.
- **Daily Workflow**:
  1. Read API documentation and OpenAPI specs.
  2. Configure webhooks and test payloads.
  3. Build/sync CRM data flows.
  4. Monitor integration health and errors.
- **Permissions**: `api:manage`, `webhook:manage`, `integration:read/update`, `lead:read/write` (tenant).

### 2.8 Executive / C-Suite — Robert Chen

- **Role**: VP of Contact Center Operations
- **Tenure**: 10 years
- **Goals**: Drive revenue, control cost, ensure compliance, make data-driven decisions.
- **Frustrations**: Siloed data, lack of strategic insights, delayed reporting.
- **Needs**:
  - High-level KPI dashboards.
  - Cost and utilization metrics.
  - Compliance risk summaries.
  - Trend and cohort analysis.
  - Executive summary exports.
- **Daily Workflow**:
  1. Review executive dashboard.
  2. Drill down into campaign performance.
  3. Review compliance and cost reports.
  4. Align with operations on priorities.
- **Permissions**: `executive:read`, `report:read` (cross-department), `dashboard:read`.

## 3. Persona Summary Matrix

| Persona | Primary Goal | Key Permissions | Primary Dashboard |
|---------|--------------|-----------------|-------------------|
| Agent | Make calls, hit quota | Own/team lead access, call/disposition | Agent Dashboard |
| Supervisor | Team performance, coaching | Department/team scope, monitor | Supervisor Dashboard |
| Ops Manager | Campaign optimization | Campaign/lead/compliance management | Campaign & Historical Reports |
| QA Analyst | Call quality | Recording/QA scoring | QA Review Dashboard |
| Compliance Officer | Regulatory adherence | DNC, audit, compliance reports | Compliance Dashboard |
| Sys Admin | Platform health/security | Tenant/user/role/setting management | Admin Dashboard |
| Integrator | CRM/data flow | API/webhook/integration | API Console |
| Executive | Strategic decisions | Cross-tenant/cross-department read | Executive Dashboard |
