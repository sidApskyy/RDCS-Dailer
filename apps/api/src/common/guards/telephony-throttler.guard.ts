import { Injectable, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';

import { JwtPayload, RequestUser } from '../../modules/auth/strategies/jwt.strategy';

@Injectable()
export class TelephonyThrottlerGuard extends ThrottlerGuard {
  private readonly jwtService = new JwtService();

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as RequestUser | undefined;
    if (user?.tenantId && user?.userId) {
      return `${user.tenantId}:${user.userId}`;
    }

    // req.user is populated by JwtAuthGuard, which runs AFTER this global
    // guard. Decode the bearer token directly so requests from the same
    // tenant/agent share a tracker bucket instead of falling back to IP
    // (which would incorrectly pool unrelated tenants/agents together).
    const headers = req['headers'] as Record<string, string> | undefined;
    const authHeader = headers?.['authorization'] || headers?.['Authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length);
      const payload = this.jwtService.decode(token) as JwtPayload | null;
      if (payload?.sub && payload?.tenantId) {
        return `${payload.tenantId}:${payload.sub}`;
      }
    }

    return (req['ip'] as string) || 'anonymous';
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    const req = _context.switchToHttp().getRequest<Record<string, unknown>>();
    const headers = (req?.['headers'] as Record<string, string | undefined>) || {};
    if ((process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') && (headers['x-test-skip-throttle'] === '1' || headers['X-Test-Skip-Throttle'] === '1')) {
      return true;
    }
    return false;
  }
}
