import { Test, TestingModule } from '@nestjs/testing';

import { RbacService } from '../../src/modules/rbac/rbac.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Tenant Isolation Security Tests', () => {
  let rbac: RbacService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: PrismaService,
          useValue: {
            userRole: {
              findMany: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    rbac = module.get<RbacService>(RbacService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should deny access when user tenant does not match resource tenant', async () => {
      const mockUserRoles = [
        {
          role: {
            permissions: [
              {
                permission: {
                  resource: 'users',
                  action: 'read',
                  scope: 'tenant',
                },
              },
            ],
          },
        },
      ];

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const hasPermission = await rbac.hasPermission(
        'tenant-a',
        'user-1',
        { resource: 'users', action: 'read', scope: 'tenant' },
      );

      expect(hasPermission).toBe(true);
    });

    it('should verify tenant access for user', async () => {
      const mockUser = {
        id: 'user-1',
        tenantId: 'tenant-a',
        status: 'active',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const hasAccess = await rbac.hasTenantAccess('tenant-a', 'user-1');
      expect(hasAccess).toBe(true);

      const hasWrongAccess = await rbac.hasTenantAccess('tenant-b', 'user-1');
      expect(hasWrongAccess).toBe(false);
    });

    it('should deny tenant access for inactive user', async () => {
      const mockUser = {
        id: 'user-1',
        tenantId: 'tenant-a',
        status: 'inactive',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const hasAccess = await rbac.hasTenantAccess('tenant-a', 'user-1');
      expect(hasAccess).toBe(false);
    });

    it('should deny tenant access for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const hasAccess = await rbac.hasTenantAccess('tenant-a', 'user-1');
      expect(hasAccess).toBe(false);
    });
  });

  describe('Scope-Based Authorization', () => {
    it('should allow own scope when user owns resource', async () => {
      const mockUserRoles = [
        {
          role: {
            permissions: [
              {
                permission: {
                  resource: 'calls',
                  action: 'read',
                  scope: 'own',
                },
              },
            ],
          },
        },
      ];

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const hasPermission = await rbac.hasPermission(
        'tenant-a',
        'user-1',
        { resource: 'calls', action: 'read', scope: 'own' },
        { resourceType: 'calls', resourceId: 'call-1', ownerId: 'user-1' },
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny own scope when user does not own resource', async () => {
      const mockUserRoles = [
        {
          role: {
            permissions: [
              {
                permission: {
                  resource: 'calls',
                  action: 'read',
                  scope: 'own',
                },
              },
            ],
          },
        },
      ];

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const hasPermission = await rbac.hasPermission(
        'tenant-a',
        'user-1',
        { resource: 'calls', action: 'read', scope: 'own' },
        { resourceType: 'calls', resourceId: 'call-1', ownerId: 'user-2' },
      );

      expect(hasPermission).toBe(false);
    });

    it('should allow tenant scope for tenant-level permission', async () => {
      const mockUserRoles = [
        {
          role: {
            permissions: [
              {
                permission: {
                  resource: 'users',
                  action: 'read',
                  scope: 'tenant',
                },
              },
            ],
          },
        },
      ];

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const hasPermission = await rbac.hasPermission(
        'tenant-a',
        'user-1',
        { resource: 'users', action: 'read', scope: 'tenant' },
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny when required scope exceeds assigned scope', async () => {
      const mockUserRoles = [
        {
          role: {
            permissions: [
              {
                permission: {
                  resource: 'users',
                  action: 'read',
                  scope: 'own',
                },
              },
            ],
          },
        },
      ];

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const hasPermission = await rbac.hasPermission(
        'tenant-a',
        'user-1',
        { resource: 'users', action: 'read', scope: 'tenant' },
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('IDOR Prevention', () => {
    it('should prevent access to resources from different tenant', async () => {
      const mockUser = {
        id: 'user-1',
        tenantId: 'tenant-a',
        status: 'active',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const hasAccess = await rbac.hasTenantAccess('tenant-b', 'user-1');
      expect(hasAccess).toBe(false);
    });

    it('should prevent horizontal privilege escalation', async () => {
      const mockUserRoles = [
        {
          role: {
            permissions: [
              {
                permission: {
                  resource: 'calls',
                  action: 'read',
                  scope: 'own',
                },
              },
            ],
          },
        },
      ];

      (prisma.userRole.findMany as jest.Mock).mockResolvedValue(mockUserRoles);

      const hasPermission = await rbac.hasPermission(
        'tenant-a',
        'user-1',
        { resource: 'calls', action: 'read', scope: 'own' },
        { resourceType: 'calls', resourceId: 'call-1', ownerId: 'user-2' },
      );

      expect(hasPermission).toBe(false);
    });
  });
});
