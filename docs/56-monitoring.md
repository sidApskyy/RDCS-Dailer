# 56 — Monitoring

**Document Control**

| Property | Value |
|----------|-------|
| Title | Monitoring |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the monitoring strategy for the RDCS In-House Dialer Platform. Monitoring covers infrastructure, application, business, and telephony metrics.

## 2. Monitoring Stack

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection and storage |
| Grafana | Visualization and dashboards |
| Loki | Log aggregation |
| Promtail | Log shipping from containers/hosts |
| Sentry | Application error tracking |
| Node Exporter | Host OS metrics |
| Cloudflare Analytics | Edge/WAF metrics |
| Uptime Kuma / Blackbox | External health checks |

## 3. Metrics Categories

### 3.1 Infrastructure Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| CPU utilization | Node Exporter | > 80% for 5 min |
| Memory utilization | Node Exporter | > 85% for 5 min |
| Disk usage | Node Exporter | > 80% warning, > 90% critical |
| Network throughput | Node Exporter | Anomaly |
| Docker container health | cAdvisor / Docker | Container down |
| Nginx request rate | Nginx / Prometheus | Anomaly |

### 3.2 Database Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Active connections | PostgreSQL exporter | > 80% of max |
| Replication lag | PostgreSQL exporter | > 30 seconds |
| Query latency p95 | PostgreSQL exporter | > 500ms |
| Dead tuples / bloat | PostgreSQL exporter | > 20% |
| Transaction rate | PostgreSQL exporter | Anomaly |
| Lock waits | PostgreSQL exporter | > 5 seconds |

### 3.3 Redis Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Memory usage | Redis exporter | > 80% |
| Connected clients | Redis exporter | > 80% of max |
| Hit/miss ratio | Redis exporter | < 80% |
| Evicted keys | Redis exporter | > 0 (investigate) |
| Replication lag | Redis exporter | > 1 second |
| Queue depth | BullMQ exporter | Per queue threshold |

### 3.4 Application Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API request rate | NestJS Prometheus | Baseline |
| API latency p95 | NestJS Prometheus | > 100ms |
| API error rate | NestJS Prometheus | > 1% |
| WebSocket connections | Socket.IO | > threshold |
| WebSocket event latency | Custom | > 500ms |
| JWT validation failures | Custom | Spike |
| Permission denials | Custom | Spike |

### 3.5 Business Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Calls in progress | Custom | Campaign threshold |
| Abandon rate | Custom | > 3% |
| Connection rate | Custom | Drop > 20% |
| Dialer queue depth | Custom | > threshold |
| Lead import failures | Custom | > 5% |
| Webhook failure rate | Custom | > 10% |
| AI job failure rate | Custom | > 5% |

### 3.6 Telephony Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Active Asterisk channels | Asterisk exporter | Capacity threshold |
| SIP trunk status | Asterisk exporter | Trunk down |
| RTP quality (packet loss, jitter) | Asterisk | Degraded |
| AMD detection rate | Custom | Anomaly |
| Adapter event latency | Custom | > 500ms |
| Recording upload failures | Custom | > 5% |

## 4. Dashboards

### 4.1 Infrastructure Dashboard

- Server CPU, memory, disk, network.
- Container health and resource usage.
- Nginx traffic and errors.

### 4.2 Database Dashboard

- Connections, replication, query latency.
- Index usage, bloat, vacuum status.
- Backup status.

### 4.3 Application Dashboard

- API request rate, latency, errors.
- WebSocket connections and events.
- Queue depths and worker throughput.

### 4.4 Business Dashboard

- Live calls, agents, campaigns.
- Connection rate, abandon rate, handle time.
- Lead import and AI job status.

### 4.5 Telephony Dashboard

- Asterisk channels, trunks, recordings.
- Adapter health, event latency.
- SIP quality metrics.

## 5. Alerting

- Alertmanager routes alerts by severity.
- Channels: PagerDuty (critical), Slack (warning), Email (info).
- Alert grouping and inhibition to reduce noise.
- Runbooks linked to alert definitions.
- On-call rotation defined.

## 6. Log Aggregation

- All containers and hosts ship logs to Loki.
- JSON structured logs with correlation IDs.
- Log labels: service, tenant, level, requestId.
- Retention: 30 days for application logs, 7 days for system logs.
- Sensitive fields redacted.

## 7. Error Tracking

- Sentry captures unhandled exceptions.
- Error grouped by stack trace and release.
- Sentry releases correlate with deployments.
- Alerts on error rate spikes and new errors.

## 8. Health Checks

- `/health` — basic liveness.
- `/health/ready` — readiness including DB, Redis connectivity.
- `/health/live` — liveness only.
- Telephony adapter health checks.
- External uptime checks via blackbox exporter.

## 9. Synthetic Monitoring

- Periodic probes of critical API endpoints.
- Login flow checks.
- WebSocket connection checks.
- Call origination smoke tests in staging.

## 10. Capacity Planning

- Metrics used to trigger scaling.
- API/worker autoscaling based on CPU and queue depth.
- Telephony scaling based on active channels.
- Database scaling based on connections and latency.

## 11. Incident Response Integration

- Alerts include severity, affected service, and runbook link.
- Deployment events sent to monitoring for correlation.
- Error spikes trigger automatic rollback consideration.
- Post-incident review uses monitoring data.

## 12. Monitoring Security

- Monitoring endpoints IP-restricted or authenticated.
- Grafana uses SSO/role-based access.
- Logs do not contain secrets or PII beyond necessary.
- Audit access to monitoring dashboards.
