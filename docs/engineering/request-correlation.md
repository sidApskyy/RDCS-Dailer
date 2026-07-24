# Request Correlation

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform services

---

## Overview

Request correlation is a mechanism to trace a single request across multiple services in a distributed system. Each request is assigned a unique identifier that is propagated through logs, errors, and downstream operations.

---

## Request ID Format

Request IDs follow this format:
```
req_<timestamp>_<random>
```

**Example:** `req_1705312800000_abc1234`

- `req_`: Prefix to identify as a request ID
- `<timestamp>`: Unix timestamp in milliseconds
- `<random>`: 7-character random string for uniqueness

---

## Request ID Generation

### API Requests
- **Middleware:** `CorrelationMiddleware` in `apps/api/src/common/middleware/correlation.middleware.ts`
- **Header:** `X-Request-ID`
- **Behavior:**
  - If `X-Request-ID` header is present, use it (trusted from upstream)
  - If not present, generate a new ID
  - Add ID to `request.id` property
  - Return ID in `X-Request-ID` response header

### Worker Jobs
- **Generation:** Generate new ID when job is created
- **Propagation:** Include in job data
- **Context:** Add to all log entries

### Socket Events
- **Generation:** Generate new ID per socket event
- **Propagation:** Include in event payload
- **Context:** Add to all log entries

---

## Propagation

### HTTP Requests
When making HTTP calls to other services:
```typescript
const headers = {
  'X-Request-ID': request.id,
};
```

### BullMQ Jobs
When adding jobs to the queue:
```typescript
await queue.add('job-name', data, {
  jobId: request.id,
  data: { ...data, requestId: request.id },
});
```

### Redis Pub/Sub
When publishing messages:
```typescript
pubClient.publish('channel', JSON.stringify({
  ...message,
  requestId: request.id,
}));
```

### WebSocket Events
When emitting socket events:
```typescript
io.emit('event-name', {
  ...data,
  requestId: request.id,
});
```

---

## Logging

### API Logs
Include request ID in all log entries:
```typescript
logger.info('User logged in', {
  requestId: request.id,
  userId: user.id,
});
```

### Worker Logs
Include job ID and request ID:
```typescript
logger.info('Processing job', {
  requestId: job.data.requestId,
  jobId: job.id,
  queue: job.queue.name,
});
```

### Socket Logs
Include socket ID and request ID:
```typescript
logger.info('Socket connected', {
  requestId: generatedId,
  socketId: socket.id,
});
```

---

## Error Handling

### API Errors
Include request ID in error responses:
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  },
  "requestId": "req_1705312800000_abc1234",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Worker Errors
Include request ID in error logs:
```typescript
logger.error('Job failed', {
  requestId: job.data.requestId,
  error: error.message,
  stack: error.stack,
});
```

---

## Trusted Request IDs

When receiving a request ID from an upstream service:
- **Trust internal services:** If the request comes from another RDCS service, trust the ID
- **Verify external services:** If the request comes from an external system, validate the format
- **Generate if invalid:** If the ID is invalid or missing, generate a new one

---

## Implementation Details

### API Middleware
```typescript
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string;
    req.id = requestId || this.generateRequestId();
    res.setHeader('X-Request-ID', req.id);
    next();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
```

### Response Interceptor
```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id || this.generateRequestId();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: data.meta || {},
        requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### Exception Filter
```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const errorResponse = {
      success: false,
      error: { /* ... */ },
      requestId: request.id || this.generateRequestId(),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
```

---

## Debugging

### Tracing a Request
1. Extract the request ID from the response header or logs
2. Search logs for the request ID across all services
3. Follow the request through API → Worker → Socket → Database
4. Identify where the request failed or had unexpected behavior

### Log Aggregation
When using log aggregation tools (e.g., ELK, Datadog):
- Filter by `requestId` field
- Correlate logs across services
- Build request timelines
- Identify performance bottlenecks

---

## Best Practices

### Always Include Request ID
- Include in all log entries
- Include in all error responses
- Include in all downstream operations
- Include in all database queries (as comment)

### Never Generate Multiple IDs
- Use the same ID throughout the request lifecycle
- Don't generate new IDs for sub-operations
- Propagate the original ID to all downstream calls

### Validate External Request IDs
- Check format before trusting
- Generate new ID if invalid
- Log when ID is replaced

### Don't Expose Sensitive Data
- Request ID should not contain sensitive information
- Don't include user data in the ID
- Don't include business data in the ID

---

## Monitoring

### Metrics to Track
- Request ID generation rate
- Request ID propagation success rate
- Requests without correlation IDs
- Request ID format validation failures

### Alerts
- High rate of missing request IDs
- High rate of invalid request IDs
- Request ID propagation failures

---

## Resources

- [Correlation IDs in Microservices](https://medium.com/@brendanduke/correlation-ids-in-microservices-d069b9b9a69f)
- [Distributed Tracing](https://opentelemetry.io/docs/concepts/observability-primer/distributed-tracing/)
