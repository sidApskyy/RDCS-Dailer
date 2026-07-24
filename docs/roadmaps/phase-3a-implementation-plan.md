# Phase 3A Implementation Plan

**Date:** 2025-01-09  
**Sprint:** Phase 3A — Core Backend Completion and Data Pipeline  
**Objective:** Make the core Campaign → Lead List → CSV Import → Lead lifecycle domain function correctly

## Executive Summary

Phase 3A focuses on completing the critical data pipeline that enables importing leads from CSV files into campaigns. The current CSV import worker is stubbed and non-functional. This sprint will implement a production-quality CSV import pipeline while verifying the existing Campaign, Lead List, and Lead domain implementations.

**Scope:**
- Campaign domain verification
- Lead List domain verification
- Lead lifecycle state machine definition
- CSV import architecture implementation
- CSV parsing, validation, normalization
- Deduplication and idempotency
- DNC integration
- BullMQ worker implementation
- Security review
- Focused testing for implemented functionality

**Out of Scope:**
- Frontend implementation (deferred to Phase 3B or later)
- Comprehensive testing (deferred to Phase 3B or later)
- Telephony (Phase 4)
- Compliance engine verification (Phase 3B)

## Audit Findings Summary

### Existing Functionality (Implemented But Not Verified)
- Campaign CRUD service and controller
- Lead List CRUD service and controller
- Disposition CRUD service and controller
- Callback CRUD service and controller
- Consent CRUD service and controller
- DNC CRUD service and controller
- Calling Window CRUD service and controller
- Timezone service
- Compliance Engine service
- Attempt Tracking service and controller
- Query service (filtering, sorting, pagination)
- Database models for all Phase 3 entities
- Database indexes
- RBAC decorators on controllers
- Tenant isolation in services

### Stubbed Functionality (Non-Functional)
- CSV Import Worker (`csv-import.processor.ts`)
  - `readCsvFile()` returns empty array
  - `processRow()` returns placeholder
  - No actual CSV parsing
  - No validation
  - No deduplication
  - No DNC integration

### Partially Implemented
- Lead Lifecycle
  - Lead assignment service exists
  - Deduplication service exists
  - No dedicated lead CRUD controller
  - No explicit state machine enforcement

### Missing Functionality
- CSV file handling (validation, size limits, MIME validation)
- CSV column mapping
- Phone normalization (E.164)
- Import idempotency
- Import statistics tracking
- Lead state machine with explicit transitions
- Lead CRUD controller

## Implementation Order

### Phase 1: Domain Verification (Steps 1-3)
1. Campaign domain audit and verification
2. Lead List domain audit and verification
3. Lead domain audit and state machine definition

**Dependencies:** None  
**Verification Strategy:** Manual code review, API testing, build verification

### Phase 2: CSV Architecture (Steps 4-7)
4. CSV import architecture design
5. CSV file handling implementation
6. CSV column mapping implementation
7. CSV validation implementation

**Dependencies:** Phase 1 complete  
**Verification Strategy:** Unit tests for parsing, validation, mapping

### Phase 3: Data Processing (Steps 8-12)
8. Phone normalization implementation
9. Deduplication implementation
10. Import idempotency implementation
11. DNC integration for imports
12. Import statistics tracking

**Dependencies:** Phase 2 complete  
**Verification Strategy:** Unit tests for normalization, deduplication, idempotency

### Phase 4: Worker Implementation (Step 13)
13. BullMQ worker implementation

**Dependencies:** Phase 3 complete  
**Verification Strategy:** Integration tests with mock BullMQ

### Phase 5: Data Integrity (Steps 14-17)
14. Database transactions and batching
15. Large file support verification
16. API verification
17. Data integrity review

**Dependencies:** Phase 4 complete  
**Verification Strategy:** Integration tests, performance benchmarks

### Phase 6: Security and Verification (Steps 18-21)
18. Security review
19. Verification (build, test, runtime)
20. Create Phase 3A tests
21. Create Phase 3A final report

**Dependencies:** Phase 5 complete  
**Verification Strategy:** Security audit, full build, runtime testing

## Detailed Implementation Plan

### STEP 1: Campaign Domain Audit

**Files to Inspect:**
- `apps/api/src/modules/campaign/campaign.service.ts`
- `apps/api/src/modules/campaign/campaign.controller.ts`
- `apps/api/src/modules/campaign/*.dto.ts`
- `packages/database/prisma/schema.prisma` (Campaign model)

**Verification Checklist:**
- [ ] Campaign creation with validation
- [ ] Campaign update with validation
- [ ] Campaign retrieval with tenant isolation
- [ ] Campaign listing with pagination
- [ ] Campaign filtering by status
- [ ] Campaign search functionality
- [ ] Campaign status transitions (draft → active → paused → completed → archived)
- [ ] Invalid state transition rejection
- [ ] Campaign ownership (tenantId, organizationId)
- [ ] Authorization (@RequirePermission decorators)
- [ ] Audit event recording
- [ ] Campaign schedule handling
- [ ] Campaign timezone handling
- [ ] Lead list association (attach/detach)
- [ ] Disposition configuration
- [ ] Error handling

**Fix Required If:**
- Missing validation
- Incorrect state transitions
- Missing tenant isolation
- Missing authorization
- Missing audit logging

### STEP 2: Lead List Domain Audit

**Files to Inspect:**
- `apps/api/src/modules/lead-list/lead-list.service.ts`
- `apps/api/src/modules/lead-list/lead-list.controller.ts`
- `apps/api/src/modules/lead-list/*.dto.ts`
- `packages/database/prisma/schema.prisma` (LeadList, CampaignLeadList models)

**Verification Checklist:**
- [ ] Lead list creation with validation
- [ ] Lead list update with validation
- [ ] Lead list retrieval with tenant isolation
- [ ] Lead list listing with pagination
- [ ] Lead list filtering by status
- [ ] Campaign association (attach/detach)
- [ ] Lead count tracking
- [ ] Import statistics tracking
- [ ] Import status tracking
- [ ] Authorization (@RequirePermission decorators)
- [ ] Audit event recording
- [ ] Error handling

**Fix Required If:**
- Missing validation
- Missing tenant isolation
- Missing authorization
- Missing audit logging
- Incorrect statistics calculation

### STEP 3: Lead Domain Audit and State Machine

**Files to Inspect:**
- `apps/api/src/modules/lead/lead-assignment.service.ts`
- `apps/api/src/modules/lead/deduplication.service.ts`
- `packages/database/prisma/schema.prisma` (Lead, LeadPhone models)

**Verification Checklist:**
- [ ] Lead assignment to users
- [ ] Lead assignment to teams
- [ ] Lead reassignment
- [ ] Lead unassignment
- [ ] Deduplication logic
- [ ] Tenant isolation
- [ ] Authorization
- [ ] Audit logging

**State Machine Definition:**
Based on existing implementation, define authoritative lead states:
- `new`: Lead created but not processed
- `eligible`: Lead eligible for assignment
- `assigned`: Lead assigned to agent/team
- `in_progress`: Lead being worked on
- `callback`: Callback scheduled
- `contacted`: Successfully contacted
- `not_contacted`: Contact attempt failed
- `dnc`: On Do Not Call list
- `disqualified`: Does not meet criteria
- `converted`: Converted to customer
- `exhausted`: All attempts exhausted
- `archived`: Archived

**Required Implementation:**
- Explicit valid state transitions
- Invalid transition rejection
- State transition history recording
- Concurrency-safe transitions

**Fix Required If:**
- Missing lead CRUD controller
- No state machine enforcement
- Missing tenant isolation
- Missing authorization

### STEP 4: CSV Import Architecture

**Architecture Flow:**
```
Upload (HTTP POST)
  ↓
File validation (type, size, MIME)
  ↓
Import record creation (LeadListImport)
  ↓
BullMQ job creation
  ↓
CSV parsing (streaming/chunked)
  ↓
Header detection
  ↓
Column mapping
  ↓
Row validation
  ↓
Normalization (phone, email, timezone)
  ↓
Deduplication
  ↓
DNC screening
  ↓
Lead creation/update
  ↓
Lead phone creation
  ↓
Import statistics update
  ↓
Import completion
```

**Files to Create/Modify:**
- `apps/api/src/modules/lead-import/csv-parser.service.ts` (new)
- `apps/api/src/modules/lead-import/csv-validator.service.ts` (new)
- `apps/api/src/modules/lead-import/csv-normalizer.service.ts` (new)
- `apps/api/src/modules/lead-import/csv-deduplicator.service.ts` (new)
- `apps/worker/src/jobs/csv-import.processor.ts` (modify - implement stubs)

**Dependencies:**
- Existing LeadListImport model
- Existing LeadImportRow model
- Existing DNC scrubbing service
- Existing Prisma client

### STEP 5: CSV File Handling

**Implementation Requirements:**
- File type validation (.csv only)
- File extension validation
- MIME type validation (text/csv, application/csv)
- File size limits (configurable, default 10MB)
- Empty file detection
- Malformed file detection
- Encoding handling (UTF-8, UTF-16, ASCII)
- Header detection
- Safe CSV parsing (no code execution)
- Resource limits (memory, time)
- Error handling

**Security Requirements:**
- Prevent path traversal
- Prevent arbitrary file execution
- Prevent resource exhaustion
- Prevent CSV injection
- Temporary file cleanup
- Tenant association
- User association
- Import record association

**Files to Create:**
- `apps/api/src/modules/lead-import/file-handler.service.ts`

### STEP 6: CSV Column Mapping

**Supported Columns:**
- first_name
- last_name
- phone (required)
- email
- address
- city
- state
- zip
- country
- timezone
- external_id
- custom fields (JSON)

**Implementation Requirements:**
- Automatic column detection
- Explicit column mapping
- Required field validation
- Invalid mapping rejection
- Mapping configuration storage
- Reproducible imports
- Auditable mappings

**Files to Create:**
- `apps/api/src/modules/lead-import/column-mapper.service.ts`

### STEP 7: CSV Validation

**Row-Level Validation:**
- Required fields present
- Phone number format
- Email address format
- Country code validity
- Timezone validity (IANA)
- External ID format
- Custom field validation
- Invalid character detection
- Malformed value detection

**Error Structure:**
```typescript
{
  rowNumber: number,
  column: string,
  errorCode: string,
  errorMessage: string,
  originalValue: any,
  normalizedValue?: any
}
```

**Files to Create:**
- `apps/api/src/modules/lead-import/csv-validator.service.ts`

### STEP 8: Phone Normalization

**Implementation Requirements:**
- E.164 format preference
- Country-aware normalization
- Store original number
- Store normalized number
- Store country code
- Store validation status
- Document normalization rules

**Supported Formats:**
- US: +1 (XXX) XXX-XXXX
- International: +CC XXXXXXXXXX
- Local formats (country-specific)

**Files to Create:**
- `apps/api/src/modules/lead-import/phone-normalizer.service.ts`

### STEP 9: Deduplication

**Matching Priority:**
1. External ID (highest priority)
2. Normalized phone + tenant
3. Email + tenant
4. Cross-list duplicate
5. Cross-campaign duplicate

**Duplicate Types:**
- Exact duplicate: Same external ID or same normalized phone in same list
- Potential duplicate: Same normalized phone in different list
- Allowed duplicate: Different external ID, different phone
- Cross-list duplicate: Same phone in different list
- Cross-campaign duplicate: Same phone in different campaign

**Implementation Requirements:**
- Deterministic matching
- No accidental merging
- Idempotent re-import
- Duplicate tracking
- Duplicate statistics

**Files to Create:**
- `apps/api/src/modules/lead-import/csv-deduplicator.service.ts`

### STEP 10: Import Idempotency

**Mechanisms:**
- Import hash (file content hash)
- File hash
- External ID tracking
- Unique constraints (database)
- Import row identity
- Database constraints

**Implementation Requirements:**
- Repeated import does not create duplicates
- Concurrent import safety
- Transaction isolation
- Rollback on failure

**Database Constraints to Verify:**
- Unique constraint on (leadListId, externalId)
- Unique constraint on (leadId, phoneNumber)
- Unique constraint on (importId, rowNumber)

### STEP 11: DNC Integration

**Integration Points:**
- For every imported phone number
- Evaluate DNC rules (tenant, campaign, global)
- If suppressed: mark as suppressed, track reason
- Do not delete suppressed records (auditability)
- Use existing DNC scrubbing service
- Do not duplicate DNC rules

**Implementation Requirements:**
- Call existing `DncScrubbingService`
- Track suppression statistics
- Record suppression reason
- Respect DNC expiration

### STEP 12: Import Statistics

**Statistics to Track:**
- Total rows
- Processed rows
- Imported rows
- Updated rows
- Rejected rows
- Invalid rows
- Duplicate rows
- Suppressed rows
- Failed rows
- Processing duration
- Import status
- Import errors

**Status Values:**
- PENDING
- PROCESSING
- COMPLETED
- PARTIALLY_COMPLETED
- FAILED
- CANCELLED

**Implementation Requirements:**
- Real-time progress updates
- Periodic statistics updates (every 100 rows)
- Final statistics on completion
- Error aggregation

### STEP 13: BullMQ Worker

**Job Data Structure:**
```typescript
{
  tenantId: string,
  importId: string,
  leadListId: string,
  filePath: string,
  userId: string,
  correlationId?: string
}
```

**Implementation Requirements:**
- Tenant ID validation
- Import ID validation
- Lead list ID validation
- User ID validation
- Retry logic
- Backoff strategy
- Failure handling
- Idempotency
- Progress tracking
- Structured logging
- Job cancellation support
- Prevent cross-tenant data access

**Files to Modify:**
- `apps/worker/src/jobs/csv-import.processor.ts` (implement stubs)

### STEP 14: Database Transactions

**Transaction Strategy:**
- Single row operations: atomic transaction
- Batch operations: chunked transactions (100 rows per transaction)
- Import record update: separate transaction
- Statistics update: separate transaction

**Atomic Operations:**
- Lead creation + Lead phone creation
- Lead update + Lead phone update
- Consent creation
- Assignment creation

**Non-Atomic Operations:**
- Entire CSV import (too large)
- Lead list statistics (can be recalculated)

**Implementation Requirements:**
- Safe batching
- Memory management
- Rollback on error
- Transaction isolation level

### STEP 15: Large File Support

**Design Targets:**
- 10,000 rows: < 1 minute
- 100,000 rows: < 10 minutes
- 1,000,000 rows: < 2 hours

**Implementation Requirements:**
- Streaming CSV parsing (not load entire file)
- Chunked processing (100 rows per batch)
- Memory-efficient processing
- Progress tracking
- Resource limits
- Performance measurement

**Libraries to Consider:**
- `csv-parser` or `fast-csv` for streaming
- `stream` API for large files

### STEP 16: API Verification

**APIs to Verify:**
- Campaign CRUD
- Lead List CRUD
- Lead Import (create, status, errors)
- DNC (check, lists)
- Consent (check, history)
- Callbacks (CRUD)
- Dispositions (CRUD, apply)
- Calling Windows (check)
- Attempt Tracking (CRUD)

**Verification Checklist:**
- Authentication required
- Tenant isolation enforced
- RBAC permissions checked
- Input validation
- Pagination works
- Filtering works
- Error responses correct
- Not found handling
- Conflict handling
- Idempotency
- Audit events recorded

### STEP 17: Data Integrity Review

**Prisma Schema Review:**
- Foreign key constraints
- Unique constraints
- Tenant constraints
- Indexes
- Cascade rules
- Import constraints
- Lead constraints
- Phone constraints
- DNC constraints
- Consent constraints

**Required Additions:**
- Unique constraint on (leadListId, externalId) if missing
- Unique constraint on (leadId, phoneNumber) if missing
- Index on (tenantId, externalId) if missing

**Migration Safety:**
- Create migration safely
- Test migration on development
- Backup before production migration

### STEP 18: Security Review

**CSV Upload Security:**
- Oversized files (reject > 10MB)
- Malformed CSV (handle gracefully)
- Malicious CSV (prevent injection)
- CSV injection (sanitize inputs)
- Path traversal (validate file paths)
- Unauthorized imports (check permissions)
- Cross-tenant imports (validate tenant ID)
- Duplicate imports (check existing)
- Concurrent imports (handle safely)
- Invalid tenant IDs (reject)
- Forged import IDs (validate)
- IDOR (check ownership)
- Mass assignment (use DTOs)

**Security Requirements:**
- Do not trust client-provided tenant IDs
- Validate all file uploads
- Sanitize all CSV data
- Use prepared statements (Prisma)
- Implement rate limiting
- Log security events

### STEP 19: Verification

**Build Verification:**
```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm typecheck
pnpm lint
pnpm build
```

**Test Verification:**
```bash
pnpm test
```

**Runtime Verification (if Docker available):**
- Start PostgreSQL
- Start Redis
- Start API
- Start worker
- Test actual CSV imports end-to-end

**If Docker Unavailable:**
- Mark runtime verification: BLOCKED BY ENVIRONMENT
- Do not fabricate results

### STEP 20: Phase 3A Tests

**Focused Test Suite:**
- Campaign lifecycle tests
- Lead lifecycle tests
- CSV parsing tests
- CSV validation tests
- Phone normalization tests
- Deduplication tests
- Import idempotency tests
- DNC suppression tests
- BullMQ job processing tests
- Tenant isolation tests
- Authorization tests
- Concurrent import tests
- Import failure recovery tests

**Test Location:**
- `apps/api/test/phase3a/` (new directory)

### STEP 21: Phase 3A Final Report

**Report Contents:**
1. Phase 3A Objective
2. Audit Findings
3. Campaign Status
4. Lead List Status
5. Lead Lifecycle Status
6. CSV Import Architecture
7. CSV Parsing
8. CSV Validation
9. Normalization
10. Deduplication
11. Idempotency
12. DNC Integration
13. BullMQ Implementation
14. Database Changes
15. Security Review
16. Tests
17. Build Results
18. Lint Results
19. Typecheck Results
20. Docker Runtime Results
21. Blocked Checks
22. Known Issues
23. Technical Debt
24. Remaining Phase 3 Work
25. Phase 3A Status

**Final Status Options:**
- COMPLETE (all criteria met)
- BLOCKED (environment limitations)
- FAILED (critical defects)

## Dependencies

### External Dependencies
- `csv-parser` or `fast-csv` (CSV parsing)
- `libphonenumber-js` (phone normalization)
- Existing Prisma client
- Existing BullMQ
- Existing Redis

### Internal Dependencies
- Phase 0 (repository stabilization)
- Phase 1 (engineering conventions)
- Phase 2 (identity, multi-tenancy, authorization)
- Phase 3 database schema
- Phase 3 services (DNC, consent, etc.)

## Risk Assessment

**High Risk:**
- CSV import worker is completely stubbed
- No existing tests for CSV import
- Large file performance unknown
- Concurrent import safety untested

**Medium Risk:**
- Lead state machine not explicitly enforced
- Deduplication logic not tested
- Idempotency not verified

**Low Risk:**
- Campaign domain likely functional (compiles)
- Lead list domain likely functional (compiles)
- Existing services (DNC, consent) likely functional

## Success Criteria

Phase 3A is COMPLETE when:
- [ ] Campaign domain verified functional
- [ ] Lead list domain verified functional
- [ ] Lead state machine defined and enforced
- [ ] CSV import worker fully implemented
- [ ] CSV parsing works correctly
- [ ] CSV validation works correctly
- [ ] Phone normalization works correctly
- [ ] Deduplication works correctly
- [ ] Import idempotency verified
- [ ] DNC integration works correctly
- [ ] Import statistics tracked correctly
- [ ] BullMQ worker processes jobs correctly
- [ ] Security review completed
- [ ] Focused tests pass
- [ ] Build passes
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Runtime verification completed or blocked by environment

## Remaining Phase 3 Work (After Phase 3A)

**Phase 3B — Compliance and Eligibility Verification:**
- Compliance engine testing
- Time zone testing
- Calling window testing
- Consent testing
- DNC testing
- Callback testing
- Disposition testing
- Attempt tracking testing

**Phase 3C — Frontend Implementation:**
- Campaign management UI
- Lead list management UI
- CSV import UI
- Lead management UI
- DNC management UI
- Consent management UI
- Callback management UI
- Disposition management UI
- Calling window management UI
- Compliance monitoring UI

**Phase 3D — Comprehensive Testing:**
- Unit tests for all modules
- Integration tests for all modules
- E2E Playwright tests
- Tenant isolation regression tests
- RBAC regression tests
- Large dataset tests (100,000 leads)

**Phase 3E — Final Verification:**
- Complete Phase 3 exit gate
- Correct Phase 3 final report
- Phase 4 readiness assessment
