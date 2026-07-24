# 35 — Partition Strategy

**Document Control**

| Property | Value |
|----------|-------|
| Title | Partition Strategy |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the table partitioning strategy for the RDCS In-House Dialer Platform. Partitioning is used to manage large time-series and high-volume tables, improve query performance, and simplify data retention.

## 2. Partitioning Principles

- Partition tables that are expected to exceed 10M rows per month.
- Use range partitioning on a timestamp column.
- Partition key should align with common query filters (e.g., `createdAt`).
- Include `tenantId` in indexes but not as partition key initially (to avoid too many partitions).
- Automate partition creation and archival.
- Prisma supports partitioning via raw SQL or extension.

## 3. Partitioned Tables

| Table | Partition Key | Granularity | Initial Retention | Archive After |
|-------|---------------|-------------|-------------------|---------------|
| calls | createdAt | Monthly | 24 months | 36 months |
| call_events | createdAt | Weekly | 6 months | 12 months |
| recordings | createdAt | Monthly | 24 months | Per policy |
| audits | createdAt | Monthly | 36 months | 84 months |
| webhook_deliveries | createdAt | Monthly | 3 months | 12 months |
| notifications | createdAt | Monthly | 6 months | 12 months |
| ai_jobs | createdAt | Monthly | 6 months | 12 months |
| transcripts | createdAt | Monthly | 24 months | Per policy |
| exports | createdAt | Monthly | 1 month | 6 months |
| lead_import_logs | createdAt | Monthly | 6 months | 12 months |

## 4. Partitioning Scheme

### 4.1 Monthly Range Partitioning (calls)

```sql
CREATE TABLE calls (
  id UUID NOT NULL,
  tenantId UUID NOT NULL,
  campaignId UUID NOT NULL,
  leadId UUID,
  agentId UUID,
  state VARCHAR(20) NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL,
  -- ... other columns
  PRIMARY KEY (id, createdAt)
) PARTITION BY RANGE (createdAt);

CREATE TABLE calls_y2026m01 PARTITION OF calls
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE calls_y2026m02 PARTITION OF calls
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE INDEX idx_calls_y2026m01_tenant_created
  ON calls_y2026m01 (tenantId, createdAt);
```

### 4.2 Weekly Range Partitioning (call_events)

```sql
CREATE TABLE call_events (
  id UUID NOT NULL,
  tenantId UUID NOT NULL,
  callId UUID NOT NULL,
  eventType VARCHAR(50) NOT NULL,
  occurredAt TIMESTAMPTZ NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id, occurredAt)
) PARTITION BY RANGE (occurredAt);

CREATE TABLE call_events_w202601 PARTITION OF call_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-01-08');
```

## 5. Partition Management Automation

A scheduled job or pg_cron task creates new partitions ahead of time and archives/drops old partitions based on retention policy.

```sql
-- Create future partitions monthly
-- Automated by maintenance job
```

Partition maintenance script (pseudocode):

```python
# maintenance/create_partitions.py
for table in PARTITIONED_TABLES:
    create_next_n_partitions(table, n=3)
    for partition in get_old_partitions(table, retention_months=table.retention):
        archive_partition_to_s3(partition)
        drop_partition(partition)
```

## 6. Prisma and Partitioning

- Prisma does not natively generate partition DDL.
- Partitioning is implemented via raw migration SQL in `prisma/migrations/`.
- Prisma schema defines the base table; migration SQL adds partition definitions and future partition creation.
- Application code queries the base table; PostgreSQL routes to the correct partition automatically.

## 7. Index Strategy on Partitions

- Indexes are created per partition for partitioned tables.
- Global indexes are not supported on native partitions; use per-partition indexes.
- Index names should include partition suffix for clarity.
- Common indexes on each partition: `(tenantId, createdAt)`, `(tenantId, campaignId)`.

## 8. Querying Partitioned Tables

- Queries should include the partition key (`createdAt`) in filters for partition pruning.
- Date-range reports naturally benefit from pruning.
- Avoid full table scans without date filters on large partitioned tables.

## 9. Archival Strategy

- Old partitions are detached and archived to object storage (S3/MinIO) in compressed format.
- Archived data can be reattached for audit or compliance queries if needed.
- Cold storage costs are lower than active database storage.
- Legal/compliance retention periods respected.

## 10. Partitioning Trade-offs

| Benefit | Cost |
|---------|------|
| Faster time-range queries | More complex schema management |
| Easier data retention | Per-partition index maintenance |
| Parallel vacuum and reindex | Partition key must be in query filters |
| Bulk deletion by dropping partitions | Primary key must include partition key |
| Reduced index bloat | Initial setup requires raw SQL |

## 11. Non-Partitioned Tables

Tables expected to remain small (< 1M rows) are not partitioned:
- tenants, users, roles, permissions, organizations, departments, teams, campaigns, webhooks, integrations, qa_rubrics, settings.

These tables use standard B-tree indexes.

## 12. Monitoring

- Partition sizes and row counts monitored.
- Query plans verified for partition pruning.
- Partition creation job monitored for failures.
- Archival job success/failure tracked.

## 13. Future Enhancements

- Evaluate TimescaleDB for time-series tables if native partitioning becomes insufficient.
- Consider sub-partitioning by `tenantId` for very large tenants.
- Implement automated partition pruning for cold data.
