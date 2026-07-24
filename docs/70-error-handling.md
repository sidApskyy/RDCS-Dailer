# 70 — Error Handling

**Document Control**

| Property | Value |
|----------|-------|
| Title | Error Handling |
| Version | 1.0.0 |
| Status | Draft |
| Author | Enterprise Architecture Team |
| Last Updated | 21-Jul-2026 |

---

## 1. Introduction

This document defines the error handling strategy for the RDCS In-House Dialer Platform. Robust error handling ensures system stability, clear user feedback, and easier debugging.

## 2. Error Handling Principles

- Fail fast and fail loudly in development.
- Handle errors gracefully in production.
- Use typed errors and avoid generic exceptions.
- Do not swallow exceptions; log and act appropriately.
- Never expose internal details or stack traces to clients.
- Provide actionable error messages.
- Ensure idempotency for retryable operations.

## 3. Error Types

### 3.1 Domain Errors

Business rule violations or invalid state transitions.

Examples:
- `CampaignCannotBeActivatedError`
- `LeadNotCallableError`
- `InvalidDispositionError`

### 3.2 Validation Errors

Input data does not meet schema or business constraints.

Examples:
- `ValidationError`
- `InvalidEmailFormatError`
- `MissingRequiredFieldError`

### 3.3 Authentication/Authorization Errors

User cannot be authenticated or lacks permission.

Examples:
- `UnauthorizedError`
- `ForbiddenError`
- `TokenExpiredError`
- `AccountLockedError`

### 3.4 Infrastructure Errors

External dependencies fail.

Examples:
- `DatabaseConnectionError`
- `RedisConnectionError`
- `TelephonyAdapterError`
- `StorageUploadError`
- `WebhookDeliveryError`

### 3.5 Not Found Errors

Requested resource does not exist.

Examples:
- `CampaignNotFoundError`
- `LeadNotFoundError`
- `CallNotFoundError`

### 3.6 Conflict Errors

Resource state conflicts with the requested operation.

Examples:
- `DuplicateCampaignError`
- `CallAlreadyInProgressError`
- `ConcurrentModificationError`

## 4. Result Pattern

Domain layer uses a `Result<T>` type to represent success or failure without throwing exceptions for expected business errors.

```typescript
export class Result<T> {
  private constructor(
    private readonly isSuccess: boolean,
    private readonly value?: T,
    private readonly error?: string,
  ) {}

  static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, value);
  }

  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }

  getValue(): T {
    if (!this.isSuccess) throw new Error('Cannot get value from a failed result');
    return this.value as T;
  }

  getError(): string | undefined {
    return this.error;
  }

  isFailure(): boolean {
    return !this.isSuccess;
  }
}
```

Usage:

```typescript
const result = campaign.activate();
if (result.isFailure()) {
  return Result.fail(result.getError());
}
```

## 5. Exception Handling

### 5.1 Application Layer

```typescript
@Injectable()
export class ActivateCampaignHandler {
  async execute(command: ActivateCampaignCommand): Promise<Result<void>> {
    try {
      const campaign = await this.repo.findById(command.campaignId);
      if (!campaign) return Result.fail('Campaign not found');
      return campaign.activate();
    } catch (error) {
      this.logger.error('Failed to activate campaign', { error, command });
      return Result.fail('Internal error');
    }
  }
}
```

### 5.2 Controller Layer

```typescript
@Controller('api/v1/campaigns')
export class CampaignController {
  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    const result = await this.commandBus.execute(new ActivateCampaignCommand(id));
    if (result.isFailure()) {
      throw new BadRequestException(result.getError());
    }
    return { data: { activated: true } };
  }
}
```

## 6. Global Exception Filter

Maps exceptions to standard HTTP responses.

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const code = this.mapExceptionToCode(exception);
    const message = this.mapExceptionToMessage(exception);

    response.status(status).json({
      data: null,
      meta: null,
      error: {
        code,
        message,
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
```

## 7. Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Permission denied |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| UNPROCESSABLE | 422 | Business rule violation |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | Dependency unavailable |

## 8. Logging Errors

- Use structured JSON logs.
- Include correlation ID, tenant ID, user ID.
- Include error code, message, and stack trace (internal only).
- Avoid logging sensitive data.
- Send unhandled exceptions to Sentry.

## 9. Retry and Circuit Breaker

- Retry transient failures with exponential backoff.
- Use circuit breakers for external services.
- Log retries and final failures.
- Move exhausted jobs to DLQ.

## 10. Frontend Error Handling

- API errors displayed as toast notifications.
- Form validation errors shown inline.
- 404/403 pages handled by Next.js error boundaries.
- Global error boundary catches unhandled errors and reports to Sentry.
- Network errors show retry options.

## 11. Error Handling in Background Jobs

- BullMQ jobs have retry configuration.
- Failed jobs move to DLQ after max retries.
- Job failures logged and alerted.
- Idempotency prevents duplicate side effects on retry.

## 12. Testing Error Handling

- Unit tests for domain error cases.
- Integration tests for API error responses.
- E2E tests for user-facing error messages.
- Load tests for graceful degradation under failure.

## 13. Best Practices

- Validate early at boundaries.
- Fail with specific, helpful messages.
- Use custom exception classes for different error categories.
- Don't catch exceptions you cannot handle.
- Always log unexpected errors.
- Ensure transactions roll back on unhandled errors where appropriate.
