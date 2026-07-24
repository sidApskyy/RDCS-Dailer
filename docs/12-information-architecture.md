# 12 — Information Architecture

**Document Control**

| Property | Value |
|----------|-------|
| Title | Information Architecture |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the information architecture for the RDCS In-House Dialer Platform. It describes how information is organized, labeled, searched, and related across modules.

## 2. Core Information Domains

The platform is organized around the following information domains (DDD bounded contexts):

1. **Identity & Access**: tenants, users, roles, permissions, sessions, MFA, SSO.
2. **Organization**: organizations, departments, teams, hierarchy, assignments.
3. **Campaign**: campaigns, schedules, dialing modes, caller IDs, disposition sets.
4. **Lead**: lead lists, leads, custom fields, imports, validation, DNC, recycling.
5. **Dialer**: agent state, dialer sessions, queue management, pacing.
6. **Call**: call records, states, dispositions, callbacks, transfers, notes.
7. **Recording**: recording metadata, storage, playback, retention.
8. **Compliance**: DNC lists, timezone rules, consent, abandon monitoring.
9. **Reporting**: metrics, dashboards, reports, exports, scheduled reports.
10. **Integration**: webhooks, API keys, CRM connectors, event logs.
11. **AI**: transcripts, summaries, sentiment, QA scores, rubrics.
12. **Notification**: notification templates, preferences, delivery logs.
13. **Audit**: activity logs, immutable audit trail.
14. **System**: settings, health metrics, queue workers, tenants.

## 3. Entity Hierarchy

```
Tenant
└── Organization
    └── Department
        ├── Team
        │   ├── Agent
        │   └── Supervisor
        ├── Campaign
        │   ├── Lead List
        │   │   └── Lead
        │   ├── Caller ID Pool
        │   ├── Disposition Set
        │   └── Schedule
        ├── Call (linked to Campaign, Lead, Agent)
        ├── Recording (linked to Call)
        └── DNC List
```

## 4. Data Classification

| Classification | Examples | Handling |
|----------------|----------|----------|
| Public | Marketing pages, public API docs | No special controls |
| Internal | Campaign names, aggregate reports | RBAC scoped |
| Confidential | Lead PII, call recordings, transcripts | Encrypted, scoped, audited |
| Restricted | Passwords, API secrets, MFA seeds | Secret manager, never logged |

## 5. Naming Conventions

- Entities use singular PascalCase (e.g., `Campaign`, `Lead`).
- Tables use plural snake_case (e.g., `campaigns`, `lead_lists`).
- API endpoints use plural kebab-case (e.g., `/api/v1/campaigns`).
- Frontend routes use kebab-case (e.g., `/campaigns/:id`).
- Fields use camelCase in code and API, snake_case in database.

## 6. Taxonomy & Controlled Vocabularies

### 6.1 Campaign Status
- draft
- active
- paused
- completed
- archived

### 6.2 Dialing Modes
- manual
- preview
- progressive
- power
- predictive

### 6.3 Agent Status
- logged-out
- available
- on-call
- wrap-up
- away
- training

### 6.4 Lead Status
- pending
- callable
- in-progress
- completed
- callback
- dnc
- invalid
- not-interested
- recycled

### 6.5 Call States
- initiated
- ringing
- answered
- voicemail
- busy
- no-answer
- failed
- completed
- transferred
- conference

### 6.6 Disposition Categories
- no-answer
- busy
- voicemail
- not-interested
- callback
- converted
- dnc
- invalid
- fax-machine
- language-barrier
- follow-up

### 6.7 Permission Scopes
- own
- team
- department
- organization
- tenant
- cross-tenant

## 7. Search Architecture

- **Global Search**: Indexed by Elasticsearch/OpenSearch or PostgreSQL full-text search for leads, campaigns, agents, recordings.
- **Scoped Search**: Results filtered by user scope and tenant.
- **Filters**: Faceted filters by status, date, campaign, department, team.
- **Sorting**: Relevance, date, name, status.
- **Suggestions**: Autocomplete for common searches.

## 8. Metadata Model

Each primary entity supports:
- `id` (UUID)
- `tenantId` (foreign key)
- `createdAt`, `updatedAt`, `deletedAt` (soft delete)
- `createdBy`, `updatedBy`, `deletedBy` (audit)
- `version` (optimistic locking)
- Custom attributes via JSONB `metadata` or dedicated custom-field tables.

## 9. Relationship Model

### 9.1 One-to-Many
- Tenant → Organizations
- Organization → Departments
- Department → Teams
- Campaign → Lead Lists
- Lead List → Leads
- Campaign → Calls
- Call → Recordings
- User → Sessions
- User → Audit Logs

### 9.2 Many-to-Many
- User ↔ Role (via user_roles)
- User ↔ Team (via team_members)
- Lead ↔ DNC List (via dnc_matches)
- Campaign ↔ Caller ID Pool (via campaign_caller_ids)
- Campaign ↔ Disposition Set (via campaign_dispositions)
- User ↔ Permission (via roles)

### 9.3 Hierarchical
- Organization → Department → Team
- Campaign → Lead List → Lead
- Role → Permission

## 10. Content Lifecycle

### 10.1 Lead Lifecycle
1. Imported → Validated → Callable.
2. Dialed → In Progress.
3. Outcome → Completed / Callback / DNC / Invalid / Not Interested.
4. Recycled → Callable (if eligible).
5. Archived → Retained per policy, then deleted.

### 10.2 Campaign Lifecycle
1. Draft → Configuration.
2. Active → Dialing.
3. Paused → Temporary stop.
4. Completed → No more dialing.
5. Archived → Read-only.

### 10.3 Recording Lifecycle
1. Recording started → captured by telephony adapter.
2. Recording completed → file uploaded to object storage.
3. Metadata stored → linked to call.
4. Retention policy applied → deleted or archived.

## 11. Data Retention

| Data Type | Default Retention | Policy Owner |
|-----------|-------------------|--------------|
| Call detail records | 7 years | Compliance |
| Recordings | 2 years | Tenant/Compliance |
| Transcripts | Same as recordings | Tenant |
| Audit logs | 7 years | Compliance |
| Lead imports | 2 years | Operations |
| Webhook logs | 90 days | Engineering |
| System logs | 30 days | Engineering |

Retention policies are configurable per tenant where compliance allows.

## 12. Information Security

- PII is encrypted at rest and in transit.
- Access is scoped by role and tenant.
- All reads and writes of confidential data are audit-logged.
- Recordings and transcripts are stored in object storage with lifecycle policies.
- Data export is gated by permission and logged.

## 13. Integration Information Flows

- CRM pushes leads via API → validated → imported.
- Platform emits call events → webhooks → CRM.
- AI services consume recordings → produce transcripts/sentiment → stored in platform.
- Reporting aggregates events → dashboards and exports.

## 14. Future Information Domains

- **Inbound**: queues, IVR menus, ACD rules.
- **Workforce Management**: schedules, forecasts, adherence.
- **Omnichannel**: chat, email, social interactions.
- **Knowledge Base**: scripts, articles, agent assist content.
