import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RbacService } from '../../src/modules/rbac/rbac.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { testDb, testAuth } from '../setup';

describe('Tenant Isolation Security Tests', () => {
  let prisma: PrismaService;
  let rbac: RbacService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, RbacService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
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

  describe('Cross-Tenant Data Access Prevention', () => {
    it('should prevent user from accessing data from different tenant', async () => {
      const tenantA = await testDb.seedTenant({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
      });

      const tenantB = await testDb.seedTenant({
        id: 'tenant-b',
        name: 'Tenant B',
        slug: 'tenant-b',
      });

      const userA = await testDb.seedUser({
        id: 'user-a',
        tenantId: tenantA.id,
        email: 'user-a@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      // User A should not have access to Tenant B
      const hasAccess = await rbac.hasTenantAccess(tenantB.id, userA.id);
      expect(hasAccess).toBe(false);
    });

    it('should allow user to access data from own tenant', async () => {
      const tenantA = await testDb.seedTenant({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
      });

      const userA = await testDb.seedUser({
        id: 'user-a',
        tenantId: tenantA.id,
        email: 'user-a@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      // User A should have access to Tenant A
      const hasAccess = await rbac.hasTenantAccess(tenantA.id, userA.id);
      expect(hasAccess).toBe(true);
    });

    it('should deny access for inactive user', async () => {
      const tenantA = await testDb.seedTenant({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
      });

      const inactiveUser = await testDb.seedUser({
        id: 'user-inactive',
        tenantId: tenantA.id,
        email: 'inactive@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'inactive',
      });

      const hasAccess = await rbac.hasTenantAccess(tenantA.id, inactiveUser.id);
      expect(hasAccess).toBe(false);
    });
  });

  describe('Tenant Data Isolation', () => {
    it('should ensure campaigns are isolated by tenant', async () => {
      const tenantA = await testDb.seedTenant({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
      });

      const tenantB = await testDb.seedTenant({
        id: 'tenant-b',
        name: 'Tenant B',
        slug: 'tenant-b',
      });

      const userA = await testDb.seedUser({
        id: 'user-a',
        tenantId: tenantA.id,
        email: 'user-a@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      // Create campaign for Tenant A
      await prisma.campaign.create({
        data: {
          id: 'campaign-a',
          tenantId: tenantA.id,
          name: 'Campaign A',
          slug: 'campaign-a',
          type: 'outbound',
          purpose: 'sales',
          timezone: 'America/New_York',
          priority: 1,
          status: 'draft',
          createdBy: userA.id,
        },
      });

      // Create campaign for Tenant B
      await prisma.campaign.create({
        data: {
          id: 'campaign-b',
          tenantId: tenantB.id,
          name: 'Campaign B',
          slug: 'campaign-b',
          type: 'outbound',
          purpose: 'sales',
          timezone: 'America/New_York',
          priority: 1,
          status: 'draft',
          createdBy: userA.id,
        },
      });

      // User A should only see Tenant A's campaigns
      const campaignsA = await prisma.campaign.findMany({
        where: { tenantId: tenantA.id },
      });

      expect(campaignsA.length).toBe(1);
      expect(campaignsA[0].id).toBe('campaign-a');
    });

    it('should ensure leads are isolated by tenant', async () => {
      const tenantA = await testDb.seedTenant({
        id: 'tenant-a',
        name: 'Tenant A',
        slug: 'tenant-a',
      });

      const tenantB = await testDb.seedTenant({
        id: 'tenant-b',
        name: 'Tenant B',
        slug: 'tenant-b',
      });

      const userA = await testDb.seedUser({
        id: 'user-a',
        tenantId: tenantA.id,
        email: 'user-a@example.com',
        passwordHash: await testAuth.hashPassword('password'),
        status: 'active',
      });

      const leadListA = await prisma.leadList.create({
        data: {
          id: 'lead-list-a',
          tenantId: tenantA.id,
          name: 'Lead List A',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: userA.id,
        },
      });

      const leadListB = await prisma.leadList.create({
        data: {
          id: 'lead-list-b',
          tenantId: tenantB.id,
          name: 'Lead List B',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: userA.id,
        },
      });

      // Create lead for Tenant A
      await prisma.lead.create({
        data: {
          id: 'lead-a',
          tenantId: tenantA.id,
          leadListId: leadListA.id,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'new',
          createdBy: userA.id,
        },
      });

      // Create lead for Tenant B
      await prisma.lead.create({
        data: {
          id: 'lead-b',
          tenantId: tenantB.id,
          leadListId: leadListB.id,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          status: 'new',
          createdBy: userA.id,
        },
      });

      // User A should only see Tenant A's leads
      const leadsA = await prisma.lead.findMany({
        where: { tenantId: tenantA.id },
      });

      expect(leadsA.length).toBe(1);
      expect(leadsA[0].id).toBe('lead-a');
    });
  });
});
