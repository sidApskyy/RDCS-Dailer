import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { RequestUser } from '../../modules/auth/strategies/jwt.strategy';

@Injectable()
export class TelephonyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as RequestUser | undefined;
    if (user?.tenantId && user?.userId) {
      return `${user.tenantId}:${user.userId}`;
    }
    return (req['ip'] as string) || 'anonymous';
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }
}
