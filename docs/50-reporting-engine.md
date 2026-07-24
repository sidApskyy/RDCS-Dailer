# 50 — Reporting Engine

**Document Control**

| Property | Value |
|----------|-------|
| Title | Reporting Engine |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the reporting engine for the RDCS In-House Dialer Platform. The reporting engine provides live and historical reports, dashboards, exports, and scheduled report delivery.

## 2. Reporting Architecture

```
┌─────────────────────────────────────┐
│         Event Sources                │
│  (Call, Dialer, Lead, Recording)    │
└─────────────┬───────────────────────┘
              │ domain events
┌─────────────▼───────────────────────┐
│      Analytics / Aggregation         │
│  (Materialized views, Redis counters)│
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Reporting Database / Views       │
│  (PostgreSQL read replica, indexes)   │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Reporting API / Query Handlers │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Dashboards, Exports, Schedules │
└─────────────────────────────────────┘
```

## 3. Report Types

### 3.1 Live Reports

- Active agents, calls in progress, queue depth.
- Connection rate, abandon rate, average handle time.
- Campaign-level real-time metrics.
- Refresh interval: 5 seconds via WebSocket.

### 3.2 Historical Reports

- Call volume by date, campaign, agent, team, department.
- Disposition breakdown and conversion funnel.
- Agent performance and adherence.
- Campaign ROI and cost metrics.
- Time-range filtering and drill-down.

### 3.3 Compliance Reports

- DNC scrubbing results.
- Abandon rate by campaign.
- Timezone compliance.
- Recording consent status.
- Violations log.

### 3.4 Quality Reports

- QA scores by agent, team, campaign.
- Auto-QA results.
- Sentiment aggregation.
- Recording review completion rates.

## 4. Data Sources

- **PostgreSQL**: Transactional data, CDRs, lead outcomes, audit logs.
- **Redis**: Real-time counters, agent presence, queue depth.
- **Object Storage**: Recording files, exported reports.
- **BullMQ**: Export and scheduled report jobs.

## 5. Aggregation Strategy

- Real-time counters maintained in Redis with periodic flush to PostgreSQL.
- Hourly, daily, and monthly materialized views for fast historical queries.
- Funnel metrics computed on demand or pre-aggregated.
- Agent performance metrics computed daily.

## 6. Materialized Views

| View | Granularity | Refresh |
|------|-------------|---------|
| mv_calls_hourly | Hour, tenant, campaign | Every 15 minutes |
| mv_calls_daily | Day, tenant, campaign | Hourly |
| mv_agent_performance_daily | Day, agent | Hourly |
| mv_campaign_summary_daily | Day, campaign | Hourly |
| mv_disposition_summary | Day, campaign, disposition | Hourly |
| mv_compliance_summary | Day, tenant | Daily |
| mv_qa_summary | Day, agent | Daily |

## 7. Live Metrics Computation

Live metrics are computed from Redis counters and active call state:

```
activeAgents = count of presence keys with status available/on-call
activeCalls = count of calls in state answered
dialsPerMinute = INCR counter over 60s window
connectionRate = answered / dials over 15m window
abandonRate = abandoned / answered over 60m window
avgHandleTime = avg talk time over 60m window
```

## 8. Query Optimization

- Read replicas for historical queries.
- Partitioned tables for large time-series data.
- Indexed columns for common filters.
- Query result caching for 5 minutes for popular dashboards.
- Async queries for large exports.

## 9. Export Engine

- Exports generated asynchronously by BullMQ workers.
- Formats: CSV, Excel, PDF.
- Large exports paginated and streamed to object storage.
- Download links emailed or made available in UI.
- Export access logged for audit.

## 10. Scheduled Reports

- Users can schedule reports to run daily/weekly/monthly.
- Scheduled reports stored in `scheduled_reports` table.
- Cron-like scheduler checks due schedules and queues jobs.
- Results delivered via email, webhook, or in-app notification.

## 11. Report Builder API

Key endpoints from `40-rest-api-documentation.md`:
- `GET /reports` — list saved reports
- `POST /reports` — save report configuration
- `POST /reports/:id/run` — run report
- `GET /reports/:id/results/:runId` — get results
- `GET /reports/:id/export` — export report
- `GET /reports/live` — live metrics
- `GET /reports/historical` — historical metrics
- `GET /reports/agent-performance` — agent performance
- `GET /reports/campaign-performance` — campaign performance

## 12. Report Permissions

Reports respect the user's data scope:
- Agent sees own performance.
- Supervisor sees team/department data.
- Tenant Admin sees tenant data.
- Super Admin sees cross-tenant data (if authorized).

## 13. Dashboard Specifications

See `10-dashboard-specifications.md` for detailed dashboard definitions.

## 14. Caching

- Live dashboard cache: 5 seconds.
- Historical report cache: 5 minutes.
- Materialized views refreshed hourly.
- Export result cache: 24 hours.

## 15. Monitoring

- Report generation time and queue depth.
- Export success/failure rates.
- Materialized view refresh lag.
- Query slow log and plan analysis.
- Dashboard API latency.
