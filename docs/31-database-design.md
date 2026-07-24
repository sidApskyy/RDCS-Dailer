# 31 — Database Design

**Document Control**

| Property | Value |
|----------|-------|
| Title | Database Design |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the database design for the RDCS In-House Dialer Platform. PostgreSQL is the primary transactional database, with Prisma as the ORM.

## 2. Database Goals

- Support multi-tenant data isolation at the row level.
- Maintain ACID compliance for transactional data.
- Provide scalable schema for campaigns, leads, calls, recordings, and users.
- Enable auditability and soft deletes.
- Support read replicas for reporting and analytics.
- Optimize for high-volume lead and call data.

## 3. Database Technology

- **PostgreSQL 15+**: Primary transactional database.
- **Prisma 5+**: ORM, schema definition, migrations.
- **Read Replicas**: For reporting queries and analytics.
- **Partitioning**: Time-based partitioning for large tables (calls, events, recordings).
- **Indexing**: B-tree, GIN, and partial indexes for common queries.

## 4. Schema Design Principles

- Every table has a `tenantId` column for row-level isolation.
- All tables include audit fields: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Soft deletes via `deletedAt` and `deletedBy` where applicable.
- Optimistic locking via `version` integer on critical entities.
- Foreign keys enforce referential integrity; cascade rules defined per relationship.
- Use UUID primary keys for global uniqueness and safe distribution.

## 5. Core Tables Overview

| Table | Description | Approximate Rows (MVP) |
|-------|-------------|------------------------|
| tenants | Tenant organizations | 10–100 |
| organizations | Organizations within tenants | 100–1,000 |
| departments | Departments within organizations | 500–5,000 |
| teams | Teams within departments | 1,000–10,000 |
| users | Platform users | 10,000–100,000 |
| roles | Roles and custom roles | 50–500 |
| permissions | Permission definitions | 200–500 |
| user_roles | Many-to-many user-role mapping | 50,000–500,000 |
| sessions | User sessions | 50,000–500,000 |
| campaigns | Campaigns | 5,000–50,000 |
| lead_lists | Lead list containers | 10,000–100,000 |
| leads | Lead records | 10M–100M |
| lead_phones | Phone numbers for leads | 20M–200M |
| dnc_lists | DNC lists per tenant | 100–1,000 |
| dnc_entries | DNC phone numbers | 1M–10M |
| calls | Call records | 50M–500M |
| call_events | Detailed call events | 200M–2B |
| recordings | Recording metadata | 50M–100M |
| dispositions | Disposition codes | 1,000–10,000 |
| callbacks | Scheduled callbacks | 5M–50M |
| audits | Audit log entries | 500M–2B |
| webhooks | Webhook subscriptions | 1,000–10,000 |
| webhook_deliveries | Webhook delivery attempts | 100M–1B |
| integrations | CRM integrations | 1,000–10,000 |
| notifications | Notification records | 100M–1B |
| ai_jobs | AI processing jobs | 50M–500M |
| transcripts | Call transcripts | 50M–100M |
| qa_scores | QA scoring records | 10M–100M |
| reports | Saved reports | 50,000–500,000 |
| scheduled_reports | Report schedules | 10,000–100,000 |
| settings | Tenant/system settings | 10,000–100,000 |

## 6. Multi-Tenancy Strategy

- **Row-Level Security (RLS)**: Optional PostgreSQL RLS policies enforce tenant isolation at the database level.
- **Application-Level Filtering**: All queries include `tenantId` filter; Prisma middleware enforces this.
- **Schema-per-Tenant**: Not used initially; evaluated for future enterprise isolation needs.
- **Shared Database**: Cost-effective; tenant isolation via application and RLS.

## 7. Partitioning Strategy

| Table | Partition Key | Granularity | Reason |
|-------|---------------|-------------|--------|
| calls | createdAt | Monthly | High volume, time-series queries |
| call_events | createdAt | Daily | Very high volume event log |
| recordings | createdAt | Monthly | Large metadata volume |
| audits | createdAt | Monthly | Very high volume |
| webhook_deliveries | createdAt | Weekly | High volume with TTL |
| ai_jobs | createdAt | Monthly | Background job volume |
| transcripts | createdAt | Monthly | AI output volume |
| notifications | createdAt | Monthly | High volume |

## 8. Indexing Strategy

See `34-index-strategy.md` for detailed indexes. Summary:
- Primary keys: UUID.
- Tenant indexes on every table.
- Foreign key indexes.
- Composite indexes for common query patterns (campaign + status, tenant + date, agent + date).
- GIN indexes for JSONB and full-text search.
- Partial indexes for common filters (e.g., active campaigns, callable leads).
- BRIN indexes for large time-series tables where appropriate.

## 9. Audit & Soft Delete

### Audit Fields
Every table includes:
- `createdAt` (timestamp with time zone)
- `updatedAt` (timestamp with time zone)
- `createdBy` (UUID reference to users, nullable for system)
- `updatedBy` (UUID reference to users, nullable)
- `deletedAt` (timestamp with time zone, nullable)
- `deletedBy` (UUID reference to users, nullable)
- `version` (integer, for optimistic locking)

### Soft Delete
- Rows are marked with `deletedAt` instead of being physically deleted.
- Queries default to excluding `deletedAt IS NOT NULL` unless explicitly requested.
- Prisma middleware or global filters enforce soft delete behavior.
- Hard delete allowed only by Super Admin with audit logging.

## 10. Optimistic Locking

- Critical entities (campaigns, leads, user roles) have a `version` field.
- Update statements include `WHERE version = currentVersion`.
- On conflict, return 409 Conflict with stale data message.
- Frontend can refresh and retry.

## 11. Data Types & Conventions

- Primary keys: `UUID` (default `gen_random_uuid()`).
- Tenant IDs: `UUID`.
- Timestamps: `TIMESTAMPTZ` (ISO 8601 with timezone).
- Status/state fields: `VARCHAR` with check constraints or enums mapped to Prisma enums.
- Phone numbers: `VARCHAR` stored in E.164 format.
- JSONB for flexible metadata and custom fields.
- Decimal for monetary values.
- Integer for durations in seconds.
- Text for large notes and transcripts.

## 12. Read Replicas

- Primary PostgreSQL handles writes and transactional reads.
- Read replica handles reporting, analytics, and dashboard historical queries.
- Prisma supports read replica via connection pooling or separate Prisma clients.
- Replication lag monitored; critical reads go to primary.

## 13. Backup & Recovery

- Continuous WAL archiving to object storage.
- Daily full backups retained for 30 days.
- Weekly backups retained for 12 weeks.
- Monthly backups retained for 1 year.
- Point-in-time recovery capability.

See `59-backup-strategy.md` for full details.

## 14. Database Security

- Database user per service with least privilege.
- TLS encryption for database connections.
- No direct public access to database ports.
- Sensitive columns encrypted at application layer where required.
- Audit logging of DDL changes.

## 15. Prisma Integration

- Prisma schema is the single source of truth for the database model.
- Migrations generated with `prisma migrate dev` and applied with `prisma migrate deploy`.
- Prisma Client extensions enforce tenant filtering and soft deletes.
- Database seed scripts for development and testing.

## 16. Performance Targets

- p95 read query latency < 20ms for indexed lookups.
- p95 write query latency < 50ms for single-row inserts/updates.
- Bulk inserts of 10K leads in < 5 seconds.
- Reporting queries on partitioned tables complete in < 5 seconds with indexes.

## 17. Future Database Evolution

- Evaluate schema-per-tenant for regulatory isolation.
- Add time-series extensions (TimescaleDB) for event data if volume exceeds PostgreSQL native partitioning.
- Consider read-only analytics database (ClickHouse, BigQuery) for complex analytics.
- Sharding by tenant for extreme scale.
