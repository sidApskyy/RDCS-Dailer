import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

import { RequestUser } from '../../modules/auth/strategies/jwt.strategy';
import { RbacService } from '../../modules/rbac/rbac.service';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private readonly rbac: RbacService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user || !user.tenantId) {
      return false;
    }

    const hasAccess = await this.rbac.hasTenantAccess(user.tenantId, user.userId);

    if (!hasAccess) {
      throw new ForbiddenException('Tenant access denied');
    }

    return true;
  }
}
