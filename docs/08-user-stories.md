# 08 — User Stories

**Document Control**

| Property | Value |
|----------|-------|
| Title | User Stories |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document captures user stories for the RDCS In-House Dialer Platform. Stories are organized by persona and module, and include acceptance criteria to support implementation and test planning.

## 2. Authentication & Identity

### US-AUTH-001
**As an** unregistered user, **I want** to sign up with my email and organization, **so that** I can create a tenant and begin configuration.
- AC: Account created in pending status.
- AC: Verification email sent within 60 seconds.
- AC: Unverified users cannot access protected pages.

### US-AUTH-002
**As a** user, **I want** to log in with email and password, **so that** I can access my workspace.
- AC: Valid credentials return tokens and redirect to dashboard.
- AC: Invalid credentials return generic error and increment lockout counter.

### US-AUTH-003
**As a** security-conscious user, **I want** to enable MFA with my authenticator app, **so that** my account is protected.
- AC: TOTP setup displays QR code and backup codes.
- AC: MFA challenge presented on login after enrollment.

### US-AUTH-004
**As a** Tenant Admin, **I want** to configure SSO for my organization, **so that** users can authenticate via our identity provider.
- AC: SAML/OIDC configuration saved and validated.
- AC: SSO users are JIT-provisioned with default role.

### US-AUTH-005
**As a** user, **I want** to reset my password via email, **so that** I can regain access if I forget it.
- AC: Reset token sent within 60 seconds.
- AC: Token single-use and expires in 1 hour.

## 3. Authorization & RBAC

### US-RBAC-001
**As a** Super Admin, **I want** to create custom roles with specific permissions, **so that** I can model organizational access policies.
- AC: Role saved with resource-action-scope selections.
- AC: Users assigned to the role inherit permissions immediately.

### US-RBAC-002
**As a** Supervisor, **I want** my team members to see only their assigned leads and calls, **so that** data privacy is maintained.
- AC: Agent views filtered to own/team scope.
- AC: Supervisor views filtered to department scope.

### US-RBAC-003
**As a** user, **I want** the UI to hide features I cannot access, **so that** I have a clean and secure experience.
- AC: Menu items and buttons hidden based on permissions.
- AC: Server rejects unauthorized API attempts.

## 4. Multi-Tenancy & Organization

### US-TEN-001
**As a** Super Admin, **I want** to create a new tenant with an admin user, **so that** a new customer can onboard.
- AC: Tenant created with default organization, department, and admin user.
- AC: Tenant data isolated from others.

### US-TEN-002
**As a** Tenant Admin, **I want** to add departments and teams, **so that** my organization structure is reflected.
- AC: Departments created under organization.
- AC: Teams created under departments.
- AC: Users assigned to teams.

### US-TEN-003
**As a** Supervisor, **I want** to invite agents to my team, **so that** they can log in and start calling.
- AC: Invitation email sent.
- AC: Agent activates account and is assigned to team.

## 5. Campaign Management

### US-CAM-001
**As an** Operations Manager, **I want** to create a campaign with dialing mode, schedule, and caller IDs, **so that** I can start outbound calling.
- AC: Campaign saved in draft status.
- AC: Validation prevents missing required fields.

### US-CAM-002
**As a** Supervisor, **I want** to pause and resume a campaign, **so that** I can react to real-time conditions.
- AC: Pause stops all dialing for the campaign.
- AC: Resume resumes dialing within schedule.
- AC: Reason for pause logged.

### US-CAM-003
**As an** Operations Manager, **I want** to configure predictive dialer pacing, **so that** we maximize agent talk time without exceeding abandon targets.
- AC: Lines per agent, target abandon rate, and max dial rate configurable.
- AC: System throttles when abandon rate exceeds threshold.

### US-CAM-004
**As a** Compliance Officer, **I want** to set timezone calling windows per campaign, **so that** we comply with local regulations.
- AC: Window enforced at dial time based on lead timezone.
- AC: Blocked calls logged with reason.

## 6. Lead Management

### US-LEAD-001
**As an** Operations Manager, **I want** to upload a CSV of leads and map columns, **so that** I can populate a campaign quickly.
- AC: CSV up to 100K rows accepted.
- AC: Mapping UI supports required and custom fields.
- AC: Validation errors surfaced with row numbers.

### US-LEAD-002
**As an** Operations Manager, **I want** invalid phone numbers to be flagged during import, **so that** I can clean my data.
- AC: Invalid phones marked invalid with reason.
- AC: Import summary shows counts of valid/invalid/DNC/duplicate.

### US-LEAD-003
**As a** Supervisor, **I want** to assign leads to specific agents or teams, **so that** calls are distributed fairly.
- AC: Assignment rules: round-robin, manual, skill-based.
- AC: Assigned leads reserved appropriately.

### US-LEAD-004
**As a** Supervisor, **I want** leads that received no-answer to be recycled after a configured interval, **so that** we retry at the right time.
- AC: Recyclable dispositions configurable.
- AC: Recycle interval and max attempts enforced.

### US-LEAD-005
**As a** Compliance Officer, **I want** DNC numbers to be blocked automatically, **so that** we avoid violations.
- AC: DNC scrubbed at import and dial time.
- AC: DNC addition logged and applied immediately.

## 7. Dialer Engine

### US-DIAL-001
**As an** Agent, **I want** the system to present the next lead automatically when I am ready, **so that** I can keep calling without manual searching.
- AC: Progressive dialer selects next callable lead.
- AC: Call initiated when agent accepts or automatically.

### US-DIAL-002
**As an** Agent, **I want** to preview a lead before dialing, **so that** I can prepare for the conversation.
- AC: Preview dialer shows lead details with accept/skip.
- AC: Preview timer enforced.

### US-DIAL-003
**As an** Agent, **I want** to click a button to call a lead manually, **so that** I can reach out to specific leads.
- AC: Click-to-call initiates call via adapter.
- AC: Call state reflected in UI.

### US-DIAL-004
**As an** Agent, **I want** to put a call on hold, mute, or transfer, **so that** I can handle call situations professionally.
- AC: Hold, mute, warm transfer, cold transfer supported.
- AC: Transfer destinations limited by policy.

### US-DIAL-005
**As an** Agent, **I want** a wrap-up timer to remind me to finish notes before the next call, **so that** I can complete after-call work.
- AC: Wrap-up status displayed.
- AC: Next call offered only after wrap-up ends or agent ready.

## 8. Call Handling & Dispositions

### US-CALL-001
**As an** Agent, **I want** to select a disposition quickly after a call, **so that** I can move to the next call.
- AC: Disposition dropdown limited to campaign codes.
- AC: Disposition required before exiting wrap-up.

### US-CALL-002
**As an** Agent, **I want** to schedule a callback with a specific date and time, **so that** I can follow up with the lead.
- AC: Callback datetime in future and timezone-aware.
- AC: Lead requeued at scheduled time.

### US-CALL-003
**As an** Operations Manager, **I want** calls to be recorded when consent is provided, **so that** we can review quality.
- AC: Recording starts after consent verified.
- AC: Recording metadata stored.

### US-CALL-004
**As an** Agent, **I want** to pause recording during a sensitive part of the call, **so that** privacy is protected.
- AC: Pause/resume button available if policy allows.
- AC: Paused segments excluded from playback.

### US-CALL-005
**As a** Supervisor, **I want** to listen to live calls, **so that** I can coach agents.
- AC: Listen/whisper/barge modes available.
- AC: Permission checked and audit logged.

## 9. Compliance

### US-COMP-001
**As a** Compliance Officer, **I want** to upload a DNC list and have it scrub existing leads, **so that** we avoid calling prohibited numbers.
- AC: DNC upload triggers async scrubbing.
- AC: Matching leads updated and blocked.

### US-COMP-002
**As a** Compliance Officer, **I want** to see a report of abandoned calls by campaign, **so that** I can monitor TCPA compliance.
- AC: Abandon rate calculated and displayed.
- AC: Alert when threshold exceeded.

### US-COMP-003
**As a** Compliance Officer, **I want** to verify that all calls were made within allowed time windows, **so that** I can defend against complaints.
- AC: Report shows calls vs. allowed windows.
- AC: Violations highlighted.

## 10. Reporting & Dashboards

### US-DASH-001
**As a** Supervisor, **I want** a live dashboard showing my team’s status and calls, **so that** I can manage the floor.
- AC: Real-time metrics via WebSocket.
- AC: Agent statuses, active calls, KPIs visible.

### US-DASH-002
**As an** Operations Manager, **I want** historical reports by campaign and agent, **so that** I can optimize performance.
- AC: Date range, campaign, agent filters.
- AC: Export to CSV/Excel/PDF.

### US-DASH-003
**As an** Agent, **I want** to see my own performance stats, **so that** I can track my progress.
- AC: Calls made, talk time, conversion rate shown.
- AC: Data limited to own calls.

### US-DASH-004
**As an** Executive, **I want** an executive summary dashboard, **so that** I can review strategic KPIs.
- AC: High-level metrics, trends, compliance summary.
- AC: Cross-department view where authorized.

## 11. CRM Integration & Webhooks

### US-INT-001
**As an** Integrator, **I want** to subscribe to webhook events, **so that** my CRM stays in sync.
- AC: Webhook subscription with URL, event filters, secret.
- AC: HMAC signature and retries configured.

### US-INT-002
**As an** Integrator, **I want** to push leads into the platform via API, **so that** CRM-driven campaigns are automated.
- AC: Bulk lead creation API with validation.
- AC: Webhook confirmation of processing.

### US-INT-003
**As an** Integrator, **I want** comprehensive API documentation with examples, **so that** I can integrate quickly.
- AC: OpenAPI/Swagger docs available.
- AC: Sample requests and responses included.

## 12. AI & Quality

### US-AI-001
**As a** QA Analyst, **I want** recordings automatically transcribed, **so that** I can review conversations faster.
- AC: Transcript available after recording processed.
- AC: Transcript searchable.

### US-AI-002
**As a** QA Analyst, **I want** AI-generated call summaries, **so that** I can triage reviews efficiently.
- AC: Summary generated per call.
- AC: Summary editable/confirmable by QA.

### US-AI-003
**As a** Supervisor, **I want** sentiment analysis on calls, **so that** I can identify coaching opportunities.
- AC: Sentiment displayed per call and aggregated.
- AC: Negative sentiment alerts optionally configured.

### US-AI-004
**As a** QA Analyst, **I want** auto-QA scores based on rubrics, **so that** I can scale quality monitoring.
- AC: Rubric configurable.
- AC: Scores confirmable/overridable by human QA.

## 13. Notifications & Audit

### US-NOT-001
**As a** Supervisor, **I want** to receive an alert when abandon rate exceeds threshold, **so that** I can take action.
- AC: In-app and email notification sent.
- AC: Notification includes campaign and current rate.

### US-AUD-001
**As a** Compliance Officer, **I want** to export audit logs, **so that** I can provide evidence to regulators.
- AC: Export filtered by date, user, action, resource.
- AC: Export immutable and tamper-evident.

## 14. Administration

### US-ADM-001
**As a** System Admin, **I want** to provision a new tenant, **so that** a new customer can start using the platform.
- AC: Tenant created with default settings and admin.
- AC: Tenant isolated and ready for configuration.

### US-ADM-002
**As a** System Admin, **I want** to monitor system health, **so that** I can respond to incidents.
- AC: Dashboards show CPU, memory, DB, Redis, queue health.
- AC: Alerts routed to on-call.
