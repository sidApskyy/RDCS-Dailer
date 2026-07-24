# Compliance Engine Documentation

## Overview

The Compliance Engine is a centralized service that enforces regulatory compliance rules before allowing leads to be contacted. It integrates multiple compliance checks into a single eligibility evaluation.

## Architecture

### Core Components

- **DNC Scrubbing Service**: Screens phone numbers against Do Not Call lists
- **Consent Service**: Verifies consent status for communication
- **Calling Window Service**: Validates calling hours compliance
- **Timezone Service**: Handles timezone-aware business hours checks
- **Compliance Engine**: Orchestrates all compliance checks

## Compliance Engine Service

### Location
`apps/api/src/modules/compliance/compliance-engine.service.ts`

### Key Methods

#### `checkLeadEligibility(tenantId, leadId, phoneNumber, config)`

Evaluates whether a lead is eligible for contact based on configured compliance rules.

**Parameters:**
- `tenantId`: Tenant identifier
- `leadId`: Lead identifier
- `phoneNumber`: Phone number to contact
- `config`: Compliance check configuration
  - `checkDNC`: Enable DNC screening
  - `checkConsent`: Enable consent verification
  - `checkCallingWindow`: Enable calling window validation
  - `checkTimezone`: Enable timezone business hours check
  - `campaignId`: Optional campaign ID for campaign-specific rules
  - `timezone`: Optional lead timezone for business hours

**Returns:** `EligibilityResult`
- `eligible`: Boolean indicating eligibility
- `reason`: Human-readable explanation
- `rule`: The specific rule that failed (if any)
- `metadata`: Additional context about the decision

#### `checkBulkEligibility(tenantId, leads, config)`

Evaluates eligibility for multiple leads in batch.

**Parameters:**
- `tenantId`: Tenant identifier
- `leads`: Array of lead objects with id, phoneNumber, and optional timezone
- `config`: Compliance check configuration

**Returns:** Map of lead IDs to eligibility results

#### `getCachedEligibility(tenantId, leadId, campaignId)`

Retrieves a cached eligibility decision if still valid (1-hour cache).

**Parameters:**
- `tenantId`: Tenant identifier
- `leadId`: Lead identifier
- `campaignId`: Campaign identifier

**Returns:** Cached eligibility result or null

#### `getEligibilityHistory(tenantId, leadId, params)`

Retrieves historical eligibility decisions for a lead.

**Parameters:**
- `tenantId`: Tenant identifier
- `leadId`: Lead identifier
- `params`: Pagination parameters (skip, take)

**Returns:** Paginated list of eligibility decisions

#### `getComplianceStatistics(tenantId)`

Retrieves aggregate compliance statistics for a tenant.

**Parameters:**
- `tenantId`: Tenant identifier

**Returns:**
- `totalDecisions`: Total number of eligibility decisions
- `eligibleCount`: Number of eligible decisions
- `ineligibleCount`: Number of ineligible decisions
- `breakdownByRule`: Count of decisions by rule

## Compliance Rules

### DNC Blocking

Blocks contact if the phone number is on any active DNC list.

**Rule:** `DNC_BLOCKED`

**Configuration:**
- `checkTenantDNC`: Check tenant-level DNC lists
- `checkCampaignDNC`: Check campaign-specific DNC lists
- `checkGlobalDNC`: Check global DNC lists

### Consent Verification

Blocks contact if no valid consent exists for the lead.

**Rule:** `CONSENT_MISSING`

**Configuration:**
- Checks the latest consent record for the lead
- Respects consent expiration dates
- Supports multiple consent types (express, implied, verbal, written, electronic)

### Calling Window

Blocks contact if outside configured calling windows.

**Rule:** `OUTSIDE_CALLING_WINDOW`

**Configuration:**
- Checks against tenant-level calling windows
- Supports day-of-week and time-of-day rules
- Respects timezone settings

### Business Hours

Blocks contact if outside business hours in the lead's timezone.

**Rule:** `OUTSIDE_BUSINESS_HOURS`

**Configuration:**
- Default business hours: 9 AM - 5 PM
- Configurable per lead
- Only contacts on weekdays (Monday-Friday)

## Eligibility Decision Caching

Eligibility decisions are cached for 1 hour to improve performance and reduce database load. Cached decisions include:
- Eligibility result
- Reason for decision
- Rule that was applied
- Metadata about the check
- Expiration timestamp

## Usage Example

```typescript
import { ComplianceEngineService } from './compliance-engine.service';

const result = await complianceEngine.checkLeadEligibility(
  tenantId,
  leadId,
  phoneNumber,
  {
    checkDNC: true,
    checkConsent: true,
    checkCallingWindow: true,
    checkTimezone: true,
    campaignId: campaignId,
    timezone: 'America/New_York',
  }
);

if (result.eligible) {
  // Proceed with contact
} else {
  // Handle ineligibility
  console.log(`Lead ineligible: ${result.reason}`);
}
```

## Integration Points

### Lead Import
- Eligibility is checked before importing leads into campaigns
- Ineligible leads are flagged during import

### Lead Assignment
- Eligibility is checked before assigning leads to agents
- Only eligible leads are assigned

### Callback Scheduling
- Eligibility is checked before scheduling callbacks
- Callbacks are scheduled within calling windows

## Audit Trail

All eligibility decisions are recorded in the `LeadEligibilityDecision` table for audit purposes. This includes:
- Timestamp of the decision
- Configuration used for the check
- Result of the decision
- Reason for the decision
- Metadata about the check

## Performance Considerations

- Use cached eligibility decisions when possible
- Batch eligibility checks for multiple leads
- Configure appropriate index on `LeadEligibilityDecision` table
- Consider background job processing for bulk eligibility checks
