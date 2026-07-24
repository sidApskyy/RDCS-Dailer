# 34 — Index Strategy

**Document Control**

| Property | Value |
|----------|-------|
| Title | Index Strategy |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the indexing strategy for the RDCS In-House Dialer Platform. Proper indexing is essential for query performance, especially at scale with millions of leads and calls.

## 2. Indexing Principles

- Index every foreign key.
- Index all tenant-scoped queries with composite `(tenantId, ...)` indexes.
- Index high-cardinality filter columns.
- Use partial indexes for common boolean/status filters.
- Use GIN indexes for JSONB and full-text search.
- Use BRIN indexes for large time-series tables where data is naturally ordered.
- Avoid over-indexing; write performance degrades with too many indexes.
- Monitor query plans and adjust indexes based on actual workload.

## 3. Index Types Used

| Type | Use Case |
|------|----------|
| B-tree | Equality, range, sorting, foreign keys |
| Partial B-tree | Common filtered queries |
| Composite B-tree | Multi-column filter/sort patterns |
| GIN | JSONB containment, full-text search, arrays |
| BRIN | Large time-series tables with append-only inserts |
| Unique | Unique constraints, natural keys |
| Expression | Lowercased emails, normalized phone numbers |

## 4. Table-Specific Index Strategy

### tenants

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_tenants | id | B-tree | Primary key |
| idx_tenants_slug | slug | Unique B-tree | Subdomain lookup |
| idx_tenants_status | status | B-tree | Status filtering |

### users

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_users | id | B-tree | Primary key |
| idx_users_tenant_email | (tenantId, email) | Unique B-tree | Login lookup |
| idx_users_tenant_status | (tenantId, status) | B-tree | Active user lists |
| idx_users_tenant_org | (tenantId, organizationId) | B-tree | Org-scoped users |
| idx_users_email_lower | lower(email) | Expression | Case-insensitive search |
| idx_users_last_login | (tenantId, lastLoginAt) | B-tree | Inactive user reports |

### campaigns

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_campaigns | id | B-tree | Primary key |
| idx_campaigns_tenant_status | (tenantId, status) | B-tree | Active campaigns |
| idx_campaigns_tenant_dept | (tenantId, departmentId) | B-tree | Department campaigns |
| idx_campaigns_tenant_mode | (tenantId, mode) | B-tree | Campaign filtering |
| idx_campaigns_active | (tenantId, status) WHERE status = 'active' | Partial | Fast active lookups |
| idx_campaigns_created_at | (tenantId, createdAt) | B-tree | List ordering |

### leads

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_leads | id | B-tree | Primary key |
| idx_leads_tenant_campaign | (tenantId, campaignId) | B-tree | Campaign lead lists |
| idx_leads_tenant_status | (tenantId, status) | B-tree | Status filtering |
| idx_leads_tenant_assigned | (tenantId, assignedToUserId) | B-tree | Agent leads |
| idx_leads_tenant_team | (tenantId, assignedToTeamId) | B-tree | Team leads |
| idx_leads_callable | (tenantId, campaignId, status) WHERE status = 'callable' | Partial | Next lead selection |
| idx_leads_last_dialed | (tenantId, lastDialedAt) | B-tree | Recycle queries |
| idx_leads_external_id | (tenantId, campaignId, externalId) | B-tree | External CRM sync |
| idx_leads_custom_fields_gin | customFields | GIN | Custom field search |
| idx_leads_created_at | (tenantId, createdAt) | B-tree | Import ordering |

### lead_phones

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_lead_phones | id | B-tree | Primary key |
| idx_lead_phones_lead | (tenantId, leadId) | B-tree | Lead phone lookup |
| idx_lead_phones_number | (tenantId, phoneNumber) | B-tree | DNC/duplicate checks |
| idx_lead_phones_primary | (tenantId, leadId, isPrimary) | Partial | Primary phone lookup |

### dnc_entries

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_dnc_entries | id | B-tree | Primary key |
| idx_dnc_entries_tenant_list | (tenantId, dncListId) | B-tree | List membership |
| idx_dnc_entries_phone | (tenantId, phoneNumber) | B-tree | DNC lookup |
| idx_dnc_entries_effective | (tenantId, phoneNumber, effectiveDate) | B-tree | Effective date checks |

### calls

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_calls | id | B-tree | Primary key |
| idx_calls_tenant_campaign | (tenantId, campaignId) | B-tree | Campaign calls |
| idx_calls_tenant_agent | (tenantId, agentId) | B-tree | Agent calls |
| idx_calls_tenant_lead | (tenantId, leadId) | B-tree | Lead call history |
| idx_calls_tenant_state | (tenantId, state) | B-tree | State filtering |
| idx_calls_tenant_created | (tenantId, createdAt) | B-tree | Time-range reports |
| idx_calls_tenant_answered | (tenantId, answerTime) | B-tree | Answered call reports |
| idx_calls_tenant_disposition | (tenantId, dispositionId) | B-tree | Disposition reports |
| idx_calls_tenant_abandoned | (tenantId, isAbandoned) WHERE isAbandoned = true | Partial | Abandon reports |
| idx_calls_telephony_session | (telephonySessionId) | B-tree | Adapter reconciliation |
| idx_calls_start_time_brin | startTime | BRIN | Large time-series scans |

### call_events

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_call_events | id | B-tree | Primary key |
| idx_call_events_call | (tenantId, callId) | B-tree | Call timeline |
| idx_call_events_type | (tenantId, eventType) | B-tree | Event type filtering |
| idx_call_events_occurred | (tenantId, occurredAt) | BRIN | Time-series scans |

### recordings

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_recordings | id | B-tree | Primary key |
| idx_recordings_tenant_call | (tenantId, callId) | B-tree | Call recording lookup |
| idx_recordings_tenant_status | (tenantId, status) | B-tree | Pending uploads |
| idx_recordings_tenant_created | (tenantId, createdAt) | B-tree | Library browsing |
| idx_recordings_retention | (tenantId, retentionUntil) | B-tree | Retention cleanup |

### callbacks

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_callbacks | id | B-tree | Primary key |
| idx_callbacks_tenant_agent | (tenantId, agentId, scheduledAt) | B-tree | Agent callback list |
| idx_callbacks_tenant_status | (tenantId, status, scheduledAt) | B-tree | Pending callbacks |
| idx_callbacks_tenant_campaign | (tenantId, campaignId) | B-tree | Campaign callbacks |

### audits

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_audits | id | B-tree | Primary key |
| idx_audits_tenant_actor | (tenantId, actorId) | B-tree | User audit history |
| idx_audits_tenant_resource | (tenantId, resourceType, resourceId) | B-tree | Resource audit |
| idx_audits_tenant_action | (tenantId, action) | B-tree | Action filtering |
| idx_audits_tenant_created | (tenantId, createdAt) | BRIN | Time-range audit export |

### webhook_deliveries

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| pk_webhook_deliveries | id | B-tree | Primary key |
| idx_webhook_deliveries_tenant_webhook | (tenantId, webhookId) | B-tree | Per webhook history |
| idx_webhook_deliveries_status | (tenantId, status, nextAttemptAt) | B-tree | Retry queue |
| idx_webhook_deliveries_created | (tenantId, createdAt) | B-tree | History browsing |

## 5. Partial Index Examples

```sql
CREATE INDEX idx_leads_callable
ON leads (tenantId, campaignId, priority, lastDialedAt)
WHERE status = 'callable' AND deletedAt IS NULL;

CREATE INDEX idx_calls_active
ON calls (tenantId, campaignId, state)
WHERE state IN ('initiated', 'ringing', 'answered') AND deletedAt IS NULL;

CREATE INDEX idx_recordings_pending_upload
ON recordings (tenantId, createdAt)
WHERE status = 'pending';
```

## 6. GIN Index Examples

```sql
CREATE INDEX idx_leads_custom_fields_gin
ON leads USING GIN (customFields);

CREATE INDEX idx_campaigns_compliance_config_gin
ON campaigns USING GIN (complianceConfig);

CREATE INDEX idx_users_metadata_gin
ON users USING GIN (metadata);
```

## 7. Expression Index Examples

```sql
CREATE INDEX idx_users_email_lower
ON users (lower(email));

CREATE INDEX idx_leads_name_lower
ON leads (lower(firstName), lower(lastName));
```

## 8. BRIN Index Examples

```sql
CREATE INDEX idx_calls_created_brin
ON calls USING BRIN (createdAt);

CREATE INDEX idx_call_events_occurred_brin
ON call_events USING BRIN (occurredAt);

CREATE INDEX idx_audits_created_brin
ON audits USING BRIN (createdAt);
```

## 9. Index Maintenance

- Reindex tables periodically during low-traffic windows.
- Monitor index bloat using `pg_stat_user_indexes` and `pgstattuple`.
- Remove unused indexes identified by `pg_stat_user_indexes.idx_scan`.
- Update table statistics with `ANALYZE` after large imports or migrations.

## 10. Prisma Index Definitions

Indexes are defined in `schema.prisma` using `@@index` and `@@unique` attributes. See `36-prisma-schema-design.md` for examples.

## 11. Performance Validation

- All critical queries must use `EXPLAIN ANALYZE` to verify index usage.
- Load tests with production-like data volumes validate index effectiveness.
- Query plan regressions detected in CI using `pg_plan_advsr` or manual review.
