import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CampaignService } from '../../src/modules/campaign/campaign.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { testDb, testAuth } from '../setup';

describe('Campaign Integration Tests', () => {
  let service: CampaignService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignService, PrismaService],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await testDb.clean();
  });

  describe('Campaign CRUD Operations', () => {
    it('should create a campaign', async () => {
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

      const campaign = await service.create(tenant.id, {
        name: 'Test Campaign',
        slug: 'test-campaign',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.tenantId).toBe(tenant.id);
      expect(campaign.status).toBe('draft');
    });

    it('should find a campaign by id', async () => {
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
        name: 'Test Campaign',
        slug: 'test-campaign',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      const found = await service.findById(tenant.id, created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('Test Campaign');
    });

    it('should list campaigns for a tenant', async () => {
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
        name: 'Campaign 1',
        slug: 'campaign-1',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      await service.create(tenant.id, {
        name: 'Campaign 2',
        slug: 'campaign-2',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 2,
      }, user.id);

      const campaigns = await service.findAll(tenant.id, {});

      expect(campaigns).toBeDefined();
      expect(campaigns.campaigns.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a campaign', async () => {
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
        name: 'Test Campaign',
        slug: 'test-campaign',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      const updated = await service.update(tenant.id, created.id, {
        name: 'Updated Campaign',
        description: 'Updated description',
      }, user.id);

      expect(updated.name).toBe('Updated Campaign');
      expect(updated.description).toBe('Updated description');
    });

    it('should delete a campaign', async () => {
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
        name: 'Test Campaign',
        slug: 'test-campaign',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      await service.delete(tenant.id, created.id);

      await expect(service.findById(tenant.id, created.id)).rejects.toThrow('Campaign not found');
    });
  });

  describe('Campaign Status Transitions', () => {
    it('should transition campaign from draft to active', async () => {
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

      const campaign = await service.create(tenant.id, {
        name: 'Test Campaign',
        slug: 'test-campaign',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      const transitioned = await service.transitionStatus(tenant.id, campaign.id, {
        status: 'active',
      }, user.id);

      expect(transitioned.status).toBe('active');
    });

    it('should transition campaign from active to paused', async () => {
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

      const campaign = await service.create(tenant.id, {
        name: 'Test Campaign',
        slug: 'test-campaign',
        type: 'outbound',
        purpose: 'sales',
        timezone: 'America/New_York',
        priority: 1,
      }, user.id);

      await service.transitionStatus(tenant.id, campaign.id, {
        status: 'active',
      }, user.id);

      const paused = await service.transitionStatus(tenant.id, campaign.id, {
        status: 'paused',
      }, user.id);

      expect(paused.status).toBe('paused');
    });
  });
});
