import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

/**
 * Test authentication utilities
 * Generates test tokens and credentials for integration tests
 */

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  password: string;
  roles: string[];
}

export class TestAuth {
  private jwtService: JwtService;

  constructor() {
    this.jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret-key',
      signOptions: { expiresIn: '1h' },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(user: TestUser): string {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles,
      type: 'access',
    };
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(user: TestUser): string {
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      type: 'refresh',
    };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token);
  }

  createTestUser(overrides?: Partial<TestUser>): TestUser {
    return {
      id: overrides?.id || 'test-user-id',
      tenantId: overrides?.tenantId || 'test-tenant-id',
      email: overrides?.email || 'test@example.com',
      password: overrides?.password || 'TestPassword123!',
      roles: overrides?.roles || ['admin'],
    };
  }

  async createTestUserWithHash(overrides?: Partial<TestUser>): Promise<TestUser & { passwordHash: string }> {
    const user = this.createTestUser(overrides);
    const passwordHash = await this.hashPassword(user.password);
    return { ...user, passwordHash };
  }
}

export const testAuth = new TestAuth();
