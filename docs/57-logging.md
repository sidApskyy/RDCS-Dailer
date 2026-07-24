# 57 — Logging

**Document Control**

| Property | Value |
|----------|-------|
| Title | Logging |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the logging strategy for the RDCS In-House Dialer Platform. Logging provides observability, debugging, audit support, and compliance evidence.

## 2. Logging Principles

- Structured JSON logs for machine parsing.
- Correlation IDs across all services and requests.
- Consistent log levels.
- No sensitive data (passwords, tokens, PII) in logs.
- Centralized log aggregation with Loki.
- Retention policies per log type.

## 3. Log Levels

| Level | Use |
|-------|-----|
| TRACE | Very detailed development debugging (rare in production) |
| DEBUG | Detailed diagnostic information |
| INFO | Normal operational events |
| WARN | Potential issues requiring attention |
| ERROR | Errors affecting functionality |
| FATAL | Critical failures requiring immediate action |

## 4. Log Format

```json
{
  "timestamp": "2026-07-21T10:00:00.000Z",
  "level": "INFO",
  "service": "rdcs-api",
  "correlationId": "corr_abc123",
  "tenantId": "ten_abc123",
  "userId": "usr_123",
  "requestId": "req_abc123",
  "message": "Campaign activated",
  "context": {
    "campaignId": "camp_456",
    "action": "activate",
    "ip": "203.0.113.1"
  }
}
```

## 5. Required Log Fields

- `timestamp`: ISO 8601 UTC.
- `level`: Log level.
- `service`: Service name.
- `correlationId`: Trace/request correlation ID.
- `message`: Human-readable description.
- `tenantId`, `userId`: Context where applicable.
- `requestId`: HTTP/WebSocket request ID.
- `context`: Additional structured context.

## 6. Log Categories

### 6.1 Application Logs

- Request/response summary (method, path, status, duration).
- Service method calls and outcomes.
- Domain event processing.
- Background job execution.
- Errors and stack traces.

### 6.2 Access Logs

- Nginx access logs in JSON format.
- Includes: client IP, method, path, status, bytes, response time, tenant domain.
- Excludes sensitive query parameters.

### 6.3 Audit Logs

- See `42-internal-event-documentation.md` and `44-notification-flow.md`.
- Stored in immutable `audits` table.
- All data mutations, auth events, permission changes, exports.

### 6.4 Security Logs

- Failed login attempts.
- Authorization denials.
- Rate limit breaches.
- Suspicious IP activity.
- Secret access and rotation.

### 6.5 Telephony Logs

- Asterisk CDR/CEL.
- Adapter events and errors.
- SIP trunk status changes.
- Recording upload events.

### 6.6 System Logs

- OS-level events.
- Docker daemon logs.
- Cron job output.
- Backup job logs.

## 7. Correlation ID Propagation

1. Nginx or API gateway generates correlation ID.
2. Correlation ID passed to all downstream API calls via header.
3. Correlation ID included in Redis/BullMQ job payloads.
4. Correlation ID included in telephony adapter events.
5. Frontend includes correlation ID in support requests.

## 8. Sensitive Data Redaction

Redact or mask the following in logs:
- Passwords, tokens, secrets.
- Credit card numbers, SSNs.
- Full phone numbers (last 4 digits may be retained for support).
- API keys and webhook secrets.
- MFA secrets.
- Recording URLs (log metadata only, not signed tokens).

## 9. Centralized Logging

- Promtail ships container logs to Loki.
- Host logs collected via journald or file tailing.
- Nginx logs shipped to Loki.
- Loki retention: 30 days application logs, 7 days system logs.
- Audit logs retained in PostgreSQL for 7 years.

## 10. Log-Based Alerting

- Error rate spikes via Loki alert rules.
- Specific error patterns (e.g., adapter disconnect, upload failure).
- Security event patterns (e.g., repeated 403s, failed logins).
- Log volume anomalies.

## 11. Log Retention

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application logs | 30 days | Loki |
| Nginx access logs | 30 days | Loki |
| System logs | 7 days | Loki |
| Security logs | 1 year | Loki + cold storage |
| Audit logs | 7 years | PostgreSQL + archive |
| Telephony CDR/CEL | 7 years | PostgreSQL + archive |

## 12. Debugging & Troubleshooting

- Enable DEBUG level per service via environment variable.
- Use correlation ID to trace full request flow.
- Query logs in Grafana by tenant, user, request ID, or service.
- Distributed tracing (OpenTelemetry) added in future for deeper visibility.

## 13. Log Performance

- Asynchronous logging to avoid blocking request handling.
- Buffering and batching for log shipping.
- Sampling for high-volume debug logs in production.
- Separate log streams for high-volume telephony events.

## 14. Compliance

- Logs are tamper-evident for audit and security logs.
- Access to logs restricted to authorized personnel.
- Retention policies satisfy legal and regulatory requirements.
- Export capability for audit and forensic investigation.
