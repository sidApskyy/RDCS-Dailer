# API Response and Error Standards

**Version:** 1.0
**Last Updated:** 2025-01-XX
**Scope:** All RDCS Dialer Platform API endpoints

---

## Overview

This document defines the standard API response and error formats for the RDCS In-House Dialer Platform. All API endpoints must follow these standards to ensure consistency and predictability for API consumers.

---

## Standard Response Format

### Success Response

All successful API responses follow this format:

```typescript
{
  "success": true,
  "data": {}, // The actual response data
  "meta": {}, // Optional metadata
  "requestId": "uuid", // Request correlation ID
  "timestamp": "ISO-8601" // Response timestamp
}
```

**Fields:**
- `success`: Always `true` for successful responses
- `data`: The actual response payload (object, array, or primitive)
- `meta`: Optional metadata (pagination, counts, etc.)
- `requestId`: Unique request identifier for tracing
- `timestamp`: ISO-8601 timestamp of the response

### Example Success Response

```json
{
  "success": true,
  "data": {
    "id": "clm123abc",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "meta": {},
  "requestId": "req_abc123xyz",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Standard Error Response

All error responses follow this format:

```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE", // Machine-readable error code
    "message": "Human-readable error message",
    "details": [] // Optional error details
  },
  "requestId": "uuid",
  "timestamp": "ISO-8601"
}
```

**Fields:**
- `success`: Always `false` for error responses
- `error`: Error object containing code, message, and details
- `requestId`: Unique request identifier for tracing
- `timestamp`: ISO-8601 timestamp of the response

### Example Error Response

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID clm123abc not found",
    "details": [
      {
        "field": "userId",
        "value": "clm123abc"
      }
    ]
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Validation Error Response

Validation errors follow the error format with field-specific details:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address",
        "value": "invalid-email"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "value": "short"
      }
    ]
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Pagination Response

Paginated responses include pagination metadata:

```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrevious": false
    }
  },
  "requestId": "req_abc123xyz",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Pagination Fields:**
- `page`: Current page number (1-indexed)
- `limit`: Items per page
- `total`: Total number of items
- `totalPages`: Total number of pages
- `hasNext`: Whether there is a next page
- `hasPrevious`: Whether there is a previous page

---

## HTTP Status Code Mapping

### Success Codes
- `200 OK`: Successful GET, PUT, PATCH
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE (no response body)

### Client Error Codes
- `400 Bad Request`: Invalid request, validation error
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Valid authentication but insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate, state conflict)
- `422 Unprocessable Entity`: Semantic errors (business logic validation)
- `429 Too Many Requests`: Rate limit exceeded

### Server Error Codes
- `500 Internal Server Error`: Unexpected server error
- `502 Bad Gateway`: Upstream service error
- `503 Service Unavailable`: Service temporarily unavailable
- `504 Gateway Timeout`: Upstream service timeout

---

## Error Codes

### Authentication Errors
- `AUTH_MISSING`: Authentication required
- `AUTH_INVALID`: Invalid credentials
- `AUTH_EXPIRED`: Authentication expired
- `AUTH_REVOKED`: Authentication revoked

### Authorization Errors
- `FORBIDDEN`: Insufficient permissions
- `ROLE_REQUIRED`: Specific role required
- `PERMISSION_DENIED`: Permission denied

### Resource Errors
- `NOT_FOUND`: Resource not found
- `ALREADY_EXISTS`: Resource already exists
- `CONFLICT`: Resource conflict
- `LOCKED`: Resource is locked

### Validation Errors
- `VALIDATION_ERROR`: General validation error
- `INVALID_INPUT`: Invalid input format
- `MISSING_FIELD`: Required field missing
- `INVALID_FORMAT`: Invalid format for field

### Business Logic Errors
- `INVALID_STATE`: Invalid state for operation
- `OPERATION_NOT_ALLOWED`: Operation not allowed in current state
- `QUOTA_EXCEEDED`: Quota exceeded
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded

### System Errors
- `INTERNAL_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `TIMEOUT`: Operation timeout
- `UPSTREAM_ERROR`: Upstream service error

---

## Response Headers

### Standard Headers
- `Content-Type`: `application/json`
- `X-Request-ID`: Request correlation ID
- `X-API-Version`: API version (e.g., `1.0.0`)

### CORS Headers (if applicable)
- `Access-Control-Allow-Origin`: Configured origin
- `Access-Control-Allow-Methods`: Allowed methods
- `Access-Control-Allow-Headers`: Allowed headers

---

## Implementation

### Response Interceptor
A NestJS response interceptor wraps all responses in the standard format:

```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: data.meta || {},
        requestId: context.switchToHttp().getRequest().id,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### Exception Filter
A global exception filter converts exceptions to standard error responses:

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(exception),
        message: this.getErrorMessage(exception),
        details: this.getErrorDetails(exception),
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
```

---

## Best Practices

### Consistency
- Always use the standard response format
- Never return raw data without the wrapper
- Include requestId in all responses
- Use ISO-8601 for timestamps

### Error Handling
- Use appropriate HTTP status codes
- Provide clear, actionable error messages
- Include relevant error details
- Don't expose sensitive information in errors

### Validation
- Validate input before processing
- Return validation errors with field-level details
- Use class-validator for DTO validation
- Provide clear validation error messages

### Pagination
- Use consistent pagination parameters
- Return pagination metadata
- Support page and limit parameters
- Default to reasonable limits

---

## Versioning

API versioning is handled via URI versioning:
- Current version: `/api/v1/`
- Version included in response headers: `X-API-Version: 1.0.0`
- Breaking changes require new version

---

## Resources

- [NestJS Interceptors](https://docs.nestjs.com/interceptors)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
