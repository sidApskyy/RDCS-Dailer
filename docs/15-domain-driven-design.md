# 15 — Domain Driven Design (DDD)

**Document Control**

| Property | Value |
|----------|-------|
| Title | Domain Driven Design |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the Domain-Driven Design (DDD) approach for the RDCS In-House Dialer Platform. It identifies bounded contexts, aggregates, entities, value objects, domain services, domain events, and ubiquitous language.

## 2. Strategic DDD

### 2.1 Bounded Contexts

| Bounded Context | Responsibility | Modules |
|-------------------|----------------|---------|
| Identity & Access | Authentication, authorization, sessions, MFA, SSO | auth, rbac |
| Organization | Tenants, orgs, departments, teams, users | tenant, organization |
| Campaign | Campaign configuration, lifecycle, schedules | campaign |
| Lead Management | Lead lists, imports, validation, DNC, assignment | lead |
| Dialer | Agent state, pacing, call routing | dialer |
| Call Handling | Call lifecycle, dispositions, callbacks, transfers | call |
| Recording | Recording metadata, storage, playback | recording |
| Compliance | DNC, timezone, TCPA, consent, abandon rate | compliance |
| Reporting | Live and historical reports, dashboards | reporting, analytics |
| Integration | Webhooks, API keys, CRM connectors | integration, webhook |
| Notification | Multi-channel notifications | notification |
| AI | STT, summaries, sentiment, QA | ai |
| Audit | Activity logs, immutable audit trail | audit |
| System | Platform settings, health, monitoring | system |
| Telephony | Adapter abstraction for telephony engines | telephony |

### 2.2 Context Mapping

- **Shared Kernel**: Identity & Access and Organization share user/tenant concepts.
- **Customer-Supplier**: Compliance supplies DNC rules to Lead and Dialer contexts.
- **Conformist**: Reporting and Analytics conform to event schemas published by Call and Dialer contexts.
- **Anti-Corruption Layer**: Telephony adapter protects the domain from ViciDial/Asterisk specifics.
- **Open Host Service**: Integration context exposes webhooks and REST APIs as a published language.

## 3. Ubiquitous Language

| Term | Definition |
|------|------------|
| Campaign | An outbound calling initiative with leads, schedules, and dialing rules. |
| Lead | A contact record to be called within a campaign. |
| Lead List | A container of leads imported into a campaign. |
| Agent | A user authorized to make outbound calls. |
| Supervisor | A user who monitors and coaches agents. |
| Disposition | The outcome classification of a call. |
| Callback | A scheduled future call to a lead. |
| DNC | Do Not Call record or list. |
| AMD | Answering Machine Detection. |
| Caller ID | Outgoing number presented to the called party. |
| Abandon Rate | Percentage of answered calls disconnected before reaching an agent. |
| Wrap-up | Time after a call for agent to complete notes. |
| Pacing | Rate at which the dialer places calls. |
| Recycling | Re-queueing a lead for future dialing based on disposition. |

## 4. Tactical DDD

### 4.1 Aggregates

An aggregate is a cluster of associated objects treated as a unit for data changes. Each aggregate has a root entity and a boundary.

| Aggregate | Root Entity | Child Entities / Value Objects |
|-----------|-------------|-------------------------------|
| Tenant | Tenant | Organization, settings, branding |
| Organization | Organization | Departments |
| Department | Department | Teams |
| Team | Team | TeamMembers |
| User | User | UserRoles, Sessions, MFASettings |
| Role | Role | Permissions |
| Campaign | Campaign | Schedules, CallerIdPool, DispositionSet, CampaignRules |
| LeadList | LeadList | Leads (by reference) |
| Lead | Lead | LeadPhones, LeadStatus, CustomFields |
| DialerSession | DialerSession | AgentState, PacingConfig |
| Call | Call | CallEvents, Disposition, Notes, Callback |
| Recording | Recording | StorageReference, Transcript, RetentionPolicy |
| DncList | DncList | DncEntries |
| Webhook | WebhookSubscription | EventFilters, DeliveryLogs |
| AuditRecord | AuditRecord | (immutable) |

### 4.2 Entities

Entities have identity and lifecycle.

- **Tenant**: `tenantId`, name, status, region, settings.
- **User**: `userId`, email, passwordHash, status, tenantId.
- **Campaign**: `campaignId`, name, mode, status, tenantId, scheduleId.
- **Lead**: `leadId`, phone numbers, status, timezone, campaignId.
- **Call**: `callId`, state, campaignId, leadId, agentId, startTime, endTime.
- **Recording**: `recordingId`, callId, storagePath, duration, encryptionKeyId.
- **DncEntry**: `dncEntryId`, phoneNumber, source, effectiveDate, tenantId.

### 4.3 Value Objects

Value objects are immutable and compared by value.

- **PhoneNumber**: number, countryCode, type (mobile/landline), validated flag.
- **TimeWindow**: startTime, endTime, timezone, daysOfWeek.
- **CallerId**: number, label, reputationStatus.
- **Disposition**: code, category, isTerminal, requiresNotes.
- **CampaignSchedule**: timeWindows, startDate, endDate, holidays.
- **Address**: street, city, state, zip, country.
- **Money**: amount, currency (for cost tracking).
- **Duration**: seconds.

### 4.4 Domain Services

Domain services contain business logic that does not belong to a single aggregate.

- **DialerPacingService**: Computes predictive/power dial pacing based on metrics.
- **ComplianceService**: Determines if a lead is callable (DNC, timezone, consent).
- **LeadAssignmentService**: Assigns leads to teams/agents based on rules.
- **RecyclingService**: Determines if a lead is eligible for recycling.
- **CampaignActivationService**: Validates campaign readiness before activation.
- **PermissionEvaluationService**: Evaluates resource-action-scope permissions.
- **RecordingRetentionService**: Applies retention and deletion policies.
- **WebhookDeliveryService**: Signs and retries webhook deliveries.

### 4.5 Domain Events

Domain events represent significant business occurrences.

| Event | Aggregate | Description |
|-------|-----------|-------------|
| UserRegistered | User | New user registered. |
| UserLoggedIn | User | User authenticated. |
| TenantProvisioned | Tenant | New tenant created. |
| CampaignActivated | Campaign | Campaign moved to active. |
| CampaignPaused | Campaign | Campaign paused. |
| LeadImported | LeadList | Leads imported from CSV. |
| LeadStatusChanged | Lead | Lead status transitioned. |
| LeadAssigned | Lead | Lead assigned to agent/team. |
| DncAdded | DncList | New DNC entry added. |
| AgentStatusChanged | DialerSession | Agent state changed. |
| CallInitiated | Call | Call started. |
| CallAnswered | Call | Call answered by human. |
| CallCompleted | Call | Call ended with disposition. |
| RecordingAvailable | Recording | Recording uploaded. |
| DispositionSet | Call | Disposition applied. |
| CallbackScheduled | Call | Callback created. |
| ComplianceViolation | Compliance | Rule violated. |
| WebhookDelivered | WebhookSubscription | Webhook attempt recorded. |
| AuditRecordCreated | AuditRecord | Audit event stored. |

### 4.6 Repositories

Repositories abstract persistence for aggregates.

- `ICampaignRepository`
- `ILeadRepository`
- `ICallRepository`
- `IRecordingRepository`
- `IUserRepository`
- `IRoleRepository`
- `IDncRepository`
- `IWebhookRepository`
- `IAuditRepository`

Repository implementations live in the infrastructure layer and use Prisma.

## 5. Domain Model Diagrams

### 5.1 Campaign Aggregate

```
Campaign (root)
├── CampaignId (value object)
├── Name
├── DialingMode (value object)
├── Status
├── TenantId
├── OrganizationId
├── DepartmentId
├── Schedule (entity)
├── CallerIdPool (value object collection)
├── DispositionSet (value object collection)
└── ComplianceRules (value object)
```

### 5.2 Lead Aggregate

```
Lead (root)
├── LeadId
├── TenantId
├── CampaignId (reference)
├── LeadListId (reference)
├── ExternalId
├── FirstName, LastName
├── PhoneNumbers (value object collection)
├── Address (value object)
├── Timezone (value object)
├── Status
├── AssignedTo (user reference)
├── CustomFields (value object)
└── DncStatus (value object)
```

### 5.3 Call Aggregate

```
Call (root)
├── CallId
├── TenantId
├── CampaignId (reference)
├── LeadId (reference)
├── AgentId (reference)
├── State
├── Direction
├── StartTime, EndTime, Duration
├── Disposition (value object)
├── Notes
├── Callback (entity)
└── RecordingId (reference)
```

## 6. Domain Service Interactions

### 6.1 Lead Callability Check

```
Dialer -> ComplianceService.isCallable(lead, campaign, now)
ComplianceService checks:
  - Lead status == callable
  - DNC list does not contain lead phone
  - Current time within campaign timezone window
  - Campaign is active and not paused
  - Agent scope allows lead
  - No in-progress call for same lead
```

### 6.2 Campaign Activation

```
Admin -> CampaignActivationService.activate(campaignId)
CampaignActivationService validates:
  - Campaign is in draft or paused
  - Campaign has at least one callable lead list (or exception)
  - Caller ID pool has valid entries
  - Schedule and compliance rules are configured
  - Dialer mode is supported
Campaign -> CampaignActivated event
```

### 6.3 Disposition Application

```
Agent -> CallService.setDisposition(callId, disposition)
CallService:
  - Validates disposition belongs to campaign
  - Updates call aggregate
  - Updates lead status (if terminal)
  - Schedules callback if needed
  - Emits CallCompleted / CallbackScheduled event
```

## 7. Implementation Guidance

- Use NestJS modules to represent bounded contexts.
- Place domain logic in domain services and entities, not controllers.
- Use Prisma for persistence but keep domain models separate from database models where beneficial.
- Emit domain events from aggregate roots after persistence.
- Use BullMQ durable queues for event handlers that integrate with external systems.
- Maintain a glossary of ubiquitous language and update as the domain evolves.

## 8. Anti-Corruption Layer

The Telephony Adapter Layer is the primary anti-corruption layer. It translates between the platform's domain concepts (call, agent, recording) and the proprietary APIs of ViciDial, Asterisk, FreeSWITCH, Twilio, etc. No domain code depends on telephony-specific types.

## 9. Future Domain Evolution

- Inbound context will introduce Queue, IVR, ACD aggregates.
- Workforce Management context will introduce Schedule, Adherence, Forecast aggregates.
- Omnichannel context will introduce Interaction, Channel, Thread aggregates.
- AI Agent context will introduce Agent, Conversation, Intent, Action aggregates.
