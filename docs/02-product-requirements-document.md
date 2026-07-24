# 02 — Product Requirements Document (PRD)

**Document Control**

| Property | Value |
|----------|-------|
| Title | Product Requirements Document |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

### 1.1 Purpose

This Product Requirements Document (PRD) defines the functional and non-functional requirements for the RDCS In-House Dialer Platform. It serves as the authoritative source for engineering, QA, DevOps, security, and executive stakeholders.

### 1.2 Product Vision

Build a world-class, in-house outbound contact center platform that uses ViciDial solely as a telephony execution engine while retaining full ownership of business logic, user experience, compliance, reporting, analytics, and AI.

### 1.3 Target Users

- Contact Center Agents
- Team Leads / Supervisors
- Operations Managers
- QA Analysts
- Compliance Officers
- System Administrators
- Integration Engineers / CRM Teams
- C-Suite / Executives

## 2. Goals & Objectives

### 2.1 Business Goals

1. Reduce per-seat and per-minute telephony licensing costs.
2. Eliminate vendor roadmap dependency for core dialer workflows.
3. Establish a reusable platform for future inbound and omnichannel expansion.
4. Ensure regulatory compliance (TCPA, DNC, GDPR/CCPA where applicable, call recording consent).
5. Improve contact rates, agent productivity, and QA efficiency through AI.

### 2.2 Product Objectives

1. Provide a modern, responsive web application for agents and supervisors.
2. Deliver multiple dialing modes: manual, preview, progressive, predictive, and power.
3. Support multi-tenant organizations with departments and teams.
4. Enable lead ingestion at scale via CSV upload and API.
5. Offer real-time dashboards, historical reporting, and quality analytics.
6. Expose a comprehensive REST and WebSocket API ecosystem.
7. Integrate with major CRM platforms through a generic webhook and connector framework.

## 3. Scope

### 3.1 In Scope

- Multi-tenant user, organization, department, team, role, and permission management.
- Campaign lifecycle management and lead list management.
- CSV import, validation, assignment, and recycling.
- All dialing modes with appropriate controls.
- AMD/voicemail detection and disposition capture.
- Call recording capture, storage, playback, and download.
- Callbacks and appointment scheduling.
- DNC list management and compliance controls.
- Caller ID rotation and timezone-aware scheduling.
- Real-time and historical dashboards.
- CRM integration and webhook engine.
- Notification engine (in-app, email, SMS, webhooks).
- Audit logging and activity timeline.
- AI modules: STT, summaries, sentiment, auto-QA, auto-disposition, real-time transcription.

### 3.2 Out of Scope (Phase 1)

- Inbound ACD/IVR.
- Workforce management (WFM) and scheduling beyond callbacks.
- Omnichannel (chat, email, social) handling.
- Native mobile applications.
- Custom hardware endpoint management.

## 4. Functional Requirements

See `04-functional-requirements.md` for the detailed, itemized matrix. This section summarizes the major capability areas.

### 4.1 Authentication & Identity

- In-house authentication with JWT, refresh tokens, MFA/TOTP optional.
- OAuth2 / SAML / OIDC integration for enterprise SSO.
- Password policies, account lockout, session management.
- Audit all login/logout and credential events.

### 4.2 Authorization & RBAC

- Role-based access control with tenant-aware scoping.
- Granular permissions: resource × action × scope (own, team, department, organization, cross-tenant admin).
- Dynamic permission evaluation at API gateway and service layer.
- Predefined roles: Super Admin, Tenant Admin, Supervisor, Agent, QA Analyst, Read-Only, CRM Integrator.

### 4.3 Multi-Tenancy

- Tenant isolation at data layer (row-level tenantId) with optional schema-per-tenant future path.
- Shared application and queue infrastructure with per-tenant rate limits and quotas.
- White-labeling support: branding, subdomains, custom caller IDs.

### 4.4 Organizations, Departments & Teams

- Hierarchical org structure.
- Department-level campaigns, supervisors, and lead visibility.
- Team-level agent assignment and skill-based routing.

### 4.5 Campaigns

- Campaign creation with dialing mode, caller IDs, schedules, compliance rules.
- Status lifecycle: draft, active, paused, completed, archived.
- Pause/resume, time-zone scheduling, pacing algorithm configuration.
- Real-time campaign metrics and controls.

### 4.6 Lead Management

- Lead list creation and bulk CSV import with template validation.
- Field mapping, deduplication, phone validation, timezone derivation.
- Lead assignment to campaigns, teams, agents.
- Recycling rules based on disposition and time elapsed.
- Lead status tracking and DNC suppression.

### 4.7 Dialer Engine

- Manual dialer: agent-initiated calls with click-to-call.
- Preview dialer: present lead record before dialing; agent accepts/rejects.
- Progressive dialer: automatic next lead when agent becomes ready.
- Power dialer: dial multiple lines per available agent.
- Predictive dialer: predictive algorithms with abandon-rate controls and safe-guards.
- Universal controls: hold, mute, transfer, conference, disposition, callback.

### 4.8 Call Handling & Dispositions

- Answering Machine Detection (AMD) and Voicemail Detection.
- Call recording start/stop controls and consent capture.
- Disposition codes and sub-dispositions.
- Callback scheduling with calendar integration.
- Warm/cold transfer to agents, queues, or external numbers.

### 4.9 Compliance

- DNC list scrubbing at import and dial time.
- Time-zone aware allowed calling windows per campaign.
- TCPA-compliant dialing: consent tracking, reassigned number detection hook, abandon-rate guardrails.
- Caller ID rotation with reputation monitoring hooks.
- Recording consent and pause capabilities.

### 4.10 Reporting & Analytics

- Live dashboard: agents on call, calls in progress, abandon rate, connection rate.
- Historical dashboard: call volume, outcomes, conversion funnel, talk time.
- Supervisor dashboard: team performance, agent status, barging/listen.
- Admin dashboard: tenant health, system metrics, audit trails.
- Export to CSV/Excel/PDF; scheduled reports.

### 4.11 CRM Integration

- Generic webhook engine for outbound and inbound event delivery.
- REST API for bi-directional sync.
- Pre-built connectors for Salesforce, HubSpot, Zoho (Phase 2).
- Event types: lead.created, call.completed, disposition.set, recording.available.

### 4.12 AI Modules

- Speech-to-text on completed recordings.
- Call summaries and key phrase extraction.
- Sentiment analysis per call and aggregated.
- Auto-QA scoring against rubrics.
- Auto-disposition suggestions.
- Real-time transcription with agent assist hooks.
- Future AI agent support via pluggable agent orchestrator.

## 5. Non-Functional Requirements

See `05-non-functional-requirements.md` for detailed targets. Key themes:

- High Availability: 99.9% uptime.
- Horizontal Scaling: stateless API, worker autoscaling.
- Fault Tolerance: retry policies, DLQs, circuit breakers.
- Zero-Downtime Deployment: blue/green with Nginx.
- Security: OAuth2, encryption at rest/in transit, secrets management.
- Performance: p95 API latency < 100ms; dialer decisions < 200ms.
- Observability: metrics, logs, traces, alerting.

## 6. User Personas

Detailed personas are in `07-user-personas.md`.

### 6.1 Agent

Makes outbound calls, navigates leads, applies dispositions, schedules callbacks, listens to recordings for self-review.

### 6.2 Supervisor

Monitors team performance in real time, listens/barges, coaches agents, manages lead assignment and campaigns.

### 6.3 Operations Manager

Configures campaigns, compliance rules, lead imports, caller IDs, and reviews reporting.

### 6.4 QA Analyst

Reviews recordings, applies scoring rubrics, validates auto-QA results, generates quality reports.

### 6.5 System Administrator

Manages tenants, users, roles, integrations, system health, and security policies.

### 6.6 Compliance Officer

Audits DNC/TCPA controls, recording consent, call logs, and exportable compliance reports.

## 7. User Stories

Detailed user stories are in `08-user-stories.md`.

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Platform Uptime | 99.9% |
| API p95 Latency | < 100ms |
| Dialer Decision Latency | < 200ms |
| Concurrent Agents | 5,000+ |
| Leads Processed / Day | 1M+ per tenant |
| Lead Import Throughput | 100K rows / 10 min |
| Call Recording Retrieval | < 2s |
| First-Time Agent Onboarding | < 15 min |

## 9. Assumptions & Dependencies

### 9.1 Assumptions

- ViciDial/Asterisk infrastructure is provisioned separately and exposed via AMI/AGI/ARI and database.
- SIP trunks from Telnyx, Twilio Elastic SIP, or SignalWire are procured and configured.
- PostgreSQL and Redis are deployed as managed or self-hosted HA clusters.
- Engineering team adopts NestJS/NextJS/Prisma stack without major retraining.

### 9.2 Dependencies

- ViciDial patch levels and Asterisk LTS versions.
- Cloudflare DNS/WAF and Let's Encrypt certificate lifecycle.
- S3/MinIO object storage for recordings.
- Identity provider for enterprise SSO (optional).

## 10. Open Questions

1. Is there an existing identity provider that must be integrated on day one?
2. What is the expected initial tenant and agent count at launch?
3. Are there existing CRM systems beyond Salesforce/HubSpot/Zoho to support?
4. What are the jurisdiction-specific recording consent requirements?
5. Is there a preferred cloud provider, or will this be on-premises only?
