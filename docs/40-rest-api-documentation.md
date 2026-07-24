# 40 — REST API Documentation

**Document Control**

| Property | Value |
|----------|-------|
| Title | REST API Documentation |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document provides comprehensive REST API documentation for the RDCS In-House Dialer Platform. All endpoints are versioned under `/api/v1` and follow the standard response envelope defined in `37-api-gateway.md`.

## 2. API Conventions

- Base URL: `https://api.rdcs.example.com/api/v1`
- Authentication: `Authorization: Bearer <access_token>` or `X-API-Key: <api_key>`
- Tenant context: extracted from JWT or `X-Tenant-Id` header for API keys.
- Content-Type: `application/json`
- Standard HTTP methods: GET, POST, PATCH, PUT, DELETE.
- Pagination: `page`, `pageSize`, `sort`, `order` query params.
- Filtering: resource-specific query params.
- Rate limits: see `37-api-gateway.md`.

## 3. Common Response Patterns

### Success (200/201)

```json
{
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 100 },
  "error": null
}
```

### Error (400)

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": { "email": "Email is required" },
    "timestamp": "2026-07-21T10:00:00Z",
    "requestId": "req_123"
  }
}
```

## 4. Endpoint Inventory

### 4.1 Authentication

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| POST | `/auth/register` | Register a new tenant/user | None | None |
| POST | `/auth/login` | Login with email/password | None | None |
| POST | `/auth/mfa/verify` | Verify TOTP code | MFA temp token | None |
| POST | `/auth/refresh` | Refresh access token | Refresh token | None |
| POST | `/auth/logout` | Logout user | Access token | None |
| POST | `/auth/password-reset` | Request password reset | None | None |
| POST | `/auth/password-reset/confirm` | Confirm password reset | Reset token | None |
| POST | `/auth/change-password` | Change password | Access token | None |
| GET | `/auth/sso/:provider` | Initiate SSO login | None | None |
| POST | `/auth/sso/:provider/callback` | SSO callback | None | None |
| POST | `/auth/api-keys` | Create API key | Access token | api:manage |
| GET | `/auth/api-keys` | List API keys | Access token | api:manage |
| DELETE | `/auth/api-keys/:id` | Revoke API key | Access token | api:manage |

### 4.2 Users

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/users` | List users | Access token | user:read |
| POST | `/users` | Create user | Access token | user:create |
| GET | `/users/:id` | Get user | Access token | user:read |
| PATCH | `/users/:id` | Update user | Access token | user:update |
| DELETE | `/users/:id` | Deactivate user | Access token | user:delete |
| POST | `/users/:id/invite` | Send invitation | Access token | user:create |
| PATCH | `/users/:id/roles` | Update user roles | Access token | role:manage |
| GET | `/users/me` | Current user profile | Access token | None |
| PATCH | `/users/me` | Update own profile | Access token | own |
| GET | `/users/me/sessions` | List own sessions | Access token | own |
| DELETE | `/users/me/sessions/:id` | Revoke session | Access token | own |

### 4.3 Organizations

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/organizations` | List organizations | Access token | organization:read |
| POST | `/organizations` | Create organization | Access token | organization:manage |
| GET | `/organizations/:id` | Get organization | Access token | organization:read |
| PATCH | `/organizations/:id` | Update organization | Access token | organization:manage |
| DELETE | `/organizations/:id` | Delete organization | Access token | organization:manage |

### 4.4 Departments

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/departments` | List departments | Access token | department:read |
| POST | `/departments` | Create department | Access token | department:manage |
| GET | `/departments/:id` | Get department | Access token | department:read |
| PATCH | `/departments/:id` | Update department | Access token | department:manage |
| DELETE | `/departments/:id` | Delete department | Access token | department:manage |

### 4.5 Teams

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/teams` | List teams | Access token | team:read |
| POST | `/teams` | Create team | Access token | team:manage |
| GET | `/teams/:id` | Get team | Access token | team:read |
| PATCH | `/teams/:id` | Update team | Access token | team:manage |
| DELETE | `/teams/:id` | Delete team | Access token | team:manage |
| POST | `/teams/:id/members` | Add member | Access token | team:manage |
| DELETE | `/teams/:id/members/:userId` | Remove member | Access token | team:manage |

### 4.6 Roles & Permissions

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/roles` | List roles | Access token | role:read |
| POST | `/roles` | Create role | Access token | role:manage |
| GET | `/roles/:id` | Get role | Access token | role:read |
| PATCH | `/roles/:id` | Update role | Access token | role:manage |
| DELETE | `/roles/:id` | Delete role | Access token | role:manage |
| GET | `/permissions` | List permissions | Access token | role:read |

### 4.7 Campaigns

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/campaigns` | List campaigns | Access token | campaign:read |
| POST | `/campaigns` | Create campaign | Access token | campaign:create |
| GET | `/campaigns/:id` | Get campaign | Access token | campaign:read |
| PATCH | `/campaigns/:id` | Update campaign | Access token | campaign:update |
| DELETE | `/campaigns/:id` | Delete campaign | Access token | campaign:delete |
| POST | `/campaigns/:id/activate` | Activate campaign | Access token | campaign:update |
| POST | `/campaigns/:id/pause` | Pause campaign | Access token | campaign:pause |
| POST | `/campaigns/:id/resume` | Resume campaign | Access token | campaign:pause |
| POST | `/campaigns/:id/complete` | Complete campaign | Access token | campaign:update |
| GET | `/campaigns/:id/metrics` | Campaign metrics | Access token | campaign:read |
| GET | `/campaigns/:id/leads` | Campaign leads | Access token | lead:read |
| POST | `/campaigns/:id/caller-ids` | Add caller ID | Access token | campaign:update |
| DELETE | `/campaigns/:id/caller-ids/:cidId` | Remove caller ID | Access token | campaign:update |
| POST | `/campaigns/:id/dispositions` | Add disposition | Access token | campaign:update |
| PATCH | `/campaigns/:id/dispositions/:dispId` | Update disposition | Access token | campaign:update |
| DELETE | `/campaigns/:id/dispositions/:dispId` | Remove disposition | Access token | campaign:update |
| POST | `/campaigns/:id/schedules` | Add schedule | Access token | campaign:update |
| PATCH | `/campaigns/:id/schedules/:schedId` | Update schedule | Access token | campaign:update |
| DELETE | `/campaigns/:id/schedules/:schedId` | Remove schedule | Access token | campaign:update |

### 4.8 Lead Lists

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/lead-lists` | List lead lists | Access token | lead:read |
| POST | `/lead-lists` | Create lead list | Access token | lead:create |
| GET | `/lead-lists/:id` | Get lead list | Access token | lead:read |
| PATCH | `/lead-lists/:id` | Update lead list | Access token | lead:update |
| DELETE | `/lead-lists/:id` | Delete lead list | Access token | lead:delete |
| POST | `/lead-lists/:id/import` | Import CSV | Access token | lead:import |
| GET | `/lead-lists/:id/import-status` | Import status | Access token | lead:read |

### 4.9 Leads

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/leads` | List leads | Access token | lead:read |
| POST | `/leads` | Create lead | Access token | lead:create |
| GET | `/leads/:id` | Get lead | Access token | lead:read |
| PATCH | `/leads/:id` | Update lead | Access token | lead:update |
| DELETE | `/leads/:id` | Delete lead | Access token | lead:delete |
| POST | `/leads/import` | Bulk import leads | Access token | lead:import |
| POST | `/leads/:id/assign` | Assign lead | Access token | lead:assign |
| POST | `/leads/:id/recycle` | Recycle lead | Access token | lead:recycle |
| POST | `/leads/:id/dnc` | Mark as DNC | Access token | compliance:manage |
| POST | `/leads/:id/callbacks` | Schedule callback | Access token | callback:create |
| GET | `/leads/:id/calls` | Lead call history | Access token | call:read |
| POST | `/leads/bulk-assign` | Bulk assign | Access token | lead:assign |
| POST | `/leads/bulk-update` | Bulk update status | Access token | lead:update |
| GET | `/leads/export` | Export leads | Access token | lead:export |

### 4.10 Calls

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/calls` | List calls | Access token | call:read |
| POST | `/calls` | Initiate call | Access token | call:create |
| GET | `/calls/:id` | Get call | Access token | call:read |
| PATCH | `/calls/:id` | Update call | Access token | call:update |
| POST | `/calls/:id/hangup` | Hangup call | Access token | call:update |
| POST | `/calls/:id/hold` | Hold call | Access token | call:update |
| POST | `/calls/:id/resume` | Resume call | Access token | call:update |
| POST | `/calls/:id/mute` | Mute call | Access token | call:update |
| POST | `/calls/:id/unmute` | Unmute call | Access token | call:update |
| POST | `/calls/:id/transfer` | Transfer call | Access token | transfer:execute |
| POST | `/calls/:id/dtmf` | Send DTMF | Access token | call:update |
| POST | `/calls/:id/disposition` | Set disposition | Access token | disposition:set |
| POST | `/calls/:id/notes` | Add note | Access token | call:update |
| POST | `/calls/:id/tags` | Add tag | Access token | call:update |
| GET | `/calls/:id/events` | Call events | Access token | call:read |
| POST | `/calls/:id/callback` | Schedule callback | Access token | callback:create |
| POST | `/calls/:id/recording/start` | Start recording | Access token | recording:pause |
| POST | `/calls/:id/recording/stop` | Stop recording | Access token | recording:pause |
| POST | `/calls/:id/recording/pause` | Pause recording | Access token | recording:pause |
| POST | `/calls/:id/recording/resume` | Resume recording | Access token | recording:pause |

### 4.11 Recordings

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/recordings` | List recordings | Access token | recording:read |
| GET | `/recordings/:id` | Get recording | Access token | recording:read |
| GET | `/recordings/:id/play` | Playback URL | Access token | recording:read |
| GET | `/recordings/:id/download` | Download recording | Access token | recording:download |
| DELETE | `/recordings/:id` | Delete recording | Access token | recording:delete |
| GET | `/recordings/:id/transcript` | Get transcript | Access token | ai:read |
| GET | `/recordings/:id/summary` | Get summary | Access token | ai:read |
| GET | `/recordings/:id/sentiment` | Get sentiment | Access token | ai:read |
| GET | `/recordings/:id/qa-scores` | Get QA scores | Access token | qa:read |

### 4.12 Dispositions

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/dispositions` | List dispositions | Access token | disposition:read |
| GET | `/dispositions/:id` | Get disposition | Access token | disposition:read |
| POST | `/dispositions/:id/callbacks` | Callback from disposition | Access token | callback:create |

### 4.13 Callbacks

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/callbacks` | List callbacks | Access token | callback:read |
| PATCH | `/callbacks/:id` | Update callback | Access token | callback:update |
| DELETE | `/callbacks/:id` | Cancel callback | Access token | callback:delete |
| POST | `/callbacks/:id/complete` | Mark completed | Access token | callback:update |

### 4.14 DNC Management

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/dnc-lists` | List DNC lists | Access token | dnc:manage |
| POST | `/dnc-lists` | Create DNC list | Access token | dnc:manage |
| GET | `/dnc-lists/:id` | Get DNC list | Access token | dnc:manage |
| PATCH | `/dnc-lists/:id` | Update DNC list | Access token | dnc:manage |
| DELETE | `/dnc-lists/:id` | Delete DNC list | Access token | dnc:manage |
| POST | `/dnc-lists/:id/entries` | Add DNC entry | Access token | dnc:manage |
| POST | `/dnc-lists/:id/import` | Import DNC entries | Access token | dnc:manage |
| POST | `/dnc-lists/:id/scrub` | Scrub leads | Access token | dnc:manage |
| DELETE | `/dnc-lists/:id/entries/:entryId` | Remove entry | Access token | dnc:manage |

### 4.15 Compliance

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/compliance/abandon-rate` | Abandon rate report | Access token | compliance:read |
| GET | `/compliance/timezone` | Timezone compliance report | Access token | compliance:read |
| GET | `/compliance/dnc` | DNC compliance report | Access token | compliance:read |
| GET | `/compliance/consent` | Consent report | Access token | compliance:read |
| GET | `/compliance/violations` | Violations log | Access token | compliance:read |

### 4.16 Reports

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/reports` | List saved reports | Access token | report:read |
| POST | `/reports` | Create report | Access token | report:create |
| GET | `/reports/:id` | Get report | Access token | report:read |
| DELETE | `/reports/:id` | Delete report | Access token | report:delete |
| POST | `/reports/:id/run` | Run report | Access token | report:read |
| GET | `/reports/:id/results/:runId` | Get report results | Access token | report:read |
| GET | `/reports/:id/export` | Export report | Access token | report:export |
| GET | `/reports/live` | Live metrics | Access token | dashboard:read |
| GET | `/reports/historical` | Historical metrics | Access token | report:read |
| GET | `/reports/agent-performance` | Agent performance | Access token | report:read |
| GET | `/reports/campaign-performance` | Campaign performance | Access token | report:read |

### 4.17 Analytics

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/analytics/dashboard` | Dashboard analytics | Access token | dashboard:read |
| GET | `/analytics/funnel` | Conversion funnel | Access token | report:read |
| GET | `/analytics/trends` | Trend analysis | Access token | report:read |
| GET | `/analytics/sentiment` | Sentiment aggregation | Access token | ai:read |
| GET | `/analytics/qa` | QA analytics | Access token | qa:read |

### 4.18 Agents

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/agents` | List agents | Access token | agent:read |
| GET | `/agents/:id` | Get agent | Access token | agent:read |
| PATCH | `/agents/:id/status` | Update agent status | Access token | agent:update (own/supervisor) |
| GET | `/agents/:id/performance` | Agent performance | Access token | agent:read |
| GET | `/agents/:id/calls` | Agent calls | Access token | call:read |
| POST | `/agents/:id/pause` | Pause agent | Access token | supervisor |
| POST | `/agents/:id/resume` | Resume agent | Access token | supervisor |

### 4.19 Supervisors

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/supervisors/teams` | Supervisor teams | Access token | supervisor |
| GET | `/supervisors/agents` | Agents under supervisor | Access token | supervisor |
| POST | `/supervisors/listen/:callId` | Listen to call | Access token | realtime:monitor |
| POST | `/supervisors/whisper/:callId` | Whisper to agent | Access token | realtime:monitor |
| POST | `/supervisors/barge/:callId` | Barge call | Access token | realtime:monitor |
| POST | `/supervisors/stop-monitor/:callId` | Stop monitoring | Access token | realtime:monitor |

### 4.20 Admins

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/admin/tenants` | List tenants | Access token | tenant:manage |
| POST | `/admin/tenants` | Create tenant | Access token | tenant:manage |
| GET | `/admin/tenants/:id` | Get tenant | Access token | tenant:manage |
| PATCH | `/admin/tenants/:id` | Update tenant | Access token | tenant:manage |
| DELETE | `/admin/tenants/:id` | Suspend tenant | Access token | tenant:manage |
| GET | `/admin/system-health` | System health | Access token | system:read |
| GET | `/admin/audit-logs` | Audit logs | Access token | audit:read |
| GET | `/admin/settings` | System settings | Access token | setting:manage |
| PATCH | `/admin/settings` | Update system settings | Access token | setting:manage |
| POST | `/admin/maintenance` | Maintenance mode | Access token | system:manage |

### 4.21 Webhooks

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/webhooks` | List webhooks | Access token | webhook:manage |
| POST | `/webhooks` | Create webhook | Access token | webhook:manage |
| GET | `/webhooks/:id` | Get webhook | Access token | webhook:manage |
| PATCH | `/webhooks/:id` | Update webhook | Access token | webhook:manage |
| DELETE | `/webhooks/:id` | Delete webhook | Access token | webhook:manage |
| GET | `/webhooks/:id/deliveries` | Delivery history | Access token | webhook:manage |
| POST | `/webhooks/:id/test` | Test webhook | Access token | webhook:manage |
| POST | `/webhooks/:id/retry` | Retry deliveries | Access token | webhook:manage |

### 4.22 CRM / Integrations

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/integrations` | List integrations | Access token | integration:manage |
| POST | `/integrations` | Create integration | Access token | integration:manage |
| GET | `/integrations/:id` | Get integration | Access token | integration:manage |
| PATCH | `/integrations/:id` | Update integration | Access token | integration:manage |
| DELETE | `/integrations/:id` | Delete integration | Access token | integration:manage |
| POST | `/integrations/:id/test` | Test integration | Access token | integration:manage |
| GET | `/integrations/:id/logs` | Integration logs | Access token | integration:manage |
| POST | `/integrations/:id/sync` | Trigger sync | Access token | integration:manage |

### 4.23 Notifications

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/notifications` | List notifications | Access token | notification:read |
| PATCH | `/notifications/:id/read` | Mark as read | Access token | notification:read |
| PATCH | `/notifications/read-all` | Mark all read | Access token | notification:read |
| GET | `/notifications/preferences` | Get preferences | Access token | notification:read |
| PATCH | `/notifications/preferences` | Update preferences | Access token | notification:read |
| POST | `/notifications/templates` | Create template | Access token | notification:manage |

### 4.24 Recordings (continued)

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/recordings/:id/qa-scores` | QA scores | Access token | qa:read |
| POST | `/recordings/:id/qa-scores` | Submit QA score | Access token | qa:score |
| PATCH | `/recordings/:id/qa-scores/:scoreId` | Update QA score | Access token | qa:score |
| DELETE | `/recordings/:id/qa-scores/:scoreId` | Delete QA score | Access token | qa:score |

### 4.25 AI

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/ai/transcripts` | List transcripts | Access token | ai:read |
| GET | `/ai/transcripts/:id` | Get transcript | Access token | ai:read |
| POST | `/ai/transcripts/:id/regenerate` | Regenerate transcript | Access token | ai:configure |
| GET | `/ai/summaries` | List summaries | Access token | ai:read |
| GET | `/ai/sentiments` | List sentiments | Access token | ai:read |
| GET | `/ai/qa-suggestions` | Get auto-QA suggestions | Access token | ai:read |
| POST | `/ai/jobs` | Submit AI job | Access token | ai:configure |
| GET | `/ai/jobs/:id` | Get AI job status | Access token | ai:read |

### 4.26 Audit

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/audit-logs` | List audit logs | Access token | audit:read |
| GET | `/audit-logs/:id` | Get audit entry | Access token | audit:read |
| GET | `/audit-logs/export` | Export audit logs | Access token | audit:export |
| GET | `/audit-logs/resource/:type/:id` | Resource timeline | Access token | audit:read |

### 4.27 Settings

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/settings` | List settings | Access token | setting:read |
| PATCH | `/settings` | Update settings | Access token | setting:manage |
| GET | `/settings/:key` | Get setting | Access token | setting:read |
| PATCH | `/settings/:key` | Update setting | Access token | setting:manage |

### 4.28 Health & Metrics

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/health` | Basic health check | None | None |
| GET | `/health/ready` | Readiness probe | None | None |
| GET | `/health/live` | Liveness probe | None | None |
| GET | `/metrics` | Prometheus metrics | Internal | system:read |

## 5. Detailed Endpoint Examples

### 5.1 POST /api/v1/auth/login

**Request:**

```json
{
  "email": "agent@example.com",
  "password": "SecurePass123!",
  "tenantId": "ten_abc123"
}
```

**Response:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "ref_tok_123...",
    "expiresIn": 900,
    "user": {
      "id": "usr_123",
      "email": "agent@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "roles": ["Agent"],
      "tenantId": "ten_abc123"
    },
    "permissions": ["lead:read:own", "call:create:own", "disposition:set:own"]
  },
  "meta": null,
  "error": null
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | INVALID_CREDENTIALS | Email or password incorrect |
| 423 | ACCOUNT_LOCKED | Account locked due to failed attempts |
| 403 | TENANT_SUSPENDED | Tenant is suspended |
| 202 | MFA_REQUIRED | TOTP verification required |

**Rate Limit:** 10 requests per minute per IP.

### 5.2 POST /api/v1/campaigns

**Request:**

```json
{
  "name": "Summer Sales 2026",
  "description": "Outbound sales campaign for Q3",
  "mode": "progressive",
  "departmentId": "dept_123",
  "timezone": "America/New_York",
  "pacingConfig": {
    "linesPerAgent": 1,
    "maxAbandonRate": 0.03
  },
  "complianceConfig": {
    "dncListIds": ["dnc_123"],
    "callingWindowStart": "09:00",
    "callingWindowEnd": "20:00",
    "recordingConsent": "business-notification"
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "camp_456",
    "tenantId": "ten_abc123",
    "name": "Summer Sales 2026",
    "mode": "progressive",
    "status": "draft",
    "departmentId": "dept_123",
    "timezone": "America/New_York",
    "pacingConfig": { ... },
    "complianceConfig": { ... },
    "createdAt": "2026-07-21T10:00:00Z",
    "updatedAt": "2026-07-21T10:00:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Missing required fields |
| 403 | FORBIDDEN | User lacks campaign:create permission |
| 409 | DUPLICATE_CAMPAIGN | Campaign name already exists in department |

**Authorization:** `campaign:create` with scope `department` or higher.
**Rate Limit:** 100 requests per minute per user.

### 5.3 GET /api/v1/leads

**Query Parameters:**

- `campaignId` (optional): filter by campaign
- `status` (optional): callable, pending, completed, etc.
- `assignedToUserId` (optional): filter by agent
- `assignedToTeamId` (optional): filter by team
- `search` (optional): search by name, phone, email
- `page` (default: 1)
- `pageSize` (default: 20, max: 100)
- `sort` (default: createdAt)
- `order` (default: desc)

**Response:**

```json
{
  "data": [
    {
      "id": "lead_789",
      "tenantId": "ten_abc123",
      "campaignId": "camp_456",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "timezone": "America/Chicago",
      "status": "callable",
      "phones": [
        { "number": "+15551234567", "type": "primary", "isValid": true }
      ],
      "assignedToUserId": null,
      "dialAttempts": 0,
      "createdAt": "2026-07-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1500,
    "totalPages": 75
  },
  "error": null
}
```

**Authorization:** `lead:read` with appropriate scope.
**Rate Limit:** 200 requests per minute per user.

### 5.4 POST /api/v1/leads/import

**Request:**

```json
{
  "campaignId": "camp_456",
  "leadListId": "ll_123",
  "mapping": {
    "firstName": "First Name",
    "lastName": "Last Name",
    "phone1": "Phone",
    "email": "Email",
    "zip": "ZIP"
  },
  "deduplicationStrategy": "phone",
  "skipInvalidRows": true
}
```

(Actual CSV file uploaded as multipart/form-data.)

**Response:**

```json
{
  "data": {
    "importId": "imp_123",
    "status": "processing",
    "totalRows": 10000,
    "estimatedCompletion": "2026-07-21T10:05:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_MAPPING | Required fields not mapped |
| 403 | FORBIDDEN | User lacks lead:import permission |
| 413 | FILE_TOO_LARGE | File exceeds 100K rows or 50MB |

**Authorization:** `lead:import` with scope `tenant` or `department`.
**Rate Limit:** 10 imports per hour per tenant.

### 5.5 POST /api/v1/calls

**Request:**

```json
{
  "leadId": "lead_789",
  "campaignId": "camp_456",
  "phoneNumber": "+15551234567",
  "dialMode": "manual"
}
```

**Response:**

```json
{
  "data": {
    "id": "call_001",
    "tenantId": "ten_abc123",
    "campaignId": "camp_456",
    "leadId": "lead_789",
    "agentId": "usr_123",
    "state": "initiated",
    "callerId": "+15559876543",
    "createdAt": "2026-07-21T10:00:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | LEAD_NOT_CALLABLE | Lead not in callable status |
| 403 | FORBIDDEN | User cannot call this lead |
| 409 | CALL_IN_PROGRESS | Lead already in active call |
| 422 | OUTSIDE_CALLING_WINDOW | Current time outside allowed window |

**Authorization:** `call:create` with scope `own` or higher.
**Rate Limit:** 60 calls per minute per agent.

### 5.6 POST /api/v1/calls/:id/disposition

**Request:**

```json
{
  "dispositionId": "disp_123",
  "notes": "Customer interested, follow-up next week",
  "callback": {
    "scheduledAt": "2026-07-28T15:00:00Z",
    "timezone": "America/Chicago"
  }
}
```

**Response:**

```json
{
  "data": {
    "callId": "call_001",
    "dispositionId": "disp_123",
    "dispositionCode": "callback",
    "notes": "Customer interested, follow-up next week",
    "callbackId": "cb_001",
    "leadStatus": "callback",
    "updatedAt": "2026-07-21T10:05:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | CALL_NOT_FOUND | Call does not exist |
| 403 | FORBIDDEN | User cannot set disposition |
| 400 | INVALID_DISPOSITION | Disposition not in campaign |
| 422 | CALLBACK_REQUIRED | Callback data required for this disposition |

**Authorization:** `disposition:set` with scope `own` or higher.
**Rate Limit:** 120 requests per minute per agent.

### 5.7 GET /api/v1/reports/live

**Query Parameters:**

- `campaignId` (optional)
- `departmentId` (optional)
- `teamId` (optional)

**Response:**

```json
{
  "data": {
    "activeAgents": 45,
    "callsInProgress": 38,
    "queueDepth": 120,
    "dialsPerMinute": 120,
    "connectionRate": 0.42,
    "abandonRate": 0.02,
    "averageHandleTimeSeconds": 185,
    "campaigns": [
      {
        "campaignId": "camp_456",
        "name": "Summer Sales 2026",
        "activeAgents": 20,
        "callsInProgress": 18,
        "connectionRate": 0.45
      }
    ]
  },
  "meta": {
    "generatedAt": "2026-07-21T10:00:05Z"
  },
  "error": null
}
```

**Authorization:** `dashboard:read` or `report:read` with appropriate scope.
**Rate Limit:** 60 requests per minute per user.

### 5.8 POST /api/v1/webhooks

**Request:**

```json
{
  "name": "CRM Sync",
  "url": "https://crm.example.com/webhooks/rdcs",
  "secret": "whsec_123456",
  "eventFilters": ["lead.created", "call.completed", "disposition.set", "recording.available"],
  "retryPolicy": {
    "maxAttempts": 10,
    "backoffMultiplier": 2,
    "initialDelaySeconds": 60,
    "maxDelaySeconds": 3600
  }
}
```

**Response:**

```json
{
  "data": {
    "id": "wh_123",
    "tenantId": "ten_abc123",
    "name": "CRM Sync",
    "url": "https://crm.example.com/webhooks/rdcs",
    "eventFilters": ["lead.created", "call.completed", "disposition.set", "recording.available"],
    "isActive": true,
    "createdAt": "2026-07-21T10:00:00Z"
  },
  "meta": null,
  "error": null
}
```

**Errors:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_URL | Invalid webhook URL |
| 403 | FORBIDDEN | User lacks webhook:manage permission |
| 409 | DUPLICATE_WEBHOOK | Webhook URL already registered |

**Authorization:** `webhook:manage` with scope `tenant`.
**Rate Limit:** 30 requests per minute per user.

## 6. Validation Standards

- DTOs use `class-validator` / Zod.
- Required fields explicitly declared.
- String lengths, email formats, phone E.164 validation.
- UUID validation for IDs.
- Enum validation for status/mode fields.
- Cross-field validation (e.g., startTime < endTime).

## 7. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| INVALID_CREDENTIALS | 401 | Login failed |
| UNAUTHORIZED | 401 | Missing or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| METHOD_NOT_ALLOWED | 405 | HTTP method not allowed |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

## 8. Pagination & Sorting

- `page`: 1-based page number.
- `pageSize`: default 20, max 100.
- `sort`: field name, supports nested fields with dot notation.
- `order`: `asc` or `desc`.
- Cursor-based pagination for very large datasets (future).

## 9. Filtering

- Equality filters: `?status=callable`.
- Multi-value filters: `?status=callable,pending`.
- Range filters: `?createdAtFrom=2026-01-01&createdAtTo=2026-01-31`.
- Search: `?search=john` (searches configured fields).
- Null filters: `?assignedToUserId=null`.

## 10. API Versioning & Deprecation

- Current version: `v1`.
- Deprecated endpoints return `Sunset` header with date.
- Minimum 6 months support after deprecation announcement.

## 11. SDK & Documentation

- Swagger UI at `/api/v1/docs`.
- OpenAPI JSON at `/api/v1/docs-json`.
- Generated client SDKs from OpenAPI spec (future).
- Postman collection in `/docs/api/postman-collection.json` (future).
