import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface PermissionTuple {
  resource: string;
  action: string;
  scope: string;
}

export interface ResourceContext {
  resourceType: string;
  resourceId: string;
  ownerId?: string;
  organizationId?: string;
  departmentId?: string;
  teamId?: string;
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    tenantId: string,
    userId: string,
    required: PermissionTuple,
    resourceContext?: ResourceContext,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(tenantId, userId);
    return permissions.some((p) =>
      this.permissionMatches(p, required, resourceContext, userId),
    );
  }

  async hasTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true, status: true },
    });

    if (!user) return false;
    if (user.status !== 'active') return false;
    return user.tenantId === tenantId;
  }

  private async getUserPermissions(tenantId: string, userId: string): Promise<PermissionTuple[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user: { id: userId, tenantId } },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
    return userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => ({
        resource: rp.permission.resource,
        action: rp.permission.action,
        scope: rp.permission.scope,
      })),
    );
  }

  private permissionMatches(
    assigned: PermissionTuple,
    required: PermissionTuple,
    resourceContext?: ResourceContext,
    userId?: string,
  ): boolean {
    if (assigned.resource !== required.resource || assigned.action !== required.action) {
      return false;
    }

    if (!this.scopeSatisfies(assigned.scope, required.scope)) {
      return false;
    }

    if (assigned.scope === 'own' && resourceContext) {
      return resourceContext.ownerId === userId;
    }

    return true;
  }

  private scopeSatisfies(assigned: string, required: string): boolean {
    const hierarchy = ['own', 'team', 'department', 'organization', 'tenant', 'cross-tenant'];
    return hierarchy.indexOf(assigned) >= hierarchy.indexOf(required);
  }
}
