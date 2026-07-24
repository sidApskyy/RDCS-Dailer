# 06 — Business Rules

**Document Control**

| Property | Value |
|----------|-------|
| Title | Business Rules |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the business rules that govern the behavior of the RDCS In-House Dialer Platform. Rules are organized by domain and are intended to be implemented in domain services, policy engines, and validation layers.

## 2. Authentication & User Rules

### BR-AUTH-001: Unique Email per Tenant
An email address may be associated with only one user account per tenant. A user may belong to multiple tenants with separate accounts or a single federated identity across tenants.

### BR-AUTH-002: Password Complexity
Passwords must be at least 12 characters, contain uppercase, lowercase, digit, and special character, and must not be in a breached-password dictionary.

### BR-AUTH-003: Failed Login Lockout
After 5 consecutive failed login attempts, the account is locked for 30 minutes or until an administrator unlocks it.

### BR-AUTH-004: MFA for Privileged Roles
Super Admin, Tenant Admin, and Compliance Officer roles must have MFA enabled. The system enforces MFA prompt for these roles.

### BR-AUTH-005: Session Inactivity
Sessions expire after 30 minutes of inactivity. Maximum session lifetime is 12 hours.

### BR-AUTH-006: Refresh Token Rotation
Refresh tokens are rotated on each use and limited to a single active family per device. Reuse of a revoked refresh token invalidates the entire family.

## 3. Multi-Tenancy & Organization Rules

### BR-TEN-001: Tenant Isolation
A user can only access data belonging to their current tenant context, unless explicitly granted cross-tenant Super Admin scope.

### BR-TEN-002: Organization Hierarchy
A department belongs to exactly one organization. A team belongs to exactly one department. An agent belongs to one or more teams.

### BR-TEN-003: Department Visibility
Supervisors see users, leads, campaigns, and reports only within their assigned departments unless granted broader scope.

### BR-TEN-004: User Status
User status values: `pending`, `active`, `suspended`, `deactivated`. Only `active` users can log in and make calls.

### BR-TEN-005: Role Mutability
A user must retain at least one role. Super Admin roles cannot be self-assigned or self-revoked by non-Super Admin users.

## 4. Campaign Rules

### BR-CAM-001: Campaign Mode Immutability While Active
A campaign's dialing mode cannot be changed while the campaign is `active`. It must be paused or in `draft` status.

### BR-CAM-002: Active Campaign Requires Leads
A campaign cannot be activated unless it contains at least one lead list with callable leads or has an approved zero-lead exception.

### BR-CAM-003: Caller ID Pool
A campaign must have at least one valid caller ID. If multiple are configured, the system rotates according to the campaign strategy.

### BR-CAM-004: Schedule Enforcement
A campaign can only place calls during its configured time windows and active dates. If no window is active, dialing is paused.

### BR-CAM-005: Abandon Rate Guard
If a campaign's abandon rate exceeds the configured threshold over the trailing 60-minute window, the predictive/power dialer must throttle or pause.

### BR-CAM-006: Holiday Suppression
Campaigns respect the tenant holiday calendar. Calls are not placed on configured holidays unless explicitly allowed.

### BR-CAM-007: Archived Campaigns
Archived campaigns are read-only. Leads, calls, and reports remain accessible but no new dialing occurs.

## 5. Lead Rules

### BR-LEAD-001: Phone Number Uniqueness
Within a campaign, a lead's primary phone number must be unique unless the campaign explicitly allows duplicates.

### BR-LEAD-002: Required Lead Fields
A lead must have at least one callable phone number and a valid timezone.

### BR-LEAD-003: DNC Suppression
A lead that matches a tenant or national DNC list is non-callable and cannot be recycled into a callable state.

### BR-LEAD-004: Timezone Derivation
Timezone is derived from ZIP/postal code, phone area code, or explicit value. If derivation fails, the lead is marked `invalid` until corrected.

### BR-LEAD-005: Lead Assignment
A lead can be assigned to a team, an agent, or a pool. If assigned to an agent, it is reserved for that agent until reassigned or released.

### BR-LEAD-006: Lead Recycling
A lead is recyclable only if its disposition is in the campaign's recycle map, the maximum recycle count has not been exceeded, and the recycle interval has elapsed.

### BR-LEAD-007: Lead Status Flow
Lead status transitions are controlled: `pending → callable → in-progress → [completed | callback | dnc | invalid | not-interested]`. Invalid leads must be corrected to become callable again.

### BR-LEAD-008: Export Scope
Lead export is limited to the user's data scope and logged for audit. Cross-scope export requires elevated permission.

## 6. Dialer Rules

### BR-DIAL-001: Agent Availability
A call can only be offered to an agent whose status is `available`. Agents set status; supervisors may override within policy.

### BR-DIAL-002: Manual Dial Authorization
Agents can only manually dial leads within their assigned scope and within campaign schedules.

### BR-DIAL-003: Preview Timer
Preview dialer enforces a maximum preview time. If the agent does not accept or skip within the limit, the lead is skipped and dispositioned as `no-action`.

### BR-DIAL-004: Wrap-Up Time
Agents must complete a configurable wrap-up period before receiving the next call. Wrap-up can be ended early if permitted by policy.

### BR-DIAL-005: Predictive Pacing
Predictive dialer may place more calls than available agents based on projected answer rate and average handle time, constrained by abandon rate guard.

### BR-DIAL-006: No Abandoned Connects to Live Agents
When a predictive/power call connects to a live person and no agent is available, the system must play a recorded informational message and disconnect, and the event is counted as an abandoned call.

### BR-DIAL-007: Transfer Authorization
Agents can transfer calls only to destinations within their permitted transfer list (internal agents, queues, external numbers approved per campaign).

## 7. Call Handling Rules

### BR-CALL-001: Call State Transitions
Allowed transitions: `initiated → ringing → answered → completed`; `ringing → no-answer | busy | failed | voicemail`; `answered → hold | transfer | conference → completed`.

### BR-CALL-002: Recording Consent
Recording begins only after consent is verified. If consent is revoked or not provided, recording is disabled for that call.

### BR-CALL-003: Recording Pause
Agents may pause/resume recording during a call if policy allows. Paused segments are excluded from playback and retention is still tracked.

### BR-CALL-004: Disposition Required
A call must have a disposition before the agent exits wrap-up. System dispositions satisfy this requirement for unanswered calls.

### BR-CALL-005: Callback Creation
A callback is created only if the disposition is `callback` or the agent explicitly schedules one. The callback datetime must be in the future and within the lead's timezone.

### BR-CALL-006: Call Notes
Call notes are optional unless the campaign requires notes for specific dispositions.

### BR-CALL-007: Duplicate Simultaneous Calls
The same lead cannot be in progress on two calls simultaneously within the same campaign.

## 8. Compliance Rules

### BR-COMP-001: DNC at Import
DNC scrubbing runs at import. Matching leads are marked `dnc` and excluded from callable queues.

### BR-COMP-002: DNC at Dial Time
Before every call, the system re-checks the DNC list. If the lead is newly DNC-listed, the call is blocked.

### BR-COMP-003: Timezone Calling Window
Calls are permitted only within the configured local time window for each lead. Defaults are 8:00 AM to 9:00 PM local time unless jurisdiction restricts further.

### BR-COMP-004: TCPA Abandon Rate Threshold
Campaign abandon rate is calculated over a rolling 60-minute window. If it exceeds the configured threshold (default 3%), dialing is throttled.

### BR-COMP-005: Caller ID Rotation
Caller IDs are rotated to distribute call volume and protect reputation. Reputation-damaged caller IDs are removed from rotation automatically when reputation data is available.

### BR-COMP-006: Recording Jurisdiction
Recording policy is determined by the campaign's jurisdiction. One-party, two-party, or business-notification models are applied and logged.

### BR-COMP-007: Opt-Out During Call
Agents must be able to mark a lead as DNC during a call. The DNC takes effect immediately and the call may be ended gracefully.

## 9. Reporting Rules

### BR-REP-001: Real-Time Metrics
Real-time metrics are computed from event streams, not database polling. Aggregates are refreshed at most every 5 seconds for dashboards.

### BR-REP-002: Historical Report Scope
Historical reports respect the user's data scope. Supervisors see team-level data; admins see tenant-level data.

### BR-REP-003: Metric Definitions
- Connection Rate = Answered Calls / Total Dials
- Abandon Rate = Abandoned Calls / Answered Calls
- Average Handle Time = Total Talk Time / Answered Calls
- Conversion Rate = Converted Dispositions / Answered Calls

### BR-REP-004: Export Limits
Large exports are processed asynchronously and delivered via download link or email. Synchronous export limits are configurable per tenant.

## 10. CRM Integration Rules

### BR-INT-001: Webhook Delivery
Webhook payloads are signed with HMAC-SHA256. Failed deliveries are retried with exponential backoff up to 24 hours.

### BR-INT-002: API Key Scoping
API keys are scoped to a tenant and permission set. Cross-tenant API keys are not allowed except for Super Admin service keys.

### BR-INT-003: Event Ordering
Webhook events are delivered in order per event type and resource for a given subscription, with best-effort global ordering.

### BR-INT-004: Idempotency
Webhook payloads include an event ID. Consumers can use it to deduplicate events.

## 11. AI Rules

### BR-AI-001: STT Consent
Recordings are transcribed only if recording consent is valid. Transcripts are stored with the same retention as recordings.

### BR-AI-002: QA Scoring
Auto-QA scores are suggestions and must be confirmable or overridable by human QA analysts unless tenant policy auto-approves.

### BR-AI-003: Sentiment Boundaries
Sentiment is classified as positive, neutral, or negative per call and segment. Aggregated sentiment is computed per campaign/time range.

### BR-AI-004: PII Handling
AI modules must not retain PII outside the platform; any external STT/AI service must be contractually bound to data handling terms.

## 12. Recording Rules

### BR-REC-001: Recording Retention
Retention policies are defined per tenant and campaign. Expired recordings are automatically deleted or archived based on policy.

### BR-REC-002: Playback Authorization
Recording playback requires the `recording:read` permission within the appropriate scope. Each playback is audit-logged.

### BR-REC-003: Download Watermarking
Downloaded recordings may include metadata watermarking if required by compliance policy.

## 13. Audit Rules

### BR-AUD-001: Immutable Audit Trail
Audit records are append-only. Application users cannot modify or delete audit logs.

### BR-AUD-002: Audit Scope
All create, update, delete, login, logout, permission change, and export events are logged with actor, timestamp, IP, and resource snapshot.

## 14. Notification Rules

### BR-NOT-001: User Preferences
Notifications respect user channel preferences. Critical system notifications may override preferences for security/compliance.

### BR-NOT-002: Template Variables
Notification templates support variable substitution from event payloads. Unescaped variables are prohibited in HTML templates.
