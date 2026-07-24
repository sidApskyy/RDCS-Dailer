# 33 — Database Tables

**Document Control**

| Property | Value |
|----------|-------|
| Title | Database Tables |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document provides detailed table definitions for the RDCS In-House Dialer Platform. Tables are grouped by domain. Each table includes columns, types, constraints, foreign keys, and indexes.

## 2. Identity & Access Tables

### tenants

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | Tenant identifier |
| name | VARCHAR(255) | NOT NULL | Tenant name |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | Subdomain identifier |
| status | VARCHAR(20) | NOT NULL | active, suspended, trial |
| region | VARCHAR(50) | | Data residency region |
| timezone | VARCHAR(50) | NOT NULL | Default timezone |
| settings | JSONB | | Tenant configuration |
| branding | JSONB | | Logo, colors |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| createdBy | UUID | FK → users | Nullable for bootstrap |
| updatedBy | UUID | FK → users | |
| deletedAt | TIMESTAMPTZ | | Soft delete |
| deletedBy | UUID | FK → users | |
| version | INTEGER | NOT NULL DEFAULT 1 | Optimistic locking |

### users

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| email | VARCHAR(255) | NOT NULL | Unique within tenant |
| passwordHash | VARCHAR(255) | | Nullable for SSO |
| firstName | VARCHAR(100) | NOT NULL | |
| lastName | VARCHAR(100) | NOT NULL | |
| status | VARCHAR(20) | NOT NULL | pending, active, suspended, deactivated |
| mfaEnabled | BOOLEAN | NOT NULL DEFAULT false | |
| mfaSecret | VARCHAR(255) | | Encrypted TOTP secret |
| lastLoginAt | TIMESTAMPTZ | | |
| emailVerifiedAt | TIMESTAMPTZ | | |
| avatarUrl | VARCHAR(500) | | |
| metadata | JSONB | | Custom fields |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| createdBy | UUID | FK → users | |
| updatedBy | UUID | FK → users | |
| deletedAt | TIMESTAMPTZ | | |
| deletedBy | UUID | FK → users | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### roles

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants | NULL for global roles |
| name | VARCHAR(100) | NOT NULL | |
| description | TEXT | | |
| isSystem | BOOLEAN | NOT NULL DEFAULT false | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| deletedAt | TIMESTAMPTZ | | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### permissions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| resource | VARCHAR(50) | NOT NULL | |
| action | VARCHAR(50) | NOT NULL | |
| scope | VARCHAR(20) | NOT NULL | own, team, dept, org, tenant, cross-tenant |
| description | TEXT | | |

### user_roles

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| userId | UUID | FK → users, PK | |
| roleId | UUID | FK → roles, PK | |
| assignedAt | TIMESTAMPTZ | NOT NULL | |
| assignedBy | UUID | FK → users | |

### role_permissions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| roleId | UUID | FK → roles, PK | |
| permissionId | UUID | FK → permissions, PK | |

### sessions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| userId | UUID | FK → users, NOT NULL | |
| refreshTokenHash | VARCHAR(255) | NOT NULL | |
| ipAddress | VARCHAR(45) | | |
| userAgent | TEXT | | |
| expiresAt | TIMESTAMPTZ | NOT NULL | |
| lastActivityAt | TIMESTAMPTZ | NOT NULL | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| revokedAt | TIMESTAMPTZ | | |

## 3. Organization Tables

### organizations

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| code | VARCHAR(50) | NOT NULL | Unique within tenant |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| deletedAt | TIMESTAMPTZ | | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### departments

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| organizationId | UUID | FK → organizations, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| code | VARCHAR(50) | NOT NULL | Unique within org |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| deletedAt | TIMESTAMPTZ | | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### teams

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| departmentId | UUID | FK → departments, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| code | VARCHAR(50) | NOT NULL | Unique within dept |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| deletedAt | TIMESTAMPTZ | | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### team_members

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| teamId | UUID | FK → teams, PK | |
| userId | UUID | FK → users, PK | |
| isSupervisor | BOOLEAN | NOT NULL DEFAULT false | |
| joinedAt | TIMESTAMPTZ | NOT NULL | |

## 4. Campaign Tables

### campaigns

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| organizationId | UUID | FK → organizations | |
| departmentId | UUID | FK → departments | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | | |
| mode | VARCHAR(20) | NOT NULL | manual, preview, progressive, power, predictive |
| status | VARCHAR(20) | NOT NULL | draft, active, paused, completed, archived |
| timezone | VARCHAR(50) | NOT NULL | |
| pacingConfig | JSONB | | Lines per agent, abandon target, etc. |
| complianceConfig | JSONB | | TCPA, DNC, consent settings |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| createdBy | UUID | FK → users | |
| updatedBy | UUID | FK → users | |
| deletedAt | TIMESTAMPTZ | | |
| deletedBy | UUID | FK → users | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### campaign_schedules

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| campaignId | UUID | FK → campaigns, NOT NULL | |
| dayOfWeek | SMALLINT | NOT NULL | 0-6 |
| startTime | TIME | NOT NULL | |
| endTime | TIME | NOT NULL | |
| isActive | BOOLEAN | NOT NULL DEFAULT true | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### campaign_caller_ids

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| campaignId | UUID | FK → campaigns, NOT NULL | |
| phoneNumber | VARCHAR(20) | NOT NULL | E.164 |
| label | VARCHAR(100) | | |
| isActive | BOOLEAN | NOT NULL DEFAULT true | |
| reputationStatus | VARCHAR(20) | NOT NULL DEFAULT good | good, flagged, blocked |
| rotationOrder | INTEGER | NOT NULL DEFAULT 0 | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### campaign_dispositions

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| campaignId | UUID | FK → campaigns, NOT NULL | |
| code | VARCHAR(50) | NOT NULL | |
| label | VARCHAR(100) | NOT NULL | |
| category | VARCHAR(30) | NOT NULL | no-answer, busy, voicemail, converted, etc. |
| isTerminal | BOOLEAN | NOT NULL DEFAULT false | |
| requiresCallback | BOOLEAN | NOT NULL DEFAULT false | |
| requiresNotes | BOOLEAN | NOT NULL DEFAULT false | |
| isRecyclable | BOOLEAN | NOT NULL DEFAULT false | |
| recycleAfterMinutes | INTEGER | | |
| maxRecycleAttempts | INTEGER | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

## 5. Lead Tables

### lead_lists

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| campaignId | UUID | FK → campaigns, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| source | VARCHAR(100) | | |
| importStatus | VARCHAR(20) | NOT NULL | pending, processing, completed, failed |
| totalRows | INTEGER | | |
| validRows | INTEGER | | |
| invalidRows | INTEGER | | |
| dncRows | INTEGER | | |
| duplicateRows | INTEGER | | |
| mapping | JSONB | | CSV mapping |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| createdBy | UUID | FK → users | |
| updatedBy | UUID | FK → users | |
| deletedAt | TIMESTAMPTZ | | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### leads

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| campaignId | UUID | FK → campaigns, NOT NULL | |
| leadListId | UUID | FK → lead_lists | |
| externalId | VARCHAR(100) | | |
| firstName | VARCHAR(100) | | |
| lastName | VARCHAR(100) | | |
| email | VARCHAR(255) | | |
| timezone | VARCHAR(50) | NOT NULL | |
| status | VARCHAR(30) | NOT NULL | pending, callable, in-progress, completed, callback, dnc, invalid, not-interested, recycled |
| assignedToUserId | UUID | FK → users | |
| assignedToTeamId | UUID | FK → teams | |
| priority | SMALLINT | NOT NULL DEFAULT 0 | |
| customFields | JSONB | | |
| dncCheckedAt | TIMESTAMPTZ | | |
| lastDialedAt | TIMESTAMPTZ | | |
| dialAttempts | INTEGER | NOT NULL DEFAULT 0 | |
| recycleAttempts | INTEGER | NOT NULL DEFAULT 0 | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| createdBy | UUID | FK → users | |
| updatedBy | UUID | FK → users | |
| deletedAt | TIMESTAMPTZ | | |
| deletedBy | UUID | FK → users | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### lead_phones

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| leadId | UUID | FK → leads, NOT NULL | |
| phoneNumber | VARCHAR(20) | NOT NULL | E.164 |
| type | VARCHAR(20) | NOT NULL | primary, mobile, home, work |
| isPrimary | BOOLEAN | NOT NULL DEFAULT false | |
| isValid | BOOLEAN | NOT NULL DEFAULT true | |
| validationError | VARCHAR(255) | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### lead_custom_fields

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| leadId | UUID | FK → leads, NOT NULL | |
| key | VARCHAR(100) | NOT NULL | |
| value | TEXT | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

## 6. DNC Tables

### dnc_lists

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| type | VARCHAR(20) | NOT NULL | internal, national, third-party |
| isActive | BOOLEAN | NOT NULL DEFAULT true | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### dnc_entries

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| dncListId | UUID | FK → dnc_lists, NOT NULL | |
| phoneNumber | VARCHAR(20) | NOT NULL | E.164 |
| source | VARCHAR(100) | | |
| effectiveDate | TIMESTAMPTZ | NOT NULL | |
| notes | TEXT | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### dnc_matches

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| leadId | UUID | FK → leads, NOT NULL | |
| dncEntryId | UUID | FK → dnc_entries, NOT NULL | |
| dncListId | UUID | FK → dnc_lists, NOT NULL | |
| matchedAt | TIMESTAMPTZ | NOT NULL | |
| createdAt | TIMESTAMPTZ | NOT NULL | |

## 7. Call Tables

### calls

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| campaignId | UUID | FK → campaigns, NOT NULL | |
| leadId | UUID | FK → leads | |
| agentId | UUID | FK → users | |
| leadPhoneId | UUID | FK → lead_phones | |
| telephonySessionId | VARCHAR(255) | | Engine-specific session ID |
| callerId | VARCHAR(20) | | |
| direction | VARCHAR(10) | NOT NULL | outbound, inbound |
| state | VARCHAR(20) | NOT NULL | initiated, ringing, answered, voicemail, busy, no-answer, failed, completed, transferred |
| dialMode | VARCHAR(20) | | manual, preview, progressive, power, predictive |
| startTime | TIMESTAMPTZ | | |
| answerTime | TIMESTAMPTZ | | |
| endTime | TIMESTAMPTZ | | |
| durationSeconds | INTEGER | | |
| talkTimeSeconds | INTEGER | | |
| holdTimeSeconds | INTEGER | | |
| dispositionId | UUID | FK → campaign_dispositions | |
| dispositionNotes | TEXT | | |
| isAbandoned | BOOLEAN | NOT NULL DEFAULT false | |
| isRecorded | BOOLEAN | NOT NULL DEFAULT false | |
| recordingPaused | BOOLEAN | NOT NULL DEFAULT false | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |
| createdBy | UUID | FK → users | |
| updatedBy | UUID | FK → users | |
| deletedAt | TIMESTAMPTZ | | |
| deletedBy | UUID | FK → users | |
| version | INTEGER | NOT NULL DEFAULT 1 | |

### call_events

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| eventType | VARCHAR(50) | NOT NULL | initiated, ringing, answered, hangup, amd, transfer, hold, resume |
| payload | JSONB | | Event details |
| occurredAt | TIMESTAMPTZ | NOT NULL | |
| createdAt | TIMESTAMPTZ | NOT NULL | |

### callbacks

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| leadId | UUID | FK → leads, NOT NULL | |
| agentId | UUID | FK → users, NOT NULL | |
| scheduledAt | TIMESTAMPTZ | NOT NULL | |
| timezone | VARCHAR(50) | NOT NULL | |
| status | VARCHAR(20) | NOT NULL | pending, completed, missed, cancelled |
| notes | TEXT | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### call_notes

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| note | TEXT | NOT NULL | |
| createdBy | UUID | FK → users | |
| createdAt | TIMESTAMPTZ | NOT NULL | |

### call_tags

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| callId | UUID | FK → calls, PK | |
| tag | VARCHAR(50) | PK | |
| createdAt | TIMESTAMPTZ | NOT NULL | |

## 8. Recording Tables

### recordings

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| storageProvider | VARCHAR(20) | NOT NULL | s3, minio, gcs, azure |
| storageBucket | VARCHAR(100) | NOT NULL | |
| storagePath | VARCHAR(500) | NOT NULL | |
| storageKeyId | VARCHAR(255) | | Encryption key ID |
| format | VARCHAR(10) | NOT NULL | wav, mp3 |
| durationSeconds | INTEGER | NOT NULL | |
| fileSizeBytes | BIGINT | | |
| status | VARCHAR(20) | NOT NULL | pending, uploaded, failed, deleted |
| uploadedAt | TIMESTAMPTZ | | |
| retentionUntil | TIMESTAMPTZ | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### transcripts

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| recordingId | UUID | FK → recordings, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| language | VARCHAR(10) | | |
| status | VARCHAR(20) | NOT NULL | pending, completed, failed |
| fullText | TEXT | | |
| segments | JSONB | | Timestamped segments |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### ai_summaries

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| recordingId | UUID | FK → recordings, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| summary | TEXT | | |
| keyPhrases | JSONB | | |
| status | VARCHAR(20) | NOT NULL | pending, completed, failed |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### sentiments

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| recordingId | UUID | FK → recordings, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| overallSentiment | VARCHAR(20) | NOT NULL | positive, neutral, negative |
| score | DECIMAL(3,2) | | -1.0 to 1.0 |
| segments | JSONB | | Per-segment sentiment |
| status | VARCHAR(20) | NOT NULL | pending, completed, failed |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### qa_scores

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| recordingId | UUID | FK → recordings, NOT NULL | |
| callId | UUID | FK → calls, NOT NULL | |
| rubricId | UUID | FK → qa_rubrics | |
| scoredBy | UUID | FK → users | NULL if auto-QA |
| isAuto | BOOLEAN | NOT NULL DEFAULT false | |
| totalScore | INTEGER | | |
| maxScore | INTEGER | | |
| criteria | JSONB | | Per-criterion scores |
| notes | TEXT | | |
| status | VARCHAR(20) | NOT NULL | pending, completed, disputed |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### qa_rubrics

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| criteria | JSONB | NOT NULL | Scoring criteria |
| isActive | BOOLEAN | NOT NULL DEFAULT true | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

## 9. Integration & Webhook Tables

### integrations

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| type | VARCHAR(50) | NOT NULL | salesforce, hubspot, zoho, custom |
| config | JSONB | | Connection settings |
| credentials | JSONB | | Encrypted credentials |
| isActive | BOOLEAN | NOT NULL DEFAULT true | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### webhooks

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| name | VARCHAR(255) | NOT NULL | |
| url | VARCHAR(500) | NOT NULL | |
| secret | VARCHAR(255) | | HMAC secret |
| eventFilters | JSONB | | List of event types |
| retryPolicy | JSONB | | Max retries, backoff |
| isActive | BOOLEAN | NOT NULL DEFAULT true | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### webhook_deliveries

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| webhookId | UUID | FK → webhooks, NOT NULL | |
| eventId | VARCHAR(255) | NOT NULL | |
| eventType | VARCHAR(50) | NOT NULL | |
| payload | JSONB | | Delivered payload |
| status | VARCHAR(20) | NOT NULL | pending, delivered, failed, retrying |
| httpStatus | INTEGER | | |
| responseBody | TEXT | | |
| attemptCount | INTEGER | NOT NULL DEFAULT 0 | |
| nextAttemptAt | TIMESTAMPTZ | | |
| deliveredAt | TIMESTAMPTZ | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

## 10. Notification & Audit Tables

### notifications

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| userId | UUID | FK → users, NOT NULL | |
| type | VARCHAR(50) | NOT NULL | in-app, email, sms, webhook |
| eventType | VARCHAR(50) | NOT NULL | |
| title | VARCHAR(255) | NOT NULL | |
| body | TEXT | | |
| data | JSONB | | |
| status | VARCHAR(20) | NOT NULL | pending, sent, read, failed |
| readAt | TIMESTAMPTZ | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### audits

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants, NOT NULL | |
| actorId | UUID | FK → users | |
| actorType | VARCHAR(20) | NOT NULL | user, system, api |
| action | VARCHAR(50) | NOT NULL | create, update, delete, login, export, etc. |
| resourceType | VARCHAR(50) | NOT NULL | |
| resourceId | UUID | | |
| beforeSnapshot | JSONB | | |
| afterSnapshot | JSONB | | |
| ipAddress | VARCHAR(45) | | |
| userAgent | TEXT | | |
| metadata | JSONB | | |
| createdAt | TIMESTAMPTZ | NOT NULL | |

## 11. Settings & System Tables

### settings

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| tenantId | UUID | FK → tenants | NULL for system setting |
| key | VARCHAR(100) | NOT NULL | |
| value | JSONB | NOT NULL | |
| isEncrypted | BOOLEAN | NOT NULL DEFAULT false | |
| createdAt | TIMESTAMPTZ | NOT NULL | |
| updatedAt | TIMESTAMPTZ | NOT NULL | |

### system_health_checks

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| service | VARCHAR(50) | NOT NULL | |
| status | VARCHAR(20) | NOT NULL | healthy, degraded, unhealthy |
| message | TEXT | | |
| checkedAt | TIMESTAMPTZ | NOT NULL | |
| createdAt | TIMESTAMPTZ | NOT NULL | |

## 12. Foreign Key & Cascade Rules

- All foreign keys include `ON DELETE RESTRICT` by default to prevent accidental deletion of referenced data.
- Soft-deleted parent tables use application logic to enforce cascade behavior.
- Explicit `ON DELETE CASCADE` is used for child tables that have no independent meaning (e.g., `lead_phones`, `call_events`, `role_permissions`).
- `ON DELETE SET NULL` is used for optional references where appropriate.

## 13. Notes

- Phone numbers stored in E.164 format without formatting characters.
- JSONB columns are used for flexible configuration and metadata but are constrained by validation in application layer.
- All timestamps stored in UTC and converted to local timezone in application layer.
- Bigint used for file sizes and large counters.
