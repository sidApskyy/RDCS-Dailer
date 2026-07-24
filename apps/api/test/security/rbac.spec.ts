import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RbacService } from '../../src/modules/rbac/rbac.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { testDb, testAuth } from '../setup';

describe('RBAC Security Tests', () => {
  let rbac: RbacService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, RbacService],
    }).compile();

    rbac = module.get<RbacService>(RbacService);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testDb.clean();
  });

  describe('Permission Checks', () => {
    it('should grant permission when user has required role', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const role = await testDb.seedRole({
        id: 'role-admin',
        name: 'Admin',
        description: 'Administrator role',
        tenantId: tenant.id,
      });

      const permission = await testDb.seedPermission({
        id: 'perm-campaigns-create',
        resource: 'campaigns',
        action: 'create',
        scope: 'tenant',
        tenantId: tenant.id,
      });

      await testDb.seedUserRole({ userId: user.id, roleId: role.id });
      await testDb.seedRolePermission({ roleId: role.id, permissionId: permission.id });

      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'campaigns', action: 'create', scope: 'tenant' },
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny permission when user lacks required role', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'campaigns', action: 'create', scope: 'tenant' },
      );

      expect(hasPermission).toBe(false);
    });

    it('should deny permission when scope is insufficient', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const role = await testDb.seedRole({
        id: 'role-user',
        name: 'User',
        description: 'Standard user role',
        tenantId: tenant.id,
      });

      const permission = await testDb.seedPermission({
        id: 'perm-campaigns-read-own',
        resource: 'campaigns',
        action: 'read',
        scope: 'own',
        tenantId: tenant.id,
      });

      await testDb.seedUserRole({ userId: user.id, roleId: role.id });
      await testDb.seedRolePermission({ roleId: role.id, permissionId: permission.id });

      // User has 'own' scope but requesting 'tenant' scope
      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'campaigns', action: 'read', scope: 'tenant' },
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('Scope-Based Access Control', () => {
    it('should allow own scope when user owns resource', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const role = await testDb.seedRole({
        id: 'role-user',
        name: 'User',
        description: 'Standard user role',
        tenantId: tenant.id,
      });

      const permission = await testDb.seedPermission({
        id: 'perm-leads-read-own',
        resource: 'leads',
        action: 'read',
        scope: 'own',
        tenantId: tenant.id,
      });

      await testDb.seedUserRole({ userId: user.id, roleId: role.id });
      await testDb.seedRolePermission({ roleId: role.id, permissionId: permission.id });

      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'leads', action: 'read', scope: 'own' },
        { resourceType: 'leads', resourceId: 'lead-1', ownerId: user.id },
      );

      expect(hasPermission).toBe(true);
    });

    it('should deny own scope when user does not own resource', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const role = await testDb.seedRole({
        id: 'role-user',
        name: 'User',
        description: 'Standard user role',
        tenantId: tenant.id,
      });

      const permission = await testDb.seedPermission({
        id: 'perm-leads-read-own',
        resource: 'leads',
        action: 'read',
        scope: 'own',
        tenantId: tenant.id,
      });

      await testDb.seedUserRole({ userId: user.id, roleId: role.id });
      await testDb.seedRolePermission({ roleId: role.id, permissionId: permission.id });

      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'leads', action: 'read', scope: 'own' },
        { resourceType: 'leads', resourceId: 'lead-1', ownerId: 'user-2' },
      );

      expect(hasPermission).toBe(false);
    });
  });

  describe('Privilege Escalation Prevention', () => {
    it('should prevent horizontal privilege escalation', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const role = await testDb.seedRole({
        id: 'role-user',
        name: 'User',
        description: 'Standard user role',
        tenantId: tenant.id,
      });

      const permission = await testDb.seedPermission({
        id: 'perm-leads-read-own',
        resource: 'leads',
        action: 'read',
        scope: 'own',
        tenantId: tenant.id,
      });

      await testDb.seedUserRole({ userId: user.id, roleId: role.id });
      await testDb.seedRolePermission({ roleId: role.id, permissionId: permission.id });

      // User should not be able to access another user's leads
      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'leads', action: 'read', scope: 'own' },
        { resourceType: 'leads', resourceId: 'lead-1', ownerId: 'user-2' },
      );

      expect(hasPermission).toBe(false);
    });

    it('should prevent vertical privilege escalation', async () => {
      const tenant = await testDb.seedTenant({
        id: 'tenant-1',
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      const user = await testDb.seedUser({
        id: 'user-1',
        tenantId: tenant.id,
        email: 'test@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const role = await testDb.seedRole({
        id: 'role-user',
        name: 'User',
        description: 'Standard user role',
        tenantId: tenant.id,
      });

      const permission = await testDb.seedPermission({
        id: 'perm-leads-read-own',
        resource: 'leads',
        action: 'read',
        scope: 'own',
        tenantId: tenant.id,
      });

      await testDb.seedUserRole({ userId: user.id, roleId: role.id });
      await testDb.seedRolePermission({ roleId: role.id, permissionId: permission.id });

      // User should not be able to perform admin actions
      const hasPermission = await rbac.hasPermission(
        tenant.id,
        user.id,
        { resource: 'users', action: 'delete', scope: 'tenant' },
      );

      expect(hasPermission).toBe(false);
    });
  });
});
