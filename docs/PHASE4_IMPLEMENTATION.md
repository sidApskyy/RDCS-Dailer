# Phase 4 Implementation

## Backend

- Added `CallSession` and `AgentPresence` persistence.
- Added manual dial, cancel, get, list, disposition, and agent-status APIs.
- Added compliance-before-adapter orchestration.
- Added tenant-scoped queries and existing RBAC guards.
- Added audit event `call.created`.

## Adapter

The mock adapter emits dialing, ringing, connected, completed, and disposed events with artificial latency. Cancellation emits cancelled and disposed events.

## Frontend

Added the `/calls` preview dial screen, agent status control, manual dial button, current history list, and mock-provider indicator.
