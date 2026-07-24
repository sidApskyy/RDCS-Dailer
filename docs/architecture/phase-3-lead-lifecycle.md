# Lead Lifecycle Documentation

## Overview

The Lead Lifecycle defines the states a lead can transition through and the rules governing those transitions. This ensures consistent lead management and enables proper tracking of lead progress.

## Lead States

### Primary States

- **new**: Lead has been created but not yet processed
- **eligible**: Lead is eligible for contact assignment
- **assigned**: Lead has been assigned to an agent or team
- **in_progress**: Lead is currently being worked on
- **callback**: Lead has a scheduled callback
- **contacted**: Lead has been successfully contacted
- **not_contacted**: Contact attempt was unsuccessful
- **dnc**: Lead is on Do Not Call list
- **disqualified**: Lead does not meet qualification criteria
- **converted**: Lead has been converted to a customer
- **exhausted**: All contact attempts have been exhausted
- **archived**: Lead has been archived

## State Transitions

### Valid Transitions

| From State | To State | Trigger |
|-----------|----------|---------|
| new | eligible | Lead imported and validated |
| eligible | assigned | Lead assigned to agent/team |
| assigned | in_progress | Agent begins working lead |
| in_progress | contacted | Successful contact made |
| in_progress | not_contacted | Contact attempt failed |
| in_progress | callback | Callback scheduled |
| in_progress | disqualified | Lead disqualified |
| callback | in_progress | Callback being executed |
| callback | contacted | Callback successful |
| callback | not_contacted | Callback failed |
| not_contacted | eligible | Retry allowed |
| not_contacted | exhausted | Max attempts reached |
| contacted | converted | Lead converted |
| contacted | disqualified | Lead disqualified |
| disqualified | archived | Lead archived |
| exhausted | archived | Lead archived |
| dnc | archived | Lead archived |
| converted | archived | Lead archived |
| any | archived | Manual archive |

### Disposition-Based Transitions

Dispositions can trigger automatic state transitions based on their configuration:

- **Terminal dispositions**: Move lead to terminal state (converted, disqualified, exhausted)
- **Non-terminal dispositions**: Keep lead in current state or move to callback state
- **DNC dispositions**: Automatically add to DNC and move to dnc state
- **Callback dispositions**: Schedule callback and move to callback state

## Lead Assignment

### Assignment Types

- **User Assignment**: Lead assigned to a specific agent
- **Team Assignment**: Lead assigned to a team (organization)
- **Both**: Lead assigned to both a user and a team

### Assignment Rules

- Only eligible leads can be assigned
- Assignment updates lead status to `assigned`
- Assignment timestamp is recorded
- Assignment history is tracked

### Reassignment

- Leads can be reassigned to different users/teams
- Reassignment updates the assignment timestamp
- Previous assignment is recorded in history

### Unassignment

- Leads can be unassigned
- Unassignment returns lead to `eligible` state
- Assignment timestamp is cleared

## Lead Dispositions

### Disposition Categories

- **positive**: Successful contact outcomes
- **negative**: Unsuccessful contact outcomes
- **neutral**: Neutral or pending outcomes
- **callback**: Callback required
- **dnc**: Do Not Call

### Disposition Outcomes

- **terminal**: Final disposition, no further contact
- **non_terminal**: Contact can continue

### Disposition Application

- Dispositions are applied to leads after contact attempts
- Each disposition application is recorded
- Disposition history is maintained
- Dispositions can trigger automatic state transitions

## Callback Management

### Callback Scheduling

- Callbacks can be scheduled for any lead
- Callbacks have scheduled date/time
- Callbacks can be assigned to users or teams
- Callbacks have priority levels

### Callback States

- **pending**: Callback scheduled but not yet due
- **completed**: Callback was completed
- **cancelled**: Callback was cancelled
- **missed**: Callback was missed

### Callback Execution

- Due callbacks are retrieved based on scheduled time
- Callbacks are executed in priority order
- Callback completion updates lead state
- Missed callbacks can be rescheduled

## Consent Management

### Consent Status

- **granted**: Consent has been granted
- **revoked**: Consent has been revoked
- **expired**: Consent has expired
- **unknown**: Consent status unknown

### Consent Types

- **express**: Explicit consent given
- **implied**: Implied consent from relationship
- **verbal**: Verbal consent recorded
- **written**: Written consent documented
- **electronic**: Electronic consent captured

### Consent Tracking

- Each consent change is recorded
- Consent includes evidence (IP, timestamp, etc.)
- Consent can have expiration dates
- Consent is scoped (all communications, specific campaign, etc.)

## DNC Management

### DNC List Types

- **tenant**: Tenant-specific DNC list
- **campaign**: Campaign-specific DNC list
- **global**: Global DNC list

### DNC Entry Management

- Phone numbers can be added to DNC lists
- DNC entries can have expiration dates
- DNC entries include reason and source
- Bulk import supported

### DNC Scrubbing

- Phone numbers are checked against DNC lists before contact
- Scrubbing checks tenant, campaign, and global lists
- Expired DNC entries are ignored
- Scrubbing results include which lists blocked the number

## Attempt Tracking

### Attempt Recording

- Each contact attempt is recorded
- Attempts include disposition and outcome
- Attempts include duration and recording
- Attempts are numbered per lead

### Attempt Outcomes

- **connected**: Call was connected
- **no_answer**: No answer
- **busy**: Line was busy
- **voicemail**: Reached voicemail
- **failed**: Call failed

### Attempt Statistics

- Total attempts per lead
- Successful vs failed attempts
- Average call duration
- Attempts by outcome

## Audit Trail

All lead lifecycle events are recorded in the audit trail:

- State transitions
- Assignment changes
- Disposition applications
- Consent changes
- DNC additions
- Contact attempts

## Service Locations

- **Lead Assignment**: `apps/api/src/modules/lead/lead-assignment.service.ts`
- **Dispositions**: `apps/api/src/modules/disposition/disposition.service.ts`
- **Callbacks**: `apps/api/src/modules/callback/callback.service.ts`
- **Consent**: `apps/api/src/modules/consent/consent.service.ts`
- **DNC**: `apps/api/src/modules/dnc/dnc.service.ts`
- **DNC Scrubbing**: `apps/api/src/modules/compliance/dnc-scrubbing.service.ts`
- **Attempt Tracking**: `apps/api/src/modules/attempt/attempt.service.ts`
