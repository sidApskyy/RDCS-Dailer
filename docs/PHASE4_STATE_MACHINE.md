# Phase 4 State Machine

`idle -> queued -> dialing -> ringing -> connected -> completed -> disposed`

Terminal alternatives:

- `queued -> cancelled | timeout | failed`
- `dialing/ringing -> connected | busy | no_answer | failed | cancelled | timeout`
- `connected -> on_hold | completed | failed | cancelled`
- `on_hold -> connected | completed | failed | cancelled`
- `busy | failed | cancelled | no_answer | timeout -> disposed`

Illegal transitions throw and are not persisted. An active call is any queued, dialing, ringing, connected, or on-hold session.
