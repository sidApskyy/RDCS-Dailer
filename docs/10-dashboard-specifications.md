# 10 — Dashboard Specifications

**Document Control**

| Property | Value |
|----------|-------|
| Title | Dashboard Specifications |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the dashboards for the RDCS In-House Dialer Platform. Each dashboard is tailored to a persona and includes the data sources, refresh strategy, KPIs, and interaction patterns.

## 2. Dashboard Overview

| Dashboard | Primary User | Data Scope | Refresh Mode | Key KPIs |
|-----------|--------------|------------|--------------|----------|
| Agent Dashboard | Agent | Own | Real-time + manual | Calls, talk time, conversion, next call, callbacks |
| Supervisor Dashboard | Supervisor | Team/Department | Real-time | Team status, active calls, abandon rate, coaching |
| Live Dashboard | Operations / Supervisor | Campaign/Tenant | Real-time | Calls in progress, agents, queue, connection rate |
| Historical Dashboard | Operations / Executive | Tenant/Department | On-demand | Volume, outcomes, trends, funnel |
| Admin Dashboard | System Admin | System/Tenant | Real-time + on-demand | Health, tenants, queues, audit |
| Compliance Dashboard | Compliance Officer | Tenant | On-demand | DNC, abandon, timezone, consent |
| QA Dashboard | QA Analyst | Tenant/Department | On-demand | Scores, recordings, sentiment, auto-QA |
| Executive Dashboard | Executive | Tenant/Cross-tenant | On-demand | Revenue, cost, compliance, trends |

## 3. Agent Dashboard

### 3.1 Purpose
Provide agents with a focused workspace to manage their call state, view performance, and handle callbacks.

### 3.2 Layout
- **Top Bar**: Status selector (Available, Away, Wrap-up), current campaign, agent name.
- **Main Panel**: Lead card (preview/progressive), call controls, disposition panel, notes.
- **Right Sidebar**: Callbacks list, personal metrics, recent calls.

### 3.3 Widgets
- **Status Selector**: Dropdown to change agent state; affects dialer eligibility.
- **Lead Card**: Displays lead details, custom fields, script, previous call history.
- **Call Controls**: Hold, mute, transfer, record pause/resume, end call.
- **Disposition Panel**: Campaign-specific disposition buttons; callback scheduler.
- **Callbacks**: Upcoming callbacks for the agent.
- **My Metrics**: Calls today, talk time, conversion rate, calls per hour.

### 3.4 Data Sources
- Agent state: Redis/Socket.IO real-time channel.
- Lead data: PostgreSQL `/leads` API.
- Call events: WebSocket `call events`.
- Metrics: Reporting API with caching.

### 3.5 Interactions
- Accept/skip next call.
- Set disposition and schedule callback.
- Toggle wrap-up.
- View recording of own calls.

## 4. Supervisor Dashboard

### 4.1 Purpose
Enable supervisors to monitor team performance, coach live, and manage campaigns in real time.

### 4.2 Layout
- **Top Bar**: Team/department selector, time range, campaign filter.
- **Left Panel**: Agent list with status, active call duration, current lead.
- **Center Panel**: Real-time KPIs and charts.
- **Right Panel**: Live call actions (listen/whisper/barge), alerts, team chat.

### 4.3 Widgets
- **Agent Status Grid**: Name, status, login time, calls handled, talk time.
- **Live KPIs**: Active calls, agents available, abandon rate, connection rate, avg handle time.
- **Call Monitoring**: Select an active call to listen, whisper, or barge.
- **Campaign Controls**: Pause/resume campaign, adjust pacing (if authorized).
- **Alerts**: Abandon rate threshold, compliance violations, agent away too long.
- **Team Performance**: Rolling comparison vs. targets.

### 4.4 Data Sources
- Agent states: Redis pub/sub and Socket.IO namespace `supervisor:{deptId}`.
- Call events: `call-events` stream.
- KPIs: Aggregated in Redis and persisted to analytics store.

### 4.5 Interactions
- Click agent to view current call details.
- Listen/whisper/barge requires `realtime:monitor` permission and audit log.
- Pause campaign with reason.
- Send message to agent or team.

## 5. Live Dashboard

### 5.1 Purpose
Provide operations with a tenant-wide view of live dialing activity and system health.

### 5.2 Layout
- Full-screen metrics and charts.
- Campaign cards showing current status.
- Real-time trend lines.

### 5.3 Widgets
- **Calls in Progress**: Total active calls across tenant.
- **Queue Depth**: Leads waiting to be dialed.
- **Dial Rate**: Calls per minute.
- **Connection Rate**: Answered / dialed in current window.
- **Abandon Rate**: Abandoned / answered in current window.
- **Agent Utilization**: % of logged-in agents on calls.
- **Campaign Cards**: Active/paused status, leads remaining, current KPIs.

### 5.4 Data Sources
- Real-time event aggregation from Redis streams and BullMQ metrics.
- Campaign data from PostgreSQL.

### 5.5 Refresh Strategy
- WebSocket updates every 5 seconds for metrics.
- Campaign status updates pushed immediately.

## 6. Historical Dashboard

### 6.1 Purpose
Provide time-range analysis of calls, leads, agents, and campaigns for optimization.

### 6.2 Layout
- Filter bar: date range, campaign, department, team, agent, disposition.
- Summary KPI cards.
- Charts and tables.
- Export controls.

### 6.3 Widgets
- **Summary KPIs**: Total dials, answered, conversion rate, talk time, abandon rate.
- **Trend Chart**: Calls/outcomes over time (line/bar).
- **Outcome Breakdown**: Pie chart of dispositions.
- **Agent Performance Table**: Calls, talk time, conversion, adherence.
- **Campaign Funnel**: Leads → Dialed → Connected → Converted.
- **Heatmap**: Call volume by hour/day.

### 6.4 Data Sources
- Analytics materialized views or OLAP query layer on PostgreSQL.
- Cached aggregates in Redis for common queries.

### 6.5 Interactions
- Apply filters; refresh results.
- Drill down to agent or campaign detail.
- Export to CSV/Excel/PDF.
- Save and share report configurations.

## 7. Admin Dashboard

### 7.1 Purpose
Provide system administrators with tenant health, system metrics, and operational controls.

### 7.2 Layout
- Tenant overview cards.
- System health charts (CPU, memory, DB, Redis, queues).
- Recent audit events.
- Integration and API status.

### 7.3 Widgets
- **Tenant Summary**: Active tenants, users, campaigns, calls today.
- **System Health**: CPU, memory, disk, network, DB connections, Redis memory, queue depth.
- **Queue Worker Status**: Active workers, failed jobs, DLQ size.
- **Recent Audit Events**: Last 50 login/permission/data changes.
- **API Usage**: Requests per tenant, rate limit breaches.
- **Alerts**: Active Prometheus alerts.

### 7.4 Data Sources
- Prometheus metrics.
- Loki logs.
- Application audit tables.
- Redis queue metrics.

## 8. Compliance Dashboard

### 8.1 Purpose
Provide compliance officers with visibility into DNC, abandon rate, timezone, and recording consent adherence.

### 8.2 Layout
- Summary violation cards.
- Campaign compliance scorecards.
- Timezone and DNC reports.
- Audit trail view.

### 8.3 Widgets
- **DNC Status**: DNC entries, recent additions, scrubbing results.
- **Abandon Rate Monitor**: Current and historical abandon rate by campaign.
- **Timezone Compliance**: Calls within/outside allowed windows.
- **Consent Tracking**: Recording consent status by campaign.
- **Violation Log**: Date, campaign, lead, reason, remediation.

### 8.4 Data Sources
- Compliance materialized views.
- Audit logs.
- DNC tables.

## 9. QA Dashboard

### 9.1 Purpose
Help QA analysts triage, score, and review calls efficiently.

### 9.2 Layout
- Filter panel for recordings.
- List of recordings with transcript summary, sentiment, duration.
- Scoring rubric panel.
- Player with transcript overlay.

### 9.3 Widgets
- **Recording Queue**: Recordings requiring review with auto-QA score.
- **Search/Filter**: By date, campaign, agent, disposition, sentiment, duration.
- **Player**: Audio playback with transcript and sentiment markers.
- **Scoring Rubric**: Configurable criteria with scores and comments.
- **Quality Trend**: Team/agent score trends over time.
- **Auto-QA Results**: Summary, sentiment, key phrases, compliance flags.

### 9.4 Data Sources
- Recording metadata.
- Transcript and AI results.
- QA scores.

## 10. Executive Dashboard

### 10.1 Purpose
Provide high-level strategic KPIs for leadership.

### 10.2 Layout
- High-level metric cards.
- Trend charts over weeks/months.
- Cost and compliance summaries.
- Department/campaign comparison.

### 10.3 Widgets
- **Revenue Impact**: Conversion-driven value (if CRM data linked).
- **Cost Metrics**: Cost per call, cost per conversion, telephony spend.
- **Volume Trends**: Calls, leads, agents over time.
- **Compliance Score**: Overall adherence rating.
- **Top/Bottom Campaigns**: Ranked by conversion and cost.
- **Forecasting**: Projected volume and staffing needs (future).

### 10.4 Data Sources
- Aggregated analytics store.
- CRM-integrated revenue data.
- Telephony cost data.

## 11. Common UI Standards

- All dashboards use Shadcn UI card, table, chart, and dialog components.
- Charts use Recharts for consistency and interactivity.
- Real-time indicators use subtle pulse/animation.
- Dashboard filters persist in URL query parameters for shareability.
- Error states show friendly messages with retry actions.
- Skeleton loaders used for all async data fetches.
- Dark mode support is optional but recommended for agent screens.

## 12. Dashboard Permissions

See `09-permission-matrix.md`. Each dashboard checks `dashboard:read` and scope at load and each API call.
