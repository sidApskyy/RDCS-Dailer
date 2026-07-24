import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service';
import { RequestUser } from '../auth/strategies/jwt.strategy';

import { PERMISSIONS_KEY } from './decorators/require-permission.decorator';
import { RbacService, PermissionTuple } from './rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionTuple>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user || !user.userId || !user.tenantId) return false;

    const hasPermission = await this.rbac.hasPermission(user.tenantId, user.userId, required);

    if (!hasPermission) {
      await this.logAuthorizationDenial(user.tenantId, user.userId, required, request);
    }

    return hasPermission;
  }

  private async logAuthorizationDenial(
    tenantId: string,
    userId: string,
    required: PermissionTuple,
    request: any,
  ): Promise<void> {
    try {
      await this.prisma.audit.create({
        data: {
          tenantId,
          userId,
          action: 'auth.denied',
          resource: `${required.resource}.${required.action}`,
          resourceId: null,
          metadata: {
            requiredScope: required.scope,
            path: request.path,
            method: request.method,
          },
        },
      });
    } catch {
      // Silently fail to avoid breaking the guard
    }
  }
}
