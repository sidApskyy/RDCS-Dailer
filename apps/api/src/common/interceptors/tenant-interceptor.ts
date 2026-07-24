import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequestUser } from '../../modules/auth/strategies/jwt.strategy';

interface TenantRequest {
  user?: RequestUser;
  tenantId?: string;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest() as TenantRequest;
    const user = request.user;

    if (user && user.tenantId) {
      request.tenantId = user.tenantId;
    }

    return next.handle();
  }
}
