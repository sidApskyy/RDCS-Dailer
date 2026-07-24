# 51 — Analytics Engine

**Document Control**

| Property | Value |
|----------|-------|
| Title | Analytics Engine |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the analytics engine for the RDCS In-House Dialer Platform. The analytics engine processes event data into metrics, trends, funnels, and insights for dashboards, reporting, and AI features.

## 2. Analytics Goals

- Provide real-time and historical KPIs.
- Support trend analysis and cohort analysis.
- Enable conversion funnel analysis.
- Feed data to AI modules for scoring and summaries.
- Power executive and operational dashboards.

## 3. Analytics Architecture

```
Event Sources
  │
  ▼
Event Ingestion (Redis Streams / BullMQ)
  │
  ▼
Stream Processors / Aggregation Workers
  │
  ├─> Real-time counters (Redis)
  ├─> Time-series metrics (PostgreSQL)
  ├─> Funnel aggregates (PostgreSQL)
  ├─> Cohort tables (PostgreSQL)
  └─> AI features (recording, transcript)
```

## 4. Data Model

### 4.1 Metrics

| Metric | Definition | Source |
|--------|------------|--------|
| Total Dials | Count of calls initiated | calls table |
| Answered Calls | Calls with answerTime | calls table |
| Connection Rate | Answered / Total Dials | computed |
| Abandon Rate | Abandoned / Answered | computed |
| Average Handle Time | Total talk time / answered calls | computed |
| Average Wrap-Up Time | Total wrap-up / calls | computed |
| Conversion Rate | Converted dispositions / answered | computed |
| Calls Per Agent | Calls / active agents | computed |
| Agent Utilization | Talk time / logged-in time | computed |
| Cost Per Call | Telephony cost / total dials | computed |
| Cost Per Conversion | Telephony cost / conversions | computed |

### 4.2 Dimensions

- Time (hour, day, week, month).
- Tenant, organization, department, team.
- Campaign, lead list.
- Agent, supervisor.
- Disposition, disposition category.
- Caller ID, trunk, carrier.
- Geography (timezone, area code).

## 5. Aggregation Workers

### 5.1 Real-Time Aggregator

- Subscribes to call events.
- Updates Redis counters immediately.
- Flushes counters to PostgreSQL periodically.
- Powers live dashboards.

### 5.2 Batch Aggregator

- Runs hourly/daily.
- Computes materialized views.
- Refreshes historical dashboards.
- Handles backfills and corrections.

### 5.3 Funnel Aggregator

- Computes lead → dial → answer → disposition → conversion funnel.
- Supports campaign-level and tenant-level funnels.
- Updates funnel visualizations.

## 6. Funnel Analysis

Funnel stages:
1. Leads imported.
2. Leads callable.
3. Leads dialed.
4. Calls answered.
5. Dispositions set.
6. Conversions (or target outcome).

Drop-off rates computed between stages.

## 7. Cohort Analysis

- Cohort by lead import date or agent start date.
- Track conversion and activity over time.
- Identify lead quality and agent ramp-up trends.

## 8. Trend Analysis

- Compare current period vs. previous period.
- Detect anomalies (spikes/drops in calls, abandon rate).
- Seasonal and day-of-week patterns.
- Forecasting (future).

## 9. AI-Ready Data

- Aggregated metrics feed into AI modules for benchmarking.
- Transcripts and QA scores linked to call and campaign metrics.
- Sentiment trends by campaign and agent.
- Auto-QA calibration data.

## 10. Analytics API

Key endpoints from `40-rest-api-documentation.md`:
- `GET /analytics/dashboard` — dashboard analytics
- `GET /analytics/funnel` — conversion funnel
- `GET /analytics/trends` — trend analysis
- `GET /analytics/sentiment` — sentiment aggregation
- `GET /analytics/qa` — QA analytics

## 11. Performance Targets

- Real-time metric latency: < 5 seconds.
- Historical query latency: < 5 seconds for 30-day range.
- Funnel computation: < 10 seconds for large campaigns.
- Batch aggregation: completes within 15 minutes of hour boundary.

## 12. Scalability

- Analytics workers scale independently.
- Read replicas handle heavy queries.
- Aggregation partitioned by time.
- Caching layers for repeated queries.
- Future: dedicated OLAP database (ClickHouse, BigQuery) for very large datasets.

## 13. Data Quality

- Reconciliation between call events and CDRs.
- Duplicate detection and deduplication.
- Missing data handling and imputation rules.
- Audit trail for metric changes.

## 14. Privacy & Compliance

- Aggregated analytics avoid exposing individual PII.
- Access scoped by role and tenant.
- Audit logging for analytics exports and sensitive queries.
