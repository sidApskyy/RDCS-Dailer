# 11 — UX Navigation

**Document Control**

| Property | Value |
|----------|-------|
| Title | UX Navigation |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the navigation structure, information hierarchy, and user flows for the RDCS In-House Dialer Platform web application. Navigation is permission-driven and responsive.

## 2. Navigation Principles

- **Role-Based Navigation**: Menu items are filtered based on the user's permissions and scope.
- **Progressive Disclosure**: Advanced features are nested under parent sections.
- **Contextual Actions**: Page-level actions match the user's current task.
- **Persistent Elements**: Top bar, sidebar, and breadcrumbs are consistent across authenticated pages.
- **Mobile Responsiveness**: Sidebar collapses to a drawer on smaller screens; agent dashboard optimized for desktop.

## 3. Global Navigation Structure

### 3.1 Top Navigation Bar
- **Left**: App logo / tenant branding.
- **Center**: Global search (leads, campaigns, agents, recordings).
- **Right**: Notification bell, help, tenant switcher (if multi-tenant user), user profile menu.

### 3.2 User Profile Menu
- Profile
- Account Settings
- Preferences (notifications, theme, language)
- Sessions
- Logout

### 3.3 Sidebar Navigation

| Section | Items | Primary Roles |
|---------|-------|---------------|
| Dashboard | Agent Dashboard, Supervisor Dashboard, Live Dashboard, Historical Dashboard, Executive Dashboard | All (scope-based) |
| Campaigns | Campaigns, Lead Lists, Import Leads, DNC Lists | Ops, Supervisor, Admin |
| Dialer | My Calls, Callbacks, Dispositions | Agent, Supervisor |
| Team | Agents, Teams, Departments | Supervisor, Admin |
| Quality | Recordings, QA Scoring, Rubrics, Auto-QA | QA, Supervisor |
| Compliance | DNC, Compliance Reports, Consent, Audit Logs | Compliance, Admin |
| Analytics | Reports, Dashboards, Export Center | Ops, Executive, Admin |
| CRM | Integrations, Webhooks, API Keys, Event Logs | Integrator, Admin |
| AI | Transcripts, Sentiment, Call Summaries, Settings | QA, Admin |
| Settings | Tenant Settings, Users, Roles, Security, Notifications | Admin, Tenant Admin |
| System | Tenants, System Health, Monitoring, Audit | Super Admin |

## 4. Role-Based Navigation Maps

### 4.1 Agent Navigation
- Agent Dashboard
- My Calls
- Callbacks
- Recordings (own)
- Reports (own)
- Profile

### 4.2 Supervisor Navigation
- Supervisor Dashboard
- Live Dashboard
- Campaigns (department scope)
- Lead Lists
- Agents / Teams
- Recordings (team)
- QA Scoring
- Reports (department)
- Compliance Reports (department)
- Settings (department scope)

### 4.3 Operations Manager Navigation
- Live Dashboard
- Historical Dashboard
- Campaigns (full tenant)
- Lead Lists / Import Leads
- DNC Lists
- Compliance Reports
- Reports
- Settings (tenant)

### 4.4 QA Analyst Navigation
- QA Dashboard
- Recordings
- QA Scoring
- Rubrics
- Auto-QA Results
- Reports (quality)

### 4.5 Compliance Officer Navigation
- Compliance Dashboard
- DNC Lists
- Compliance Reports
- Audit Logs
- Consent Management
- Settings (compliance)

### 4.6 System Admin Navigation
- Admin Dashboard
- Tenants
- Users
- Roles
- Security Settings
- Integrations
- API Keys
- System Health
- Audit Logs

### 4.7 Integrator Navigation
- CRM
- Webhooks
- API Keys
- Event Logs
- API Documentation

### 4.8 Executive Navigation
- Executive Dashboard
- Historical Dashboard
- Compliance Summary
- Reports
- Settings (view only)

## 5. Key User Flows

### 5.1 First-Time Login
1. User receives invitation email.
2. Clicks link, sets password, optionally enrolls MFA.
3. Sees onboarding screen based on role.
4. Redirected to primary dashboard.

### 5.2 Agent Makes a Call
1. Agent logs in → Agent Dashboard.
2. Sets status to Available.
3. System presents next lead (progressive) or agent clicks dial (manual/preview).
4. Call connects; lead details and script displayed.
5. Agent takes notes, sets disposition, schedules callback if needed.
6. Wrap-up completes; agent becomes available for next call.

### 5.3 Supervisor Monitors a Call
1. Supervisor navigates to Supervisor Dashboard.
2. Selects team/department.
3. Clicks an agent with active call.
4. Chooses listen, whisper, or barge.
5. Action is audit-logged.

### 5.4 Operations Manager Creates a Campaign
1. Navigate to Campaigns → New Campaign.
2. Configure name, mode, schedule, caller IDs, disposition set.
3. Add compliance settings (timezone, DNC, consent).
4. Attach lead list or create new list.
5. Activate campaign.

### 5.5 Compliance Officer Reviews DNC
1. Navigate to Compliance → DNC Lists.
2. Upload or add DNC numbers.
3. Trigger scrub of existing leads.
4. Review scrubbing report and affected leads.

### 5.6 QA Analyst Reviews a Recording
1. Navigate to Quality → Recordings.
2. Filter by agent, campaign, date, sentiment.
3. Select recording; review transcript and auto-QA.
4. Apply rubric score and comments.
5. Save score; generate feedback report.

## 6. Breadcrumbs

Each page includes breadcrumbs reflecting the navigation hierarchy, e.g.:

```
Dashboard / Supervisor / Live Dashboard
Campaigns / Active Campaigns / Summer Sales Campaign
Quality / Recordings / Recording-12345
```

## 7. Page Layout Standards

- **List Pages**: Filter bar, data table, pagination, bulk actions, export.
- **Detail Pages**: Summary card, tabs (overview, activity, related records), actions.
- **Form Pages**: Step indicator for multi-step flows, validation errors inline, save/preview/cancel.
- **Dashboard Pages**: Widget grid, date/filter bar, real-time indicators.

## 8. Error & Empty States

- **404**: Return to dashboard link.
- **403**: Contact administrator message.
- **Network Error**: Retry button and offline indicator.
- **Empty Lists**: Contextual CTA (e.g., "Import your first leads").
- **No Permission**: Feature card disabled with tooltip.

## 9. URL Routing Conventions

| Route | Purpose |
|-------|---------|
| `/dashboard` | Role-based default dashboard redirect |
| `/dashboard/agent` | Agent Dashboard |
| `/dashboard/supervisor` | Supervisor Dashboard |
| `/dashboard/live` | Live Dashboard |
| `/dashboard/historical` | Historical Dashboard |
| `/dashboard/executive` | Executive Dashboard |
| `/campaigns` | Campaign list |
| `/campaigns/:id` | Campaign detail |
| `/campaigns/:id/leads` | Campaign lead list |
| `/leads` | Lead list |
| `/leads/import` | CSV import wizard |
| `/dnc` | DNC management |
| `/calls` | Call history |
| `/recordings` | Recording library |
| `/quality` | QA dashboard |
| `/compliance` | Compliance dashboard |
| `/reports` | Report builder |
| `/crm/integrations` | CRM integrations |
| `/crm/webhooks` | Webhook subscriptions |
| `/settings/users` | User management |
| `/settings/roles` | Role management |
| `/system/tenants` | Tenant management (Super Admin) |
| `/system/health` | System health |

## 10. Permission-Gated Navigation

Navigation items are rendered only if the user has at least one relevant permission. The frontend fetches the user's permission list at login and caches it in Zustand. API calls are independently authorized server-side.
