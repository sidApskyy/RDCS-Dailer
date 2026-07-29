# Phase 4 API Reference

All routes are tenant-scoped and require JWT authentication plus the calls RBAC resource.

- `POST /api/v1/calls/manual-dial` — validates agent, lead, phone, campaign, DNC, consent, calling window, timezone, then starts one manual call.
- `DELETE /api/v1/calls/:id` — cancels an active call owned by the authenticated agent.
- `GET /api/v1/calls/:id` — retrieves an owned call session.
- `GET /api/v1/calls` — paginated call history for the authenticated agent.
- `POST /api/v1/calls/:id/disposition` — atomically applies one disposition to a terminal call and returns the agent to available.
- `PUT /api/v1/calls/agent/status` — sets offline, available, paused, or wrap-up; busy states are lifecycle-managed.
- `GET /api/v1/calls/agent/status` — reads the authenticated agent presence.

Socket events: `call.created`, `call.dialing`, `call.ringing`, `call.connected`, `call.completed`, `call.failed`, `call.cancelled`, `call.disposed`, and `agent.status_changed`.
