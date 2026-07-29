# Phase 4 Security Review

## Controls

- JWT authentication protects REST and Socket.IO.
- Tenant IDs are derived from authenticated user context, not request bodies.
- Call reads, cancellation, listing, and disposition use tenant and agent ownership checks.
- RBAC metadata is enforced by `PermissionsGuard`.
- Compliance is checked server-side before adapter invocation.
- Agent claiming uses a serializable transaction and conditional `available -> busy` update.
- Lifecycle events are serialized per call to prevent concurrent state corruption.
- Socket connections join only authenticated tenant and agent rooms.

## Remaining verification

Cross-tenant REST, RBAC scope, Socket.IO room isolation, rate limiting, and concurrent database tests require CI service execution. Phase 4 is blocked until those tests pass.
