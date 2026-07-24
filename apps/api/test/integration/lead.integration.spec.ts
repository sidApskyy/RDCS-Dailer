import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { LeadService } from '../../src/modules/lead/lead.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { testDb, testAuth } from '../setup';

describe('Lead Integration Tests', () => {
  let service: LeadService;
  let prisma: PrismaService;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeadService, PrismaService],
    }).compile();

    service = module.get<LeadService>(LeadService);
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

  describe('Lead CRUD Operations', () => {
    it('should create a lead', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      const lead = await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      expect(lead).toBeDefined();
      expect(lead.firstName).toBe('John');
      expect(lead.lastName).toBe('Doe');
      expect(lead.tenantId).toBe(tenant.id);
      expect(lead.status).toBe('new');
    });

    it('should find a lead by id', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      const created = await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      const found = await service.findById(tenant.id, created.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
      expect(found.firstName).toBe('John');
    });

    it('should list leads for a tenant', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567891', type: 'mobile', isPrimary: true }],
      }, user.id);

      const leads = await service.findAll(tenant.id, {});

      expect(leads).toBeDefined();
      expect(leads.length).toBeGreaterThanOrEqual(2);
    });

    it('should update a lead', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      const created = await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      const updated = await service.update(tenant.id, created.id, {
        firstName: 'Updated',
        lastName: 'Name',
      }, user.id);

      expect(updated.firstName).toBe('Updated');
      expect(updated.lastName).toBe('Name');
    });

    it('should delete a lead', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      const created = await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      await service.delete(tenant.id, created.id, user.id);

      const found = await service.findById(tenant.id, created.id);
      expect(found).toBeNull();
    });
  });

  describe('Lead Status Transitions', () => {
    it('should transition lead from new to eligible', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      const lead = await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      const transitioned = await service.transitionStatus(tenant.id, lead.id, {
        status: 'eligible',
      }, user.id);

      expect(transitioned.status).toBe('eligible');
    });

    it('should transition lead from eligible to assigned', async () => {
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

      const leadList = await prisma.leadList.create({
        data: {
          id: 'lead-list-1',
          tenantId: tenant.id,
          name: 'Test Lead List',
          status: 'active',
          totalRows: 0,
          processedRows: 0,
          successfulRows: 0,
          failedRows: 0,
          duplicateRows: 0,
          suppressedRows: 0,
          createdBy: user.id,
        },
      });

      const lead = await service.create(tenant.id, {
        leadListId: leadList.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        timezone: 'America/New_York',
        phones: [{ phoneNumber: '+1234567890', type: 'mobile', isPrimary: true }],
      }, user.id);

      await service.transitionStatus(tenant.id, lead.id, {
        status: 'eligible',
      }, user.id);

      const assigned = await service.transitionStatus(tenant.id, lead.id, {
        status: 'assigned',
      }, user.id);

      expect(assigned.status).toBe('assigned');
    });
  });
});
