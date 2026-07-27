# Phase 4 API

All routes require JWT authentication, tenant isolation, and the calls permission resource.

- `POST /api/v1/calls/manual-dial` — `{ leadId, phoneNumber, campaignId? }`
- `DELETE /api/v1/calls/:id` — cancel an active call
- `GET /api/v1/calls/:id` — get a tenant-scoped call
- `GET /api/v1/calls` — list the current agent's calls
- `POST /api/v1/calls/:id/disposition` — apply a disposition after termination
- `PUT /api/v1/calls/agent/status` — change availability
- `GET /api/v1/calls/agent/status` — read availability

Manual dial validates lead ownership, phone ownership, campaign ownership, agent availability, duplicate active calls, and compliance before invoking the adapter.
