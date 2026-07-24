import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LeadListService } from '../../src/modules/lead-list/lead-list.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { testDb, testAuth } from '../setup';

describe('Lead List Integration Tests', () => {
  let service: LeadListService;
  let prisma: PrismaService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadListService, PrismaService],
    }).compile();

    service = module.get<LeadListService>(LeadListService);
    prisma = module.get<PrismaService>(PrismaService);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testDb.clean();
  });

  describe('Lead List CRUD Operations', () => {
    it('should create a lead list', async () => {
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

      const leadList = await service.create(tenant.id, {
        name: 'Test Lead List',
        description: 'Test description',
      }, user.id);

      expect(leadList).toBeDefined();
      expect(leadList.name).toBe('Test Lead List');
      expect(leadList.tenantId).toBe(tenant.id);
      expect(leadList.status).toBe('active');
    });

    it('should find a lead list by id', async () => {
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

      const created = await service.create(tenant.id, {
        name: 'Test Lead List',
        description: 'Test description',
      }, user.id);

      const found = await service.findById(tenant.id, created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Test Lead List');
    });

    it('should list lead lists for a tenant', async () => {
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

      await service.create(tenant.id, {
        name: 'Lead List 1',
        description: 'Description 1',
      }, user.id);

      await service.create(tenant.id, {
        name: 'Lead List 2',
        description: 'Description 2',
      }, user.id);

      const leadLists = await service.findAll(tenant.id, {});

      expect(leadLists).toBeDefined();
      expect(leadLists.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a lead list', async () => {
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

      const created = await service.create(tenant.id, {
        name: 'Test Lead List',
        description: 'Test description',
      }, user.id);

      const updated = await service.update(tenant.id, created.id, {
        name: 'Updated Lead List',
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Lead List');
      expect(updated.description).toBe('Updated description');
    });

    it('should delete a lead list', async () => {
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

      const created = await service.create(tenant.id, {
        name: 'Test Lead List',
        description: 'Test description',
      }, user.id);

      await service.delete(tenant.id, created.id);

      const found = await service.findById(tenant.id, created.id);
      expect(found).toBeNull();
    });
  });

  describe('Lead List Campaign Attachment', () => {
    it('should attach lead list to campaign', async () => {
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

      const leadList = await service.create(tenant.id, {
        name: 'Test Lead List',
        description: 'Test description',
      }, user.id);

      const campaign = await prisma.campaign.create({
        data: {
          id: 'campaign-1',
          tenantId: tenant.id,
          name: 'Test Campaign',
          slug: 'test-campaign',
          type: 'outbound',
          purpose: 'sales',
          timezone: 'America/New_York',
          priority: 1,
          status: 'draft',
          createdBy: user.id,
        },
      });

      const attached = await service.attachToCampaign(tenant.id, leadList.id, campaign.id);

      expect(attached).toBeDefined();
    });

    it('should detach lead list from campaign', async () => {
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

      const leadList = await service.create(tenant.id, {
        name: 'Test Lead List',
        description: 'Test description',
      }, user.id);

      const campaign = await prisma.campaign.create({
        data: {
          id: 'campaign-1',
          tenantId: tenant.id,
          name: 'Test Campaign',
          slug: 'test-campaign',
          type: 'outbound',
          purpose: 'sales',
          timezone: 'America/New_York',
          priority: 1,
          status: 'draft',
          createdBy: user.id,
        },
      });

      await service.attachToCampaign(tenant.id, leadList.id, campaign.id);
      const detached = await service.detachFromCampaign(tenant.id, leadList.id, campaign.id);

      expect(detached).toBeDefined();
    });
  });
});
