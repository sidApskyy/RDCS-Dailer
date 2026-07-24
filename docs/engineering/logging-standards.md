# Logging Standards

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform services

---

## Overview

This document defines the logging standards for the RDCS In-House Dialer Platform. All services must follow these standards to ensure consistent, machine-readable logs that support debugging, monitoring, and observability.

---

## Log Levels

### Error
**Use when:** An error occurred that prevented an operation from completing
**Examples:**
- Database connection failed
- External API call failed
- Job processing failed
- Unhandled exception

```typescript
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  requestId: request.id,
});
```

### Warn
**Use when:** Something unexpected happened but the operation continued
**Examples:**
- Deprecated API usage
- Retrying an operation
- Missing optional configuration
- Slow operation detected

```typescript
logger.warn('External API slow response', {
  url: 'https://api.example.com',
  duration: 5000,
  requestId: request.id,
});
```

### Info
**Use when:** Normal operation milestones
**Examples:**
- Service started
- Request received
- Job started
- User action completed

```typescript
logger.info('User logged in', {
  userId: user.id,
  requestId: request.id,
});
```

### Debug
**Use when:** Detailed diagnostic information for troubleshooting
**Examples:**
- Function entry/exit
- Variable values
- Intermediate states
- Loop iterations

```typescript
logger.debug('Processing user data', {
  userId: user.id,
  step: 'validation',
  requestId: request.id,
});
```

### Verbose
**Use when:** Very detailed information (rarely used)
**Examples:**
- Detailed algorithm steps
- Internal state changes
- Performance metrics

---

## Required Log Fields

All log entries must include these fields:

- **timestamp:** ISO-8601 timestamp (automatically added by Winston)
- **level:** Log level (error, warn, info, debug, verbose)
- **service:** Service name (api, worker, socket)
- **message:** Human-readable log message
- **requestId:** Request correlation ID (if applicable)
- **context:** NestJS module or function context (if applicable)

### Example Log Entry
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "service": "api",
  "message": "User logged in",
  "requestId": "req_1705312800000_abc1234",
  "context": "AuthService",
  "userId": "clm123abc"
}
```

---

## Sensitive Data

### Never Log
- **Passwords:** Never log passwords, even hashed
- **Tokens:** Never log JWT tokens, API keys, access tokens
- **Secrets:** Never log secrets, private keys
- **Credit Card Numbers:** Never log credit card numbers
- **SSN:** Never log social security numbers
- **PII:** Never log personally identifiable information unless necessary

### Automatic Filtering
The logger automatically filters sensitive fields:
- `password`
- `token`
- `secret`
- `apiKey`
- `creditCard`

These fields are replaced with `[REDACTED]` in logs.

### Manual Redaction
If logging potentially sensitive data, manually redact:
```typescript
logger.info('User data processed', {
  userId: user.id,
  email: user.email, // OK if not sensitive
  phoneNumber: this.redactPhone(user.phoneNumber), // Manual redaction
});
```

---

## Environment-Specific Logging

### Development
- **Format:** Human-readable with colors
- **Level:** Debug (verbose logging)
- **Output:** Console only
- **Purpose:** Easy local debugging

### Production
- **Format:** JSON (machine-readable)
- **Level:** Info (important events only)
- **Output:** Console + rotating log files
- **Purpose:** Log aggregation and analysis

### Log Rotation (Production)
- **Error logs:** `logs/error-YYYY-MM-DD.log`
- **Combined logs:** `logs/combined-YYYY-MM-DD.log`
- **Max size:** 20MB per file
- **Retention:** 14 days
- **Compression:** Automatic

---

## Request Correlation

### API Requests
Include `requestId` in all log entries:
```typescript
logger.info('Processing request', {
  requestId: request.id,
  method: request.method,
  path: request.path,
});
```

### Worker Jobs
Include `jobId` and `requestId` in all log entries:
```typescript
logger.info('Processing job', {
  requestId: job.data.requestId,
  jobId: job.id,
  queue: job.queue.name,
});
```

### Socket Events
Include `socketId` and `requestId` in all log entries:
```typescript
logger.info('Socket event received', {
  requestId: generatedId,
  socketId: socket.id,
  event: eventName,
});
```

---

## Best Practices

### Log at Appropriate Levels
- Use `error` for actual errors
- Use `warn` for warnings
- Use `info` for normal operations
- Use `debug` for detailed diagnostics
- Don't log at `error` level for expected conditions

### Include Context
Always include relevant context in log entries:
```typescript
logger.error('User creation failed', {
  email: user.email,
  error: error.message,
  requestId: request.id,
});
```

### Avoid Excessive Logging
- Don't log every loop iteration
- Don't log at debug level in production
- Don't log the same information repeatedly
- Use debug level for detailed diagnostics

### Use Structured Data
Log structured objects, not concatenated strings:
```typescript
// Good
logger.info('User logged in', { userId: user.id, email: user.email });

// Bad
logger.info(`User logged in: ${user.id} - ${user.email}`);
```

### Log Errors with Stack Traces
Always include stack traces for errors:
```typescript
logger.error('Database query failed', {
  error: error.message,
  stack: error.stack,
  query: sql,
  requestId: request.id,
});
```

---

## Service-Specific Guidelines

### API Service
- Log all incoming requests at info level
- Log all outgoing responses at debug level
- Log all errors with request context
- Include requestId in all logs
- Log validation errors at warn level

### Worker Service
- Log job start at info level
- Log job completion at info level
- Log job failures at error level
- Include jobId and requestId in all logs
- Log retry attempts at warn level

### Socket Service
- Log socket connections at info level
- Log socket disconnections at info level
- Log socket errors at error level
- Include socketId in all logs
- Log important events at info level

---

## Log Aggregation

### Recommended Tools
- **ELK Stack:** Elasticsearch, Logstash, Kibana
- **Datadog:** Cloud-based log aggregation
- **Splunk:** Enterprise log management
- **Grafana Loki:** Grafana-native log aggregation

### Log Querying
Use structured fields for querying:
- Filter by `service`: `service:api`
- Filter by `level`: `level:error`
- Filter by `requestId`: `requestId:req_abc123`
- Filter by time range: `@timestamp:[now-1h TO now]`

### Alerting
Set up alerts for:
- High error rate (> 10 errors/minute)
- Service downtime (no logs for 5 minutes)
- Critical errors (level:error with specific codes)
- Unusual patterns (spikes in log volume)

---

## Performance Considerations

### Synchronous Logging
- Avoid synchronous logging in hot paths
- Use async logging where possible
- Winston is async by default

### Log Volume
- Monitor log volume in production
- Adjust log levels based on traffic
- Use sampling for high-volume events
- Consider log aggregation costs

### Log Format
- JSON format is more efficient for parsing
- Human-readable format is for development only
- Avoid expensive string formatting in production

---

## Troubleshooting

### Logs Not Appearing
1. Check log level configuration
2. Check transport configuration
3. Check file permissions
4. Check disk space

### Logs Not Rotating
1. Check file size configuration
2. Check file permissions
3. Check disk space
4. Check winston-daily-rotate-file configuration

### Logs Not in JSON
1. Check NODE_ENV environment variable
2. Check format configuration
3. Check transport configuration

---

## Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)
- [Structured Logging Best Practices](https://www.elastic.co/guide/en/ecs/ecs-logging.html)
