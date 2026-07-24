import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id || this.generateRequestId();

    return next.handle().pipe(
      map((data) => {
        // If data already has the standard format, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Extract meta if present in data
        const meta = data?.meta || {};

        // Remove meta from data if it was extracted
        const responseData = data?.meta ? { ...data, meta: undefined } : data;

        return {
          success: true,
          data: responseData,
          meta,
          requestId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
