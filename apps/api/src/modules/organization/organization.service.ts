import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export interface OrgHierarchyNode {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  children: OrgHierarchyNode[];
}

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationHierarchy(tenantId: string): Promise<OrgHierarchyNode[]> {
    const organizations = await this.prisma.organization.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });

    const orgMap = new Map<string, OrgHierarchyNode>();
    const roots: OrgHierarchyNode[] = [];

    for (const org of organizations) {
      orgMap.set(org.id, {
        id: org.id,
        name: org.name,
        type: org.type,
        parentId: org.parentId,
        children: [],
      });
    }

    for (const org of organizations) {
      const node = orgMap.get(org.id)!;
      if (org.parentId && orgMap.has(org.parentId)) {
        orgMap.get(org.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getUserOrganizationPath(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      return [];
    }

    const path: string[] = [];
    let currentOrg = user.organization;

    while (currentOrg) {
      path.unshift(currentOrg.id);
      if (currentOrg.parentId) {
        currentOrg = await this.prisma.organization.findUnique({
          where: { id: currentOrg.parentId },
        });
      } else {
        currentOrg = null;
      }
    }

    return path;
  }

  async isUserInOrganization(userId: string, organizationId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user || !user.organizationId) {
      return false;
    }

    if (user.organizationId === organizationId) {
      return true;
    }

    const userPath = await this.getUserOrganizationPath(userId);
    return userPath.includes(organizationId);
  }

  async getDescendantOrganizationIds(organizationId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue = [organizationId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      descendants.push(currentId);

      const children = await this.prisma.organization.findMany({
        where: { parentId: currentId, deletedAt: null },
        select: { id: true },
      });

      for (const child of children) {
        queue.push(child.id);
      }
    }

    return descendants;
  }

  async getOrganizationUsers(organizationId: string, includeDescendants = false): Promise<string[]> {
    if (includeDescendants) {
      const descendantIds = await this.getDescendantOrganizationIds(organizationId);
      const users = await this.prisma.user.findMany({
        where: {
          organizationId: { in: descendantIds },
          status: 'active',
          deletedAt: null,
        },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        status: 'active',
        deletedAt: null,
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
}
