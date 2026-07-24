# Phase 3 Database Schema Documentation

## Overview

Phase 3 extends the database schema with comprehensive models for campaign management, lead lifecycle, compliance tracking, and related functionality. All models maintain strict tenant isolation.

## New Models

### Campaign

**Table**: `campaigns`

**Purpose**: Manages dialing campaigns with lifecycle states and compliance settings.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `organizationId`: Optional organization reference
- `name`: Campaign name
- `description`: Campaign description
- `type`: Campaign type (outbound, inbound, blended)
- `status`: Campaign status (draft, active, paused, completed, archived)
- `startDate`: Campaign start date
- `endDate`: Campaign end date
- `timezone`: Campaign timezone
- `settings`: JSON configuration
- `isActive`: Active flag

**Indexes**:
- `[tenantId, status]`
- `[tenantId, organizationId]`
- `[startDate, endDate]`

**Relations**:
- `tenant`: Tenant (many-to-one)
- `organization`: Organization (many-to-one)
- `leadLists`: CampaignLeadList (one-to-many)
- `dispositions`: CampaignDisposition (one-to-many)
- `leads`: Lead (one-to-many)

### LeadList

**Table**: `lead_lists`

**Purpose**: Manages collections of leads for import into campaigns.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `organizationId`: Optional organization reference
- `name`: List name
- `description`: List description
- `status`: List status (active, archived, deleted)
- `totalRows`: Total row count
- `processedRows`: Processed row count
- `successfulRows`: Successful row count
- `failedRows`: Failed row count
- `duplicateRows`: Duplicate row count
- `suppressedRows`: Suppressed row count

**Indexes**:
- `[tenantId, status]`
- `[tenantId, organizationId]`

**Relations**:
- `tenant`: Tenant (many-to-one)
- `organization`: Organization (many-to-one)
- `campaigns`: CampaignLeadList (one-to-many)
- `imports`: LeadListImport (one-to-many)
- `leads`: Lead (one-to-many)

### CampaignLeadList

**Table**: `campaign_lead_lists`

**Purpose**: Junction table for campaign-lead list relationships.

**Key Fields**:
- `id`: Primary key (CUID)
- `campaignId`: Campaign reference (indexed)
- `leadListId`: Lead list reference (indexed)
- `attachedAt`: Attachment timestamp

**Constraints**:
- Unique: `[campaignId, leadListId]`

**Indexes**:
- `[campaignId]`
- `[leadListId]`

### LeadListImport

**Table**: `lead_list_imports`

**Purpose**: Tracks CSV import jobs for lead lists.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `leadListId`: Lead list reference (indexed)
- `fileName`: Original file name
- `fileSize`: File size in bytes
- `status`: Import status (pending, processing, completed, failed)
- `totalRows`: Total rows to process
- `processedRows`: Rows processed
- `successfulRows`: Successful imports
- `failedRows`: Failed imports
- `duplicateRows`: Duplicate rows
- `suppressedRows`: Suppressed rows
- `invalidRows`: Invalid rows
- `startedAt`: Start timestamp
- `completedAt`: Completion timestamp
- `errorMessage`: Error message if failed

**Indexes**:
- `[tenantId, status]`
- `[leadListId]`
- `[createdAt]`

### LeadImportRow

**Table**: `lead_import_rows`

**Purpose**: Tracks individual rows during CSV import.

**Key Fields**:
- `id`: Primary key (CUID)
- `importId`: Import job reference (indexed)
- `rowNumber`: Row number in file (indexed)
- `status`: Row status (pending, processed, failed, duplicate, suppressed, invalid)
- `rawData`: Raw CSV data (JSON)
- `normalizedData`: Normalized data (JSON)
- `errorCode`: Error code if failed
- `errorMessage`: Error message if failed
- `leadId`: Created lead reference (indexed)

**Indexes**:
- `[importId, status]`
- `[importId, rowNumber]`
- `[leadId]`

### Lead

**Table**: `leads`

**Purpose**: Core lead entity with lifecycle management.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `organizationId`: Optional organization reference
- `leadListId`: Source lead list reference (indexed)
- `campaignId`: Campaign reference (indexed)
- `externalId`: External CRM ID (indexed)
- `firstName`: First name
- `lastName`: Last name
- `email`: Email address (indexed)
- `status`: Lead status (indexed)
- `timezone`: Lead timezone
- `customFields`: Custom field data (JSON)
- `assignedTo`: Assigned user ID (indexed)
- `assignedTeamId`: Assigned team ID (indexed)
- `assignedAt`: Assignment timestamp
- `createdBy`: Creator user ID
- `updatedBy`: Updater user ID
- `deletedAt`: Soft delete timestamp

**Indexes**:
- `[tenantId, status]`
- `[tenantId, campaignId]`
- `[tenantId, leadListId]`
- `[tenantId, assignedTo]`
- `[tenantId, assignedTeamId]`
- `[tenantId, status, assignedTo]`
- `[externalId]`
- `[email]`
- `[createdAt]`

**Relations**:
- `tenant`: Tenant (many-to-one)
- `organization`: Organization (many-to-one)
- `leadList`: LeadList (many-to-one)
- `campaign`: Campaign (many-to-one)
- `assignee`: User (many-to-one)
- `assignedTeam`: Organization (many-to-one)
- `phones`: LeadPhone (one-to-many)
- `consents`: Consent (one-to-many)
- `attempts`: LeadAttempt (one-to-many)
- `callbacks`: Callback (one-to-many)
- `dispositions`: LeadDisposition (one-to-many)

### LeadPhone

**Table**: `lead_phones`

**Purpose**: Phone numbers associated with leads.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `leadId`: Lead reference (indexed)
- `phoneNumber`: Phone number (indexed)
- `type`: Phone type (mobile, home, work, other)
- `isPrimary`: Primary phone flag
- `isValid`: Validation flag
- `normalizedNumber`: E.164 formatted number
- `createdAt`: Creation timestamp (indexed)

**Constraints**:
- Unique: `[leadId, phoneNumber]`

**Indexes**:
- `[tenantId, phoneNumber]`
- `[leadId]`
- `[createdAt]`

### Disposition

**Table**: `dispositions`

**Purpose**: Configurable call outcome dispositions.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `code`: Disposition code (unique, indexed)
- `name`: Disposition name
- `category`: Disposition category (indexed)
- `outcome`: Disposition outcome (terminal, non_terminal)
- `retryBehavior`: Retry behavior (retry_later, retry_immediately, no_retry)
- `callbackEligible`: Callback eligibility flag
- `dncBehavior`: DNC behavior (add_dnc, no_dnc)
- `isActive`: Active flag (indexed)
- `description`: Description
- `createdBy`: Creator user ID

**Indexes**:
- `[tenantId, code]`
- `[tenantId, category]`
- `[tenantId, isActive]`

**Relations**:
- `tenant`: Tenant (many-to-one)
- `campaigns`: CampaignDisposition (one-to-many)
- `leadDispositions`: LeadDisposition (one-to-many)
- `leadAttempts`: LeadAttempt (one-to-many)

### LeadDisposition

**Table**: `lead_dispositions`

**Purpose**: Records disposition applications to leads.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `leadId`: Lead reference (indexed)
- `campaignId`: Campaign reference (indexed)
- `dispositionId`: Disposition reference
- `phoneNumber`: Phone number used
- `notes`: Disposition notes
- `appliedBy`: User who applied (indexed)
- `appliedAt`: Application timestamp (indexed)

**Indexes**:
- `[tenantId, leadId]`
- `[tenantId, campaignId]`
- `[leadId]`

### Callback

**Table**: `callbacks`

**Purpose**: Scheduled callbacks for leads.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `leadId`: Lead reference (indexed)
- `campaignId`: Campaign reference (indexed)
- `phoneNumber`: Phone number to call
- `scheduledFor`: Scheduled timestamp (indexed)
- `scheduledBy`: User who scheduled
- `assignedTo`: Assigned user ID (indexed)
- `assignedTeamId`: Assigned team ID (indexed)
- `notes`: Callback notes
- `status`: Callback status (indexed)
- `priority`: Priority level
- `completedAt`: Completion timestamp
- `createdAt`: Creation timestamp

**Indexes**:
- `[tenantId, status]`
- `[tenantId, scheduledFor]`
- `[leadId]`
- `[campaignId]`
- `[assignedTo]`
- `[assignedTeamId]`
- `[priority, scheduledFor]`

### Consent

**Table**: `consents`

**Purpose**: Consent tracking for compliance.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `leadId`: Lead reference (indexed)
- `phoneNumber`: Phone number (indexed)
- `status`: Consent status (indexed)
- `type`: Consent type
- `source`: Consent source
- `method`: Consent method
- `evidence`: Consent evidence (JSON)
- `jurisdiction`: Compliance jurisdiction
- `scope`: Consent scope
- `expiresAt`: Expiration timestamp
- `createdAt`: Creation timestamp (indexed)

**Indexes**:
- `[tenantId, leadId]`
- `[tenantId, phoneNumber]`
- `[status]`
- `[createdAt]`

### DNCList

**Table**: `dnc_lists`

**Purpose**: Do Not Call lists for compliance.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `name`: List name
- `description`: List description
- `type`: List type (indexed)
- `scope`: List scope
- `isActive`: Active flag (indexed)
- `entryCount`: Entry count
- `createdBy`: Creator user ID

**Indexes**:
- `[tenantId, type]`
- `[tenantId, isActive]`

### DNCEntry

**Table**: `dnc_entries`

**Purpose**: Individual DNC list entries.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `dncListId`: DNC list reference (indexed)
- `phoneNumber`: Phone number (indexed)
- `reason`: DNC reason
- `source`: Entry source
- `addedBy`: User who added
- `expiresAt`: Expiration timestamp (indexed)
- `createdAt`: Creation timestamp

**Constraints**:
- Unique: `[dncListId, phoneNumber]`

**Indexes**:
- `[tenantId, phoneNumber]`
- `[dncListId]`
- `[expiresAt]`

### CallingWindow

**Table**: `calling_windows`

**Purpose**: Configurable calling windows.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `name`: Window name
- `description`: Window description
- `dayOfWeek`: Day of week (-1 for all days)
- `startTime`: Start time (HH:MM)
- `endTime`: End time (HH:MM)
- `timezone`: Window timezone
- `isActive`: Active flag (indexed)
- `createdAt`: Creation timestamp

**Indexes**:
- `[tenantId, isActive]`

### HolidayCalendar

**Table**: `holiday_calendars`

**Purpose**: Holiday calendar for calling windows.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `name`: Holiday name
- `date`: Holiday date (indexed)
- `description`: Holiday description
- `isRecurring`: Recurring flag
- `timezone`: Holiday timezone
- `createdAt`: Creation timestamp

**Indexes**:
- `[tenantId, date]`

### LeadAttempt

**Table**: `lead_attempts`

**Purpose**: Contact attempt tracking.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier (indexed)
- `leadId`: Lead reference (indexed)
- `campaignId`: Campaign reference (indexed)
- `phoneNumber`: Phone number called
- `attemptNumber`: Attempt number (indexed)
- `dispositionId`: Disposition reference
- `agentId`: Agent user ID (indexed)
- `outcome`: Call outcome
- `duration`: Call duration (seconds)
- `recordingUrl`: Recording URL
- `notes`: Attempt notes
- `source`: Attempt source
- `providerRef`: Provider reference
- `startedAt`: Start timestamp (indexed)
- `endedAt`: End timestamp
- `createdAt`: Creation timestamp

**Indexes**:
- `[tenantId, leadId]`
- `[tenantId, campaignId]`
- `[leadId, attemptNumber]`
- `[startedAt]`
- `[agentId]`

### LeadEligibilityDecision

**Table**: `lead_eligibility_decisions`

**Purpose**: Cached eligibility decisions for performance.

**Key Fields**:
- `id`: Primary key (CUID)
- `tenantId`: Tenant identifier
- `leadId`: Lead reference
- `campaignId`: Campaign reference
- `phoneNumber`: Phone number
- `eligible`: Eligibility flag
- `reason`: Decision reason
- `rule`: Applied rule
- `metadata`: Decision metadata (JSON)
- `evaluatedAt`: Evaluation timestamp
- `expiresAt`: Expiration timestamp

**Indexes**:
- `[tenantId, leadId, campaignId]`
- `[expiresAt]`

## Performance Indexes

The following composite indexes have been added for common query patterns:

- `leads`: `[tenantId, status, assignedTo]` for filtering assigned leads by status
- `leads`: `[tenantId, assignedTeamId]` for team-based queries
- `lead_phones`: `[createdAt]` for time-based queries
- `callbacks`: `[assignedTeamId]` for team callback queries
- `callbacks`: `[priority, scheduledFor]` for priority-based callback ordering
- `consents`: `[createdAt]` for time-based consent queries
- `dnc_entries`: `[expiresAt]` for filtering expired entries
- `lead_attempts`: `[agentId]` for agent-based attempt queries

## Cascade Rules

All Phase 3 models follow these cascade rules:
- `onDelete: Cascade` for tenant relations (tenant deletion removes all tenant data)
- `onDelete: SetNull` for optional organization/user relations
- `onDelete: Cascade` for child entities (lead deletion removes phones, attempts, etc.)

## Tenant Isolation

All Phase 3 models include:
- `tenantId` field with index
- All queries filtered by `tenantId`
- Tenant isolation guard enforced at API level
