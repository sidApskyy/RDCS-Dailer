# Phase 4 Final Architecture

Phase 4 provides a provider-independent manual calling foundation. `TelephonyService` owns tenant-scoped validation, compliance gating, transactional agent claiming, call persistence, lifecycle state validation, attempt linkage, audit logging, and adapter orchestration. `TelephonyAdapter` is the only provider boundary.

`MockTelephonyAdapter` is the default deterministic provider for development and CI. It supports configurable outcome and latency without external telephony infrastructure.

Socket.IO authenticates through the existing JWT service and emits only to tenant and agent rooms. REST routes use JWT, tenant isolation, and RBAC guards.

Phase 4 deliberately excludes predictive, power, progressive, automatic, SIP, carrier, ViciDial, Asterisk, FreeSWITCH, recording, and AI voice functionality.
