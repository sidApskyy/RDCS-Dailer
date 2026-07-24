# 04 — Functional Requirements

**Document Control**

| Property | Value |
|----------|-------|
| Title | Functional Requirements |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document enumerates the functional requirements for the RDCS In-House Dialer Platform. Each requirement is uniquely identified, assigned a priority, and linked to the relevant module and acceptance criteria.

### Priority Legend

- **P0**: Critical — system cannot function without it; must be in MVP.
- **P1**: High — required for production launch.
- **P2**: Medium — important for competitive parity; can follow shortly after launch.
- **P3**: Low — roadmap/enhancement.

## 2. Authentication Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-AUTH-001 | The system shall allow users to register with email, password, and organization details. | P0 | Auth | User receives verification email; account created in `pending` status. |
| FR-AUTH-002 | The system shall verify email addresses before activation. | P0 | Auth | Unverified users cannot log in; verification token expires after 24h. |
| FR-AUTH-003 | The system shall authenticate users with email and password. | P0 | Auth | Successful login returns access token + refresh token; failed login returns generic error. |
| FR-AUTH-004 | The system shall enforce configurable password complexity. | P0 | Auth | Rejects passwords not meeting policy; policy configurable per tenant. |
| FR-AUTH-005 | The system shall support TOTP-based MFA enrollment and verification. | P1 | Auth | Users can enable/disable MFA; recovery codes generated. |
| FR-AUTH-006 | The system shall support SAML 2.0 and OIDC SSO at tenant level. | P1 | Auth | Tenant admins configure IdP; users authenticate via enterprise portal. |
| FR-AUTH-007 | The system shall manage sessions with TTL, idle timeout, and revocation. | P0 | Auth | Expired sessions rejected; user can revoke all sessions. |
| FR-AUTH-008 | The system shall implement account lockout after repeated failed attempts. | P0 | Auth | Lockout duration and threshold configurable; admin can unlock. |
| FR-AUTH-009 | The system shall provide password reset via secure email token. | P0 | Auth | Token expires in 1 hour; token is single-use. |
| FR-AUTH-010 | The system shall log all authentication events for audit. | P0 | Auth | Login, logout, MFA, password reset, lockout events recorded. |

## 3. Authorization & RBAC Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-RBAC-001 | The system shall define permissions as resource-action-scope tuples. | P0 | RBAC | Permission model supports CRUD and custom actions. |
| FR-RBAC-002 | The system shall provide predefined roles with default permissions. | P0 | RBAC | Roles: Super Admin, Tenant Admin, Supervisor, Agent, QA, Compliance, Read-Only, CRM Integrator. |
| FR-RBAC-003 | The system shall allow custom role creation. | P1 | RBAC | Tenant admins can create roles with selected permissions. |
| FR-RBAC-004 | The system shall evaluate permissions at API gateway and service layers. | P0 | RBAC | Unauthorized requests rejected with 403 and audit event. |
| FR-RBAC-005 | The system shall support data scoping by tenant, organization, department, team, and own. | P0 | RBAC | Users see only data within their scope. |
| FR-RBAC-006 | The system shall allow role assignment to users. | P0 | RBAC | Users can have one or more roles per tenant. |
| FR-RBAC-007 | The system shall support role-based UI feature visibility. | P1 | RBAC | Frontend menu/features hidden based on permissions. |

## 4. Multi-Tenancy & Organization Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-TEN-001 | The system shall support multiple tenants on shared infrastructure. | P0 | Tenancy | Tenant data isolated at row level; no cross-tenant leakage. |
| FR-TEN-002 | The system shall allow tenant-level branding and subdomain configuration. | P2 | Tenancy | Logo, colors, favicon, and subdomain configurable. |
| FR-TEN-003 | The system shall support organization hierarchy: tenant → org → department → team. | P0 | Tenancy | Hierarchical structure enforced in data model. |
| FR-TEN-004 | The system shall allow user invitation and lifecycle management. | P0 | Tenancy | Invite by email, activation, deactivation, soft delete. |
| FR-TEN-005 | The system shall enforce department-level data visibility. | P0 | Tenancy | Supervisor sees only assigned departments unless scoped higher. |
| FR-TEN-006 | The system shall track user activity timeline. | P1 | Tenancy | Viewable history of user actions. |

## 5. Campaign Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-CAM-001 | The system shall allow creation of outbound campaigns. | P0 | Campaign | Campaign has name, mode, schedules, caller IDs, disposition set. |
| FR-CAM-002 | The system shall support manual, preview, progressive, power, and predictive dialing modes. | P0 | Campaign | Mode configurable per campaign; cannot be changed while active. |
| FR-CAM-003 | The system shall manage campaign status lifecycle. | P0 | Campaign | Draft → Active → Paused → Completed → Archived. |
| FR-CAM-004 | The system shall enforce timezone-aware calling schedules. | P0 | Campaign | Calls prevented outside configured local windows. |
| FR-CAM-005 | The system shall configure caller ID pools and rotation. | P1 | Campaign | Caller IDs rotated per call or per agent; reputation hook available. |
| FR-CAM-006 | The system shall allow campaign pause/resume with reason. | P1 | Campaign | Paused campaigns stop dialing; reason logged. |
| FR-CAM-007 | The system shall configure predictive dialer pacing. | P1 | Campaign | Lines per agent, target abandon rate, max dial rate configurable. |
| FR-CAM-008 | The system shall support campaign-level DNC and compliance settings. | P0 | Campaign | DNC scrubbing, consent, recording policy per campaign. |
| FR-CAM-009 | The system shall provide real-time campaign metrics. | P1 | Campaign | Active calls, queue depth, connection rate visible. |
| FR-CAM-010 | The system shall archive completed campaigns. | P2 | Campaign | Archived campaigns read-only; data retained per policy. |

## 6. Lead Management Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-LEAD-001 | The system shall create lead lists within campaigns. | P0 | Lead | Lead list has name, campaign, source, mapping. |
| FR-LEAD-002 | The system shall import leads via CSV upload. | P0 | Lead | Supports up to 100K rows; validates fields; reports errors. |
| FR-LEAD-003 | The system shall map CSV columns to lead schema fields. | P0 | Lead | UI mapping and saved templates. |
| FR-LEAD-004 | The system shall validate phone numbers by country. | P0 | Lead | Invalid phones flagged; country code inferred. |
| FR-LEAD-005 | The system shall derive timezone from address/zip/phone. | P0 | Lead | Timezone stored per lead. |
| FR-LEAD-006 | The system shall scrub leads against DNC lists. | P0 | Lead | DNC matches rejected or flagged. |
| FR-LEAD-007 | The system shall deduplicate leads within a campaign. | P0 | Lead | Duplicate phones/external IDs handled per campaign rule. |
| FR-LEAD-008 | The system shall assign leads to teams, agents, or pools. | P1 | Lead | Round-robin, skill-based, manual assignment. |
| FR-LEAD-009 | The system shall recycle leads based on disposition and time. | P1 | Lead | Recycled leads re-enter callable queue. |
| FR-LEAD-010 | The system shall allow lead status updates manually or by system. | P0 | Lead | Status transitions logged. |
| FR-LEAD-011 | The system shall support lead search and filtering. | P1 | Lead | Search by name, phone, status, campaign, list. |
| FR-LEAD-012 | The system shall export lead data with permission checks. | P2 | Lead | Export limited by scope; audit logged. |

## 7. Dialer Engine Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-DIAL-001 | The system shall track agent status in real time. | P0 | Dialer | Status: available, on-call, wrap-up, away, logged-out. |
| FR-DIAL-002 | The system shall provide manual click-to-call for agents. | P0 | Dialer | Call initiated via adapter; lead locked. |
| FR-DIAL-003 | The system shall implement preview dialer with accept/skip. | P0 | Dialer | Lead presented; agent accepts or skips with reason. |
| FR-DIAL-004 | The system shall implement progressive dialer. | P0 | Dialer | Next lead dialed when agent becomes ready. |
| FR-DIAL-005 | The system shall implement power dialer. | P1 | Dialer | Multiple concurrent dials per agent; answered calls connected. |
| FR-DIAL-006 | The system shall implement predictive dialer. | P1 | Dialer | Pacing algorithm maximizes utilization within abandon guard. |
| FR-DIAL-007 | The system shall handle no-answer, busy, failed, and voicemail outcomes. | P0 | Dialer | System dispositions applied. |
| FR-DIAL-008 | The system shall allow agent hold, mute, transfer, and conference. | P1 | Dialer | Call controls via telephony adapter. |
| FR-DIAL-009 | The system shall enforce wrap-up time before next call. | P1 | Dialer | Configurable wrap-up; agent status auto-managed. |
| FR-DIAL-010 | The system shall provide click-to-call from CRM integrations. | P2 | Dialer | API-triggered call with context. |

## 8. Call Handling & Dispositions Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-CALL-001 | The system shall initiate calls through the telephony adapter. | P0 | Call | Adapter returns callId; state tracked. |
| FR-CALL-002 | The system shall track call lifecycle states. | P0 | Call | States: initiated, ringing, answered, voicemail, busy, no-answer, failed, completed. |
| FR-CALL-003 | The system shall detect answering machines. | P1 | Call | AMD signal used to apply system disposition. |
| FR-CALL-004 | The system shall start/stop call recording. | P0 | Call | Recording controlled by adapter; metadata stored. |
| FR-CALL-005 | The system shall apply agent and system dispositions. | P0 | Call | Dispositions configurable per campaign. |
| FR-CALL-006 | The system shall schedule callbacks. | P1 | Call | Callback date/time/timezone stored; lead requeued. |
| FR-CALL-007 | The system shall support warm and cold transfers. | P1 | Call | Transfer to agent, queue, or external number. |
| FR-CALL-008 | The system shall capture call notes and tags. | P1 | Call | Notes attached to call record. |
| FR-CALL-009 | The system shall display call history per lead. | P1 | Call | Chronological call list with outcomes. |
| FR-CALL-010 | The system shall record call duration and talk time. | P0 | Call | Metrics accurate to the second. |

## 9. Compliance Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-COMP-001 | The system shall maintain tenant DNC lists. | P0 | Compliance | DNC entries by phone; effective date. |
| FR-COMP-002 | The system shall scrub leads against DNC at import and dial. | P0 | Compliance | DNC leads blocked or flagged. |
| FR-COMP-003 | The system shall enforce timezone calling windows. | P0 | Compliance | Calls outside window blocked. |
| FR-COMP-004 | The system shall monitor campaign abandon rate. | P0 | Compliance | Throttling triggered when threshold exceeded. |
| FR-COMP-005 | The system shall capture recording consent. | P0 | Compliance | Consent field per lead/campaign; recording paused if revoked. |
| FR-COMP-006 | The system shall support DNC opt-out during calls. | P1 | Compliance | Agent can mark DNC; event logged. |
| FR-COMP-007 | The system shall provide compliance reports. | P1 | Compliance | DNC, abandon, time-zone, consent reports. |
| FR-COMP-008 | The system shall support TCPA safe harbor rules. | P1 | Compliance | Abandon rate and dropped call handling. |

## 10. Reporting & Dashboards Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-DASH-001 | The system shall provide a live dashboard. | P1 | Reporting | Real-time metrics via WebSocket. |
| FR-DASH-002 | The system shall provide a historical dashboard. | P1 | Reporting | Date-range reports with filters. |
| FR-DASH-003 | The system shall provide a supervisor dashboard. | P1 | Reporting | Team/agent monitoring, listen/barge. |
| FR-DASH-004 | The system shall provide an admin dashboard. | P1 | Reporting | Tenant health, system metrics, audit. |
| FR-DASH-005 | The system shall provide an agent dashboard. | P0 | Reporting | Agent status, next call, callbacks, performance. |
| FR-DASH-006 | The system shall export reports. | P2 | Reporting | CSV, Excel, PDF exports. |
| FR-DASH-007 | The system shall schedule reports. | P2 | Reporting | Recurring email/webhook delivery. |
| FR-DASH-008 | The system shall show campaign performance funnel. | P2 | Reporting | Visualization of lead → dial → connect → disposition. |

## 11. CRM Integration & Webhooks Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-INT-001 | The system shall expose REST APIs for CRM sync. | P0 | Integration | CRUD APIs for leads, calls, dispositions, users. |
| FR-INT-002 | The system shall provide a webhook subscription engine. | P1 | Integration | Users subscribe to events, set filters, retries. |
| FR-INT-003 | The system shall sign webhook payloads with HMAC-SHA256. | P1 | Integration | Signature header included. |
| FR-INT-004 | The system shall retry failed webhooks with exponential backoff. | P1 | Integration | Retry up to configurable limit; dead-letter queue. |
| FR-INT-005 | The system shall provide event types for major lifecycle events. | P1 | Integration | lead.created, call.completed, disposition.set, recording.available. |
| FR-INT-006 | The system shall allow inbound webhooks from CRM. | P2 | Integration | CRM can push leads and call outcomes. |

## 12. Notification Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-NOT-001 | The system shall send in-app notifications. | P1 | Notification | Notification bell, read/unread status. |
| FR-NOT-002 | The system shall send email notifications. | P1 | Notification | SMTP/SES configurable per tenant. |
| FR-NOT-003 | The system shall send SMS notifications. | P2 | Notification | SMS gateway integration. |
| FR-NOT-004 | The system shall support notification templates. | P2 | Notification | Templates by event type and channel. |
| FR-NOT-005 | The system shall allow user notification preferences. | P2 | Notification | Opt-in/out per channel. |

## 13. Audit & Activity Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-AUD-001 | The system shall log all data mutations. | P0 | Audit | Actor, action, timestamp, before/after snapshot. |
| FR-AUD-002 | The system shall provide an activity timeline. | P1 | Audit | Chronological view of lead/campaign/user events. |
| FR-AUD-003 | The system shall provide tamper-evident audit logs. | P1 | Audit | Logs immutable to application users. |
| FR-AUD-004 | The system shall export audit logs. | P2 | Audit | Admin-level export. |

## 14. Recording Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-REC-001 | The system shall store call recordings in object storage. | P0 | Recording | S3/MinIO path and metadata stored. |
| FR-REC-002 | The system shall provide secure playback. | P1 | Recording | Streaming playback with permission check. |
| FR-REC-003 | The system shall allow recording download. | P1 | Recording | Download with audit log. |
| FR-REC-004 | The system shall enforce retention policies. | P1 | Recording | Delete/archive after retention period. |
| FR-REC-005 | The system shall encrypt recordings at rest. | P0 | Recording | SSE-S3 or SSE-KMS/MinIO encryption. |

## 15. AI Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-AI-001 | The system shall transcribe recordings. | P2 | AI | STT job queued and transcript stored. |
| FR-AI-002 | The system shall generate call summaries. | P2 | AI | Summary available after transcription. |
| FR-AI-003 | The system shall classify sentiment. | P2 | AI | Sentiment per call and segment. |
| FR-AI-004 | The system shall score calls for QA. | P2 | AI | Score against rubrics. |
| FR-AI-005 | The system shall suggest auto-dispositions. | P2 | AI | Suggestions based on transcript. |
| FR-AI-006 | The system shall provide real-time transcription. | P2 | AI | Stream to agent/supervisor. |
| FR-AI-007 | The system shall support future AI agent orchestration. | P3 | AI | Pluggable architecture. |

## 16. API Gateway Module

| ID | Requirement | Priority | Module | Acceptance Criteria |
|----|-------------|----------|--------|---------------------|
| FR-API-001 | The system shall expose versioned REST APIs. | P0 | API Gateway | `/api/v1/...` prefix. |
| FR-API-002 | The system shall rate limit by tenant and API key. | P0 | API Gateway | Configurable limits. |
| FR-API-003 | The system shall authenticate and authorize all API requests. | P0 | API Gateway | JWT or API key validation. |
| FR-API-004 | The system shall provide OpenAPI/Swagger documentation. | P1 | API Gateway | Auto-generated docs. |
| FR-API-005 | The system shall expose WebSocket endpoints for real-time events. | P1 | API Gateway | Socket.IO namespaces. |
