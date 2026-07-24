# 30 — Redis Design

**Document Control**

| Property | Value |
|----------|-------|
| Title | Redis Design |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the Redis design for the RDCS In-House Dialer Platform. Redis is used for caching, session management, real-time pub/sub, BullMQ job queues, and distributed state.

## 2. Redis Usage Patterns

| Pattern | Purpose | Redis Data Type |
|---------|---------|-----------------|
| Session Store | JWT refresh tokens, user sessions | Hash / String |
| Cache | API response cache, configuration cache | String / Hash |
| Rate Limiting | API and WebSocket rate limits | Sorted Set / Redis Cell |
| Pub/Sub | Real-time event distribution | Pub/Sub channels |
| Streams | Event sourcing and log aggregation | Redis Streams |
| Locks | Distributed locks for critical operations | Redlock / SET NX EX |
| Leaderboards | Agent performance, campaign metrics | Sorted Set |
| Presence | Agent online status | Hash / Set |
| Counters | Call counts, dial rate, queue depth | String (INCR) |
| Job Queues | BullMQ job storage | Redis Lists, Sets, Sorted Sets |

## 3. Redis Deployment

- **Development**: Single Redis container with AOF enabled.
- **Staging**: Redis Sentinel for HA.
- **Production**: Redis Cluster or managed Redis (ElastiCache, Redis Cloud) for scale and HA.

## 4. Key Naming Conventions

Keys follow the pattern:

```
{namespace}:{tenantId}:{resource}:{id}:{field}
```

Examples:
- `session:ten_abc:user:usr_123`
- `cache:ten_abc:campaign:list`
- `presence:ten_abc:agent:usr_123`
- `rate-limit:ten_abc:api:user:usr_123`
- `metrics:ten_abc:campaign:camp_001:calls`

## 5. Session Management

- Access tokens are short-lived JWTs (15 minutes).
- Refresh tokens stored in Redis with TTL (7 days or configurable).
- Session metadata: userId, tenantId, roles, ip, userAgent, lastActivity.
- On logout, refresh token and session keys deleted.
- Session list per user for multi-device revocation.

```
HSET session:ten_abc:user:usr_123 refreshToken <hash> userId usr_123 tenantId ten_abc roles "[agent]" lastActivity <timestamp>
EXPIRE session:ten_abc:user:usr_123 604800
```

## 6. Caching Strategy

### 6.1 Cache Layers

- **L1**: In-memory application cache (small, short-lived).
- **L2**: Redis cache for frequently accessed data.
- **L3**: PostgreSQL persistent storage.

### 6.2 Cache Invalidation

- Time-based expiration (TTL) for most caches.
- Event-based invalidation on domain events (e.g., campaign updated → invalidate campaign cache).
- Versioned cache keys for large objects.

### 6.3 Common Cache Objects

| Cache Key | TTL | Invalidation |
|-----------|-----|--------------|
| Campaign config | 5 min | Campaign update |
| User permissions | 15 min | Role/permission change |
| Lead lists | 1 min | Import/assignment |
| DNC bloom-like set | 10 min | DNC update |
| Dashboard metrics | 5 sec | Real-time update |
| Caller ID pool | 10 min | Campaign update |

## 7. Rate Limiting

- Per-tenant and per-user rate limits enforced in API Gateway and Redis.
- Sliding window using Redis Sorted Sets or `Redis-Cell` module.
- WebSocket connection limits per user and tenant.

```
ZADD rate-limit:ten_abc:api:user:usr_123 NX <timestamp> <timestamp>
ZREMRANGEBYSCORE rate-limit:ten_abc:api:user:usr_123 0 <timestamp - window>
ZCARD rate-limit:ten_abc:api:user:usr_123
EXPIRE rate-limit:ten_abc:api:user:usr_123 <window>
```

## 8. Real-Time Pub/Sub

### 8.1 Channels

- `events:tenant:{tenantId}`: Tenant-wide events.
- `events:dept:{departmentId}`: Department-scoped events.
- `events:agent:{agentId}`: Agent-specific events.
- `events:campaign:{campaignId}`: Campaign-specific events.
- `events:dashboard:{tenantId}`: Dashboard metric updates.

### 8.2 Subscribers

- Socket.IO gateway subscribes to tenant and department channels and routes to client rooms.
- Worker processes subscribe to relevant channels for event-driven actions.
- Real-time aggregation services subscribe to call events.

## 9. Presence & Agent Status

- Agent presence stored in Redis Hash with heartbeat.
- Key: `presence:ten_abc:agent:{agentId}`.
- Fields: `status`, `lastSeen`, `currentCallId`, `campaignId`, `socketId`.
- TTL set to 60 seconds; agent heartbeat refreshes TTL.
- Supervisor dashboards read presence from Redis.

```
HSET presence:ten_abc:agent:usr_123 status available lastSeen <ts> currentCallId null campaignId camp_001 socketId sock_1
EXPIRE presence:ten_abc:agent:usr_123 60
```

## 10. Counters & Metrics

- Real-time counters for calls, dials, answers, abandons.
- Counter keys reset or aggregated to persistent store periodically.
- Campaign-level metrics: `metrics:ten_abc:campaign:camp_001:{metric}`.

```
INCR metrics:ten_abc:campaign:camp_001:total_dials
INCR metrics:ten_abc:campaign:camp_001:answered_calls
HINCRBY metrics:ten_abc:agent:usr_123 talk_time 120
```

## 11. Distributed Locks

- Redlock algorithm for operations requiring single-process coordination.
- Used for:
  - Lead reservation to prevent double-dialing.
  - Pacing algorithm singleton.
  - Import job coordination.
  - Scheduled report generation.

```
SET lead:lock:ten_abc:lead_123 "owner_id" NX EX 30
```

## 12. Leaderboards / Sorted Sets

- Agent performance rankings: `leaderboard:ten_abc:agent:calls:today`.
- Campaign top performers: `leaderboard:ten_abc:campaign:camp_001:conversions`.
- Time-windowed using ZREMRANGEBYSCORE.

## 13. Redis Streams

Used for:
- Telephony event buffering before processing.
- Audit event streaming (optional).
- Cross-service event log for replay/debugging.

## 14. Persistence & Durability

- AOF enabled with `appendfsync everysec` for durability.
- RDB snapshots every 15 minutes for point-in-time recovery.
- Backups of Redis data to object storage for DR.

## 15. Eviction Policy

- `allkeys-lru` for cache keys.
- `volatile-lru` for keys with TTL.
- No eviction for queue and session data (ensure sufficient memory).
- Memory alerts and scaling when usage exceeds 80%.

## 16. Security

- Redis authentication required.
- TLS encryption for Redis connections in production.
- No sensitive data in Redis keys (use hashed identifiers).
- Keys restricted by application logic, not Redis ACLs initially (future: Redis ACLs per service).

## 17. Monitoring

- Memory usage, fragmentation, key count, eviction rate.
- Connected clients, blocked clients, commands per second.
- Hit/miss ratio for cache usage.
- Replication lag for Redis Sentinel/Cluster.
- Slow command log.

## 18. Redis Clustering

For production scale:
- Redis Cluster with 6 nodes (3 masters, 3 replicas) minimum.
- BullMQ compatible with Redis Cluster when using hash tags for queue keys.
- Pub/Sub works across cluster but has bandwidth considerations; use dedicated channels for high volume.

## 19. Redis Key Expiry Examples

```
EXPIRE session:ten_abc:user:usr_123 604800      # 7 days
EXPIRE cache:ten_abc:campaign:list 300            # 5 minutes
EXPIRE presence:ten_abc:agent:usr_123 60          # 60 seconds
EXPIRE rate-limit:ten_abc:api:user:usr_123 60     # 60 seconds
```

## 20. Migration to Managed Redis

- Use Redis Sentinel or Cluster for self-hosted HA.
- Managed Redis (ElastiCache, Redis Cloud) can be used with minimal code changes.
- Ensure connection string, TLS, and authentication settings are externalized.
