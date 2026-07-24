# Phase 3 API Endpoints Documentation

## Overview

This document describes all REST API endpoints implemented in Phase 3 for campaign, lead, and compliance management.

## Campaign Endpoints

### Base Path: `/campaigns`

#### Create Campaign
- **Method**: `POST`
- **Path**: `/campaigns`
- **Permission**: `campaigns.create`
- **Body**: `CreateCampaignDto`
  - `name`: string
  - `description?: string`
  - `type?: string`
  - `status?: string`
  - `startDate?: Date`
  - `endDate?: Date`
  - `timezone?: string`
- **Response**: Campaign object

#### Get All Campaigns
- **Method**: `GET`
- **Path**: `/campaigns`
- **Permission**: `campaigns.read`
- **Query**: `status`, `skip`, `take`
- **Response**: Paginated campaign list

#### Get Campaign by ID
- **Method**: `GET`
- **Path**: `/campaigns/:id`
- **Permission**: `campaigns.read`
- **Response**: Campaign object with relations

#### Update Campaign
- **Method**: `PUT`
- **Path**: `/campaigns/:id`
- **Permission**: `campaigns.update`
- **Body**: `UpdateCampaignDto`
- **Response**: Updated campaign object

#### Delete Campaign
- **Method**: `DELETE`
- **Path**: `/campaigns/:id`
- **Permission**: `campaigns.delete`
- **Response**: Success confirmation

#### Update Campaign Status
- **Method**: `POST`
- **Path**: `/campaigns/:id/status`
- **Permission**: `campaigns.update`
- **Body**: `{ status: string }`
- **Response**: Updated campaign object

#### Attach Lead List
- **Method**: `POST`
- **Path**: `/campaigns/:id/lead-lists/:leadListId`
- **Permission**: `campaigns.update`
- **Response**: Attachment object

#### Detach Lead List
- **Method**: `DELETE`
- **Path**: `/campaigns/:id/lead-lists/:leadListId`
- **Permission**: `campaigns.update`
- **Response**: Success confirmation

## Lead List Endpoints

### Base Path: `/lead-lists`

#### Create Lead List
- **Method**: `POST`
- **Path**: `/lead-lists`
- **Permission**: `lead_lists.create`
- **Body**: `CreateLeadListDto`
- **Response**: Lead list object

#### Get All Lead Lists
- **Method**: `GET`
- **Path**: `/lead-lists`
- **Permission**: `lead_lists.read`
- **Query**: `status`, `skip`, `take`
- **Response**: Paginated lead list

#### Get Lead List by ID
- **Method**: `GET`
- **Path**: `/lead-lists/:id`
- **Permission**: `lead_lists.read`
- **Response**: Lead list object with statistics

#### Update Lead List
- **Method**: `PUT`
- **Path**: `/lead-lists/:id`
- **Permission**: `lead_lists.update`
- **Body**: `UpdateLeadListDto`
- **Response**: Updated lead list object

#### Delete Lead List
- **Method**: `DELETE`
- **Path**: `/lead-lists/:id`
- **Permission**: `lead_lists.delete`
- **Response**: Success confirmation

#### Get Lead List Statistics
- **Method**: `GET`
- **Path**: `/lead-lists/:id/statistics`
- **Permission**: `lead_lists.read`
- **Response**: Statistics object

## Lead Import Endpoints

### Base Path: `/lead-imports`

#### Create Import Job
- **Method**: `POST`
- **Path**: `/lead-imports`
- **Permission**: `lead_imports.create`
- **Body**: `CreateImportDto`
  - `leadListId`: string
  - `fileName`: string
  - `fileSize`: number
- **Response**: Import job object

#### Get Import Job by ID
- **Method**: `GET`
- **Path**: `/lead-imports/:id`
- **Permission**: `lead_imports.read`
- **Response**: Import job object with progress

#### Get All Import Jobs
- **Method**: `GET`
- **Path**: `/lead-imports`
- **Permission**: `lead_imports.read`
- **Query**: `status`, `skip`, `take`
- **Response**: Paginated import jobs

#### Cancel Import Job
- **Method**: `POST`
- **Path**: `/lead-imports/:id/cancel`
- **Permission**: `lead_imports.update`
- **Response**: Success confirmation

## Disposition Endpoints

### Base Path: `/dispositions`

#### Create Disposition
- **Method**: `POST`
- **Path**: `/dispositions`
- **Permission**: `dispositions.create`
- **Body**: `CreateDispositionDto`
  - `code`: string
  - `name`: string
  - `category`: string
  - `outcome`: string
  - `retryBehavior?: string`
  - `callbackEligible?: boolean`
  - `dncBehavior?: string`
- **Response**: Disposition object

#### Get All Dispositions
- **Method**: `GET`
- **Path**: `/dispositions`
- **Permission**: `dispositions.read`
- **Query**: `category`, `isActive`, `skip`, `take`
- **Response**: Paginated dispositions

#### Get Disposition by ID
- **Method**: `GET`
- **Path**: `/dispositions/:id`
- **Permission**: `dispositions.read`
- **Response**: Disposition object

#### Get Disposition by Code
- **Method**: `GET`
- **Path**: `/dispositions/code/:code`
- **Permission**: `dispositions.read`
- **Response**: Disposition object

#### Update Disposition
- **Method**: `PUT`
- **Path**: `/dispositions/:id`
- **Permission**: `dispositions.update`
- **Body**: `UpdateDispositionDto`
- **Response**: Updated disposition object

#### Delete Disposition
- **Method**: `DELETE`
- **Path**: `/dispositions/:id`
- **Permission**: `dispositions.delete`
- **Response**: Success confirmation

#### Attach to Campaign
- **Method**: `POST`
- **Path**: `/dispositions/:id/attach/:campaignId`
- **Permission**: `dispositions.update`
- **Response**: Attachment object

#### Detach from Campaign
- **Method**: `DELETE`
- **Path**: `/dispositions/:id/detach/:campaignId`
- **Permission**: `dispositions.update`
- **Response**: Success confirmation

#### Apply to Lead
- **Method**: `POST`
- **Path**: `/dispositions/apply/:leadId`
- **Permission**: `dispositions.update`
- **Body**: `{ dispositionId, phoneNumber, notes? }`
- **Response**: Lead disposition object

## Callback Endpoints

### Base Path: `/callbacks`

#### Create Callback
- **Method**: `POST`
- **Path**: `/callbacks`
- **Permission**: `callbacks.create`
- **Body**: `CreateCallbackDto`
  - `leadId`: string
  - `campaignId?: string`
  - `phoneNumber?: string`
  - `scheduledFor`: Date
  - `assignedTo?: string`
  - `assignedTeamId?: string`
  - `notes?: string`
  - `priority?: number`
- **Response**: Callback object

#### Get All Callbacks
- **Method**: `GET`
- **Path**: `/callbacks`
- **Permission**: `callbacks.read`
- **Query**: `status`, `assignedTo`, `skip`, `take`
- **Response**: Paginated callbacks

#### Get Due Callbacks
- **Method**: `GET`
- **Path**: `/callbacks/due`
- **Permission**: `callbacks.read`
- **Query**: `assignedTo`, `skip`, `take`
- **Response**: Paginated due callbacks

#### Get Callback by ID
- **Method**: `GET`
- **Path**: `/callbacks/:id`
- **Permission**: `callbacks.read`
- **Response**: Callback object

#### Update Callback
- **Method**: `PUT`
- **Path**: `/callbacks/:id`
- **Permission**: `callbacks.update`
- **Body**: `UpdateCallbackDto`
- **Response**: Updated callback object

#### Complete Callback
- **Method**: `POST`
- **Path**: `/callbacks/:id/complete`
- **Permission**: `callbacks.update`
- **Response**: Updated callback object

#### Cancel Callback
- **Method**: `POST`
- **Path**: `/callbacks/:id/cancel`
- **Permission**: `callbacks.update`
- **Response**: Updated callback object

#### Delete Callback
- **Method**: `DELETE`
- **Path**: `/callbacks/:id`
- **Permission**: `callbacks.delete`
- **Response**: Success confirmation

## Consent Endpoints

### Base Path: `/consents`

#### Create Consent
- **Method**: `POST`
- **Path**: `/consents`
- **Permission**: `consents.create`
- **Body**: `CreateConsentDto`
  - `leadId`: string
  - `phoneNumber?: string`
  - `status`: string
  - `type`: string
  - `source?: string`
  - `method?: string`
  - `evidence?: any`
  - `jurisdiction?: string`
  - `scope?: string`
  - `expiresAt?: Date`
- **Response**: Consent object

#### Get All Consents
- **Method**: `GET`
- **Path**: `/consents`
- **Permission**: `consents.read`
- **Query**: `status`, `type`, `skip`, `take`
- **Response**: Paginated consents

#### Get Consent by ID
- **Method**: `GET`
- **Path**: `/consents/:id`
- **Permission**: `consents.read`
- **Response**: Consent object

#### Get Consents by Lead
- **Method**: `GET`
- **Path**: `/consents/lead/:leadId`
- **Permission**: `consents.read`
- **Response**: Array of consent objects

#### Get Latest Consent
- **Method**: `GET`
- **Path**: `/consents/lead/:leadId/latest`
- **Permission**: `consents.read`
- **Response**: Latest consent object

#### Check Consent
- **Method**: `GET`
- **Path**: `/consents/lead/:leadId/check`
- **Permission**: `consents.read`
- **Query**: `phoneNumber`
- **Response**: Consent check result

#### Revoke Consent
- **Method**: `POST`
- **Path**: `/consents/lead/:leadId/revoke`
- **Permission**: `consents.update`
- **Body**: `{ reason?: string }`
- **Response**: New consent object

#### Get Consents by Phone
- **Method**: `GET`
- **Path**: `/consents/phone/:phoneNumber`
- **Permission**: `consents.read`
- **Response**: Array of consent objects

## DNC Endpoints

### Base Path: `/dnc`

#### Create DNC List
- **Method**: `POST`
- **Path**: `/dnc/lists`
- **Permission**: `dnc.create`
- **Body**: `CreateDNCListDto`
  - `name`: string
  - `description?: string`
  - `type?: string`
  - `scope?: string`
- **Response**: DNC list object

#### Get All DNC Lists
- **Method**: `GET`
- **Path**: `/dnc/lists`
- **Permission**: `dnc.read`
- **Query**: `type`, `isActive`, `skip`, `take`
- **Response**: Paginated DNC lists

#### Get DNC List by ID
- **Method**: `GET`
- **Path**: `/dnc/lists/:id`
- **Permission**: `dnc.read`
- **Response**: DNC list object with entries

#### Update DNC List
- **Method**: `PUT`
- **Path**: `/dnc/lists/:id`
- **Permission**: `dnc.update`
- **Body**: `{ name?, description?, isActive? }`
- **Response**: Updated DNC list object

#### Delete DNC List
- **Method**: `DELETE`
- **Path**: `/dnc/lists/:id`
- **Permission**: `dnc.delete`
- **Response**: Success confirmation

#### Add DNC Entry
- **Method**: `POST`
- **Path**: `/dnc/lists/:id/entries`
- **Permission**: `dnc.update`
- **Body**: `AddDNCEntryDto`
  - `phoneNumber`: string
  - `reason?: string`
  - `source?: string`
  - `expiresAt?: Date`
- **Response**: DNC entry object

#### Bulk Add DNC Entries
- **Method**: `POST`
- **Path**: `/dnc/lists/:id/entries/bulk`
- **Permission**: `dnc.update`
- **Body**: `{ phoneNumbers: string[] }`
- **Response**: Count and entries

#### Get DNC Entries
- **Method**: `GET`
- **Path**: `/dnc/lists/:id/entries`
- **Permission**: `dnc.read`
- **Query**: `skip`, `take`
- **Response**: Paginated DNC entries

#### Remove DNC Entry
- **Method**: `DELETE`
- **Path**: `/dnc/lists/:id/entries/:entryId`
- **Permission**: `dnc.update`
- **Response**: Success confirmation

#### Check DNC
- **Method**: `GET`
- **Path**: `/dnc/check/:phoneNumber`
- **Permission**: `dnc.read`
- **Response**: DNC check result

## Calling Window Endpoints

### Base Path: `/calling-windows`

#### Create Calling Window
- **Method**: `POST`
- **Path**: `/calling-windows`
- **Permission**: `calling_windows.create`
- **Body**: `CreateCallingWindowDto`
  - `name`: string
  - `description?: string`
  - `dayOfWeek`: number
  - `startTime`: string
  - `endTime`: string
  - `timezone`: string
- **Response**: Calling window object

#### Get All Calling Windows
- **Method**: `GET`
- **Path**: `/calling-windows`
- **Permission**: `calling_windows.read`
- **Query**: `isActive`, `skip`, `take`
- **Response**: Paginated calling windows

#### Get Calling Window by ID
- **Method**: `GET`
- **Path**: `/calling-windows/:id`
- **Permission**: `calling_windows.read`
- **Response**: Calling window object

#### Update Calling Window
- **Method**: `PUT`
- **Path**: `/calling-windows/:id`
- **Permission**: `calling_windows.update`
- **Body**: `UpdateCallingWindowDto`
- **Response**: Updated calling window object

#### Delete Calling Window
- **Method**: `DELETE`
- **Path**: `/calling-windows/:id`
- **Permission**: `calling_windows.delete`
- **Response**: Success confirmation

#### Check Current Window
- **Method**: `GET`
- **Path**: `/calling-windows/check/current`
- **Permission**: `calling_windows.read`
- **Response**: Window check result

#### Get Next Available Window
- **Method**: `GET`
- **Path**: `/calling-windows/check/next`
- **Permission**: `calling_windows.read`
- **Response**: Next available window time

## Attempt Endpoints

### Base Path: `/attempts`

#### Create Attempt
- **Method**: `POST`
- **Path**: `/attempts`
- **Permission**: `attempts.create`
- **Body**: `CreateAttemptDto`
  - `leadId`: string
  - `campaignId?: string`
  - `phoneNumber`: string
  - `dispositionId?: string`
  - `agentId?: string`
  - `outcome?: string`
  - `duration?: number`
  - `recordingUrl?: string`
  - `notes?: string`
  - `source?: string`
  - `providerRef?: string`
- **Response**: Attempt object

#### Get Attempts
- **Method**: `GET`
- **Path**: `/attempts`
- **Permission**: `attempts.read`
- **Query**: `leadId`, `campaignId`, `skip`, `take`
- **Response**: Paginated attempts

#### Get Attempt by ID
- **Method**: `GET`
- **Path**: `/attempts/:id`
- **Permission**: `attempts.read`
- **Response**: Attempt object

#### Update Attempt
- **Method**: `PUT`
- **Path**: `/attempts/:id`
- **Permission**: `attempts.update`
- **Body**: `UpdateAttemptDto`
- **Response**: Updated attempt object

#### Complete Attempt
- **Method**: `POST`
- **Path**: `/attempts/:id/complete`
- **Permission**: `attempts.update`
- **Body**: `UpdateAttemptDto`
- **Response**: Updated attempt object

#### Get Lead Statistics
- **Method**: `GET`
- **Path**: `/attempts/lead/:leadId/statistics`
- **Permission**: `attempts.read`
- **Response**: Attempt statistics

#### Get Campaign Statistics
- **Method**: `GET`
- **Path**: `/attempts/campaign/:campaignId/statistics`
- **Permission**: `attempts.read`
- **Response**: Attempt statistics

## Authentication & Authorization

All endpoints require:
- JWT authentication via `JwtAuthGuard`
- Tenant isolation via `TenantIsolationGuard`
- RBAC permission check via `@RequirePermission` decorator

## Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 50
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

## Pagination

All list endpoints support:
- `skip`: Number of records to skip (default: 0)
- `take`: Number of records to return (default: 50, max: 100)

## Filtering

Most list endpoints support filtering by:
- Status fields
- Date ranges
- Foreign key relationships
