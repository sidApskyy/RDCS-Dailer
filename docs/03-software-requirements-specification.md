# 03 — Software Requirements Specification (SRS)

**Document Control**

| Property | Value |
|----------|-------|
| Title | Software Requirements Specification |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete software behavior of the RDCS In-House Dialer Platform. It expands the PRD into precise, verifiable requirements suitable for implementation, test design, and acceptance.

### 1.2 Scope

This document covers the entire software system: frontend application, backend services, telephony adapter, data layer, messaging infrastructure, integrations, security, observability, and DevOps automation. It does not cover hardware procurement, physical telephony infrastructure, or carrier contracts, which are tracked separately.

### 1.3 Definitions & Acronyms

See `72-glossary-acronyms.md` for the full glossary. Key terms used in this document:

- **Tenant**: An isolated organizational boundary containing users, campaigns, leads, and data.
- **Campaign**: A configured outbound calling initiative with leads, schedules, dialing rules, and compliance settings.
- **Lead**: A contact record with phone numbers, attributes, and status within a campaign.
- **Disposition**: The outcome classification applied to a call by an agent or system.
- **DNC**: Do Not Call registry/list.
- **AMD**: Answering Machine Detection.
- **STT**: Speech-to-Text.
- **CQRS**: Command Query Responsibility Segregation.
- **RBAC**: Role-Based Access Control.

## 2. Overall Description

### 2.1 Product Perspective

The platform is a greenfield, self-hosted SaaS-style outbound dialer. It will replace or augment legacy dialer solutions and integrate with existing CRM and business systems via APIs and webhooks. ViciDial/Asterisk provides only call control and media handling; all business logic is implemented in the in-house application layer.

### 2.2 Product Functions

- Identity and access management with multi-tenant RBAC.
- Organization hierarchy and user lifecycle management.
- Campaign configuration and lifecycle management.
- Lead ingestion, validation, assignment, and recycling.
- Outbound dialing in multiple modes with real-time controls.
- Call handling, recording, disposition, and callback management.
- Compliance enforcement (TCPA, DNC, time zone, recording consent).
- Real-time and historical reporting and analytics.
- CRM integration, webhook, and notification delivery.
- AI-driven transcription, summarization, sentiment, and QA.
- Operational monitoring, logging, alerting, and disaster recovery.

### 2.3 User Classes & Characteristics

| User Class | Characteristics | Access Level |
|------------|-----------------|--------------|
| Super Admin | Platform-wide administration, tenant provisioning, system configuration | Cross-tenant |
| Tenant Admin | Organization configuration, billing, security settings | Tenant |
| Supervisor | Campaign management, team oversight, real-time monitoring | Department/Team |
| Agent | Lead calling, dispositions, callbacks | Own/Team leads |
| QA Analyst | Recording review, scoring, quality reports | Tenant/Department |
| Compliance Officer | Audit, DNC/TCPA review, policy verification | Tenant/Cross-tenant |
| CRM Integrator | API/webhook configuration, connector development | Tenant |

### 2.4 Operating Environment

- **Application Servers**: Ubuntu Server LTS, Docker containers on Docker Compose or Kubernetes (future).
- **Database**: PostgreSQL 15+ with read replicas and HA configuration.
- **Cache/Queue**: Redis 7+ with persistence and Sentinel/Cluster for HA.
- **Object Storage**: AWS S3 or MinIO-compatible cluster.
- **Telephony**: ViciDial/Asterisk on Ubuntu, SIP trunking from Telnyx/Twilio/SignalWire.
- **Client Browsers**: Latest Chrome, Firefox, Edge, Safari; WebRTC-ready agents.
- **Network**: Cloudflare-protected public endpoints, private networks for telephony and databases.

### 2.5 Design & Implementation Constraints

- All backend code must be written in TypeScript using NestJS.
- All frontend code must be written in TypeScript using Next.js and React.
- Database access must be through Prisma ORM.
- All API responses must follow the standardized envelope format defined in the API documentation.
- All telephony interactions must route through the Telephony Adapter Layer.
- No business logic may be implemented in ViciDial custom code.

### 2.6 Assumptions

- ViciDial is available via AMI, database access, and HTTP/AGI hooks.
- Carrier SIP trunks are configured and tested.
- Object storage is available with write/read/delete policies.
- Redis and PostgreSQL are provisioned with monitoring and backups.
- Engineering teams adopt the prescribed Clean Architecture and DDD patterns.

## 3. System Features

### 3.1 Authentication & Authorization

#### SRS-AUTH-001: In-House Authentication
The system shall provide in-house email/password authentication using bcrypt password hashing, JWT access tokens, and refresh tokens.

#### SRS-AUTH-002: MFA Support
The system shall optionally support time-based one-time passwords (TOTP) via authenticator applications for all user roles.

#### SRS-AUTH-003: Enterprise SSO
The system shall support SAML 2.0 and OIDC-based single sign-on integration at tenant level, configurable by Tenant Admins.

#### SRS-AUTH-004: Session Management
The system shall enforce configurable session TTL, idle timeout, concurrent session limits, and allow users to revoke sessions from the profile page.

#### SRS-AUTH-005: RBAC Engine
The system shall implement a dynamic permission engine evaluating resource-action-scope tuples at runtime against the user’s roles and tenant context.

#### SRS-AUTH-006: Permission Scopes
The system shall support scopes: `own`, `team`, `department`, `organization`, `tenant`, and `cross-tenant` (super admin).

#### SRS-AUTH-007: Predefined Roles
The system shall provide roles: Super Admin, Tenant Admin, Supervisor, Agent, QA Analyst, Compliance Officer, Read-Only, CRM Integrator.

### 3.2 Multi-Tenancy & Organization

#### SRS-ORG-001: Tenant Isolation
All data and resources shall be associated with a `tenantId`. Cross-tenant data access is prohibited except for Super Admin roles with explicit cross-tenant scope.

#### SRS-ORG-002: Organization Hierarchy
The system shall support a hierarchy: Tenant → Organization → Department → Team → Agent.

#### SRS-ORG-003: Department Scoping
Users and campaigns shall be scoped to departments; supervisors shall see only data within their assigned departments unless granted broader scope.

#### SRS-ORG-004: Team Assignment
Agents shall be assignable to one or more teams. Teams may be assigned to campaigns and receive lead allocations.

#### SRS-ORG-005: User Lifecycle
The system shall support user creation, invitation, activation, deactivation, password reset, role assignment, and soft deletion.

### 3.3 Campaign Management

#### SRS-CAM-001: Campaign Creation
Tenant Admins and Supervisors shall create campaigns with name, description, dialing mode, caller IDs, schedules, disposition sets, and compliance rules.

#### SRS-CAM-002: Campaign Lifecycle
Campaigns shall transition through statuses: draft, active, paused, completed, archived. Only active campaigns shall be dialed.

#### SRS-CAM-003: Dialing Modes
The system shall support manual, preview, progressive, power, and predictive dialing modes per campaign.

#### SRS-CAM-004: Scheduling
Campaigns shall support timezone-aware daily schedules, holiday calendars, and start/end dates.

#### SRS-CAM-005: Pacing Configuration
Predictive and power dialers shall support configurable lines-per-agent, target abandon rate, and maximum dial rate.

#### SRS-CAM-006: Caller ID Rotation
Campaigns shall rotate through a pool of caller IDs per call or per agent to distribute reputation and support compliance.

### 3.4 Lead Management

#### SRS-LEAD-001: Lead List Creation
Users shall create lead lists associated with campaigns and departments.

#### SRS-LEAD-002: CSV Import
The system shall accept CSV uploads of up to 100,000 rows per file with field mapping, validation, and error reporting.

#### SRS-LEAD-003: Lead Validation
Leads shall be validated for required fields, phone number format, timezone derivation, and DNC list matching.

#### SRS-LEAD-004: Deduplication
The system shall deduplicate leads within a campaign by phone number and optionally by external ID.

#### SRS-LEAD-005: Lead Assignment
Leads shall be assignable to teams, agents, or pools based on rules, round-robin, or skill-based logic.

#### SRS-LEAD-006: Lead Recycling
Leads shall be automatically recycled based on disposition, time elapsed, and maximum recycle attempts.

#### SRS-LEAD-007: Lead Status
Lead status shall include: pending, callable, in-progress, converted, not-interested, callback, dnc, invalid, recycled, completed.

### 3.5 Dialer Engine

#### SRS-DIAL-001: Agent Availability
The system shall track agent real-time status: available, on-call, wrap-up, away, logged-out.

#### SRS-DIAL-002: Manual Dialer
Agents shall click to call any lead within their assigned scope.

#### SRS-DIAL-003: Preview Dialer
The system shall present a lead to the agent and wait for explicit accept or skip before dialing.

#### SRS-DIAL-004: Progressive Dialer
The system shall automatically select the next available lead when the agent becomes ready.

#### SRS-DIAL-005: Power Dialer
The system shall dial multiple leads concurrently per available agent and connect answered calls to the agent.

#### SRS-DIAL-006: Predictive Dialer
The system shall use statistical pacing to maximize agent utilization while respecting a target abandon rate.

#### SRS-DIAL-007: Abandon Rate Guard
Predictive dialers shall pause or throttle dialing when the campaign abandon rate exceeds the configured threshold.

### 3.6 Call Handling

#### SRS-CALL-001: Call Initiation
The system shall initiate calls through the Telephony Adapter Layer, which forwards to ViciDial/Asterisk/SIP.

#### SRS-CALL-002: Call State Tracking
The system shall track call states: initiated, ringing, answered, voicemail, busy, no-answer, failed, completed.

#### SRS-CALL-003: AMD
The system shall detect answering machines/voicemail via Asterisk AMD or adapter-provided signals and apply system dispositions.

#### SRS-CALL-004: Call Recording
The system shall start/stop recording through the telephony adapter and receive recording metadata upon completion.

#### SRS-CALL-005: Dispositions
Agents shall select from configured disposition codes; system dispositions may also be applied.

#### SRS-CALL-006: Callbacks
Agents shall schedule callbacks with date, time, timezone, and recurrence notes. Callbacks re-enter the dial queue at the scheduled time.

#### SRS-CALL-007: Transfers
The system shall support warm and cold transfers to agents, queues, and external numbers.

### 3.7 Compliance

#### SRS-COMP-001: DNC Scrubbing
Leads shall be scrubbed against tenant DNC lists and optionally national DNC data at import and dial time.

#### SRS-COMP-002: Time-Zone Calling Windows
The system shall prevent dialing outside configured local time windows for each lead.

#### SRS-COMP-003: TCPA Abandon Rate
The system shall monitor and enforce maximum abandon rate per campaign; dialing shall be throttled if exceeded.

#### SRS-COMP-004: Consent Capture
Recording consent shall be captured per lead, per campaign, and per jurisdiction, and respected during recording.

#### SRS-COMP-005: Caller ID Reputation
The system shall provide hooks for caller ID reputation monitoring and automatic rotation/replacement.

### 3.8 Reporting & Analytics

#### SRS-REP-001: Live Dashboard
The system shall display real-time metrics: active agents, calls in progress, queue depth, connection rate, abandon rate.

#### SRS-REP-002: Historical Dashboard
The system shall provide time-range-filtered reports on call volume, outcomes, talk time, conversion, and agent performance.

#### SRS-REP-003: Export
Reports shall be exportable to CSV, Excel, and PDF formats.

#### SRS-REP-004: Scheduled Reports
The system shall support scheduled report generation and delivery via email/webhook.

#### SRS-REP-005: Analytics Engine
The system shall aggregate events into OLAP-friendly metrics and support trend analysis, cohorts, and funnel analysis.

### 3.9 CRM Integration & Webhooks

#### SRS-INT-001: Webhook Engine
The system shall support configurable webhook subscriptions with event filtering, retries, and HMAC signatures.

#### SRS-INT-002: CRM API
The system shall expose REST APIs for lead and call synchronization, suitable for CRM integration.

#### SRS-INT-003: Connector Framework
The system shall provide a connector SDK for future pre-built CRM integrations.

### 3.10 AI Modules

#### SRS-AI-001: Speech-to-Text
The system shall transcribe completed call recordings using an internal STT engine or adapter to an external service.

#### SRS-AI-002: Call Summaries
The system shall generate concise call summaries from transcripts and call metadata.

#### SRS-AI-003: Sentiment Analysis
The system shall classify call sentiment at call and segment level.

#### SRS-AI-004: Auto-QA
The system shall score calls against configurable rubrics covering script adherence, compliance, and tone.

#### SRS-AI-005: Auto-Disposition
The system shall suggest or auto-apply dispositions based on transcript and outcome signals.

#### SRS-AI-006: Real-Time Transcription
The system shall provide real-time transcription streams to agents and supervisors during active calls.

#### SRS-AI-007: Future AI Agent Support
The architecture shall support pluggable AI agent orchestrators for future autonomous or assistive agent capabilities.

## 4. External Interface Requirements

### 4.1 User Interfaces

The web application is built with Next.js, React, TailwindCSS, and Shadcn UI. It supports desktop browsers and responsive layouts for supervisor tablets.

### 4.2 Hardware Interfaces

Agent headsets connect through the browser WebRTC interface managed by the telephony adapter. No custom hardware drivers are required.

### 4.3 Software Interfaces

- **ViciDial/Asterisk**: AMI, AGI, ARI, database events, CDR/CEL tables.
- **PostgreSQL**: Primary transactional database via Prisma.
- **Redis**: Cache, session store, pub/sub, job queue.
- **S3/MinIO**: Object storage for recordings and exports.
- **Cloudflare**: DNS, WAF, CDN, DDoS protection.
- **Nginx**: Reverse proxy, load balancer, static file serving.

### 4.4 Communications Interfaces

- **REST API**: HTTPS/JSON, OpenAPI 3.0 documentation.
- **WebSocket**: Socket.IO for real-time agent state, call events, and dashboard updates.
- **Webhooks**: HTTPS POST with HMAC-SHA256 signatures and retry logic.
- **SIP**: RFC 3261 compliant SIP trunking and registration.
- **Internal Events**: Redis Pub/Sub and BullMQ message queues.

## 5. Non-Functional Requirements

See `05-non-functional-requirements.md`.

## 6. Design Constraints

- Backend must be written in NestJS/TypeScript.
- Frontend must be written in Next.js/React/TypeScript.
- ORM must be Prisma.
- Database must be PostgreSQL.
- Telephony must be abstracted behind the adapter layer.
- All secrets must be managed through a secret manager or Docker secrets, never hardcoded.

## 7. Appendices

- A: Glossary (`72-glossary-acronyms.md`)
- B: Permission Matrix (`09-permission-matrix.md`)
- C: API Documentation (`40-rest-api-documentation.md`)
- D: Database Schema (`36-prisma-schema-design.md`)
