# Phase 4 Architecture

Phase 4 introduces a provider-independent manual calling boundary.

## Boundaries

- `TelephonyAdapter` is the only telephony dependency of call business logic.
- `MockTelephonyAdapter` is the default provider and requires no external service.
- `TelephonyService` owns tenant validation, agent availability, compliance ordering, persistence, state transitions, audit logging, and adapter orchestration.
- `TelephonySocketService` authenticates Socket.IO connections with the existing JWT service and only emits events to tenant and agent rooms.
- The web call panel uses preview-first selection and an explicit manual dial action.

No predictive, power, progressive, AI, recording, whisper, barge, or conference behavior is included.
