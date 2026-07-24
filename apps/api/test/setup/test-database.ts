import { PrismaClient } from '@rdcs/database';

/**
 * Test database setup utilities
 * Creates isolated test database schema for integration tests
 */

export class TestDatabase {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rdcs_test',
        },
      },
    });
  }

  async connect() {
    await this.prisma.$connect();
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async clean() {
    // Clean all tables in correct order respecting foreign keys
    const tables = [
      'LeadAttempt',
      'LeadEligibilityDecision',
      'LeadDisposition',
      'LeadPhone',
      'Lead',
      'LeadImportRow',
      'LeadListImport',
      'CampaignLeadList',
      'CampaignDisposition',
      'Campaign',
      'LeadList',
      'DNCEntry',
      'DNCList',
      'Consent',
      'Callback',
      'Disposition',
      'CallingWindow',
      'HolidayCalendar',
      'UserRole',
      'Permission',
      'Role',
      'User',
      'Tenant',
      'Session',
      'Audit',
    ];

    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch {
        // Table might not exist, continue
      }
    }
  }

  async seedTenant(data: { id: string; name: string; slug: string }): Promise<any> {
    return this.prisma.tenant.create({
      data,
    });
  }

  async seedUser(data: {
    id: string;
    tenantId: string;
    email: string;
    passwordHash: string;
    status: string;
    firstName?: string;
    lastName?: string;
  }): Promise<any> {
    return this.prisma.user.create({
      data: {
        ...data,
        firstName: data.firstName || 'Test',
        lastName: data.lastName || 'User',
      },
    });
  }

  async seedRole(data: { id: string; name: string; description?: string; tenantId: string }): Promise<any> {
    return this.prisma.role.create({
      data,
    });
  }

  async seedPermission(data: { id: string; resource: string; action: string; scope: string; tenantId: string }): Promise<any> {
    return this.prisma.permission.create({
      data,
    });
  }

  async seedUserRole(data: { userId: string; roleId: string }): Promise<any> {
    return this.prisma.userRole.create({
      data,
    });
  }

  async seedRolePermission(data: { roleId: string; permissionId: string }): Promise<any> {
    return this.prisma.rolePermission.create({
      data,
    });
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}

export const testDb = new TestDatabase();
