import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../src/modules/auth/auth.service';
import { RbacService } from '../../src/modules/rbac/rbac.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Authentication Security Tests', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            session: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              findMany: jest.fn(),
            },
            audit: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: RbacService,
          useValue: {
            hasPermission: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe('Account Lockout', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const mockUser = {
        id: 'user1',
        tenantId: 'tenant1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 12),
        status: 'active',
        loginAttempts: 4,
        lockedUntil: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        loginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });

      await expect(
        service.login('tenant1', { email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loginAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('should reject login for locked account', async () => {
      const mockUser = {
        id: 'user1',
        tenantId: 'tenant1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 12),
        status: 'active',
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login('tenant1', { email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow('Account locked');
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate refresh tokens on use', async () => {
      const mockSession = {
        id: 'session1',
        tenantId: 'tenant1',
        userId: 'user1',
        refreshTokenHash: 'hash1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
      };

      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user1', tenantId: 'tenant1', type: 'refresh' });
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.session.update as jest.Mock).mockResolvedValue({ ...mockSession, revokedAt: new Date() });
      (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

      await service.refresh('old-refresh-token');

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session1' },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('should reject reused refresh tokens', async () => {
      const mockSession = {
        id: 'session1',
        tenantId: 'tenant1',
        userId: 'user1',
        refreshTokenHash: 'hash1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
      };

      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user1', tenantId: 'tenant1', type: 'refresh' });
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);

      await expect(service.refresh('old-refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Session Management', () => {
    it('should revoke session on logout', async () => {
      const mockSession = {
        id: 'session1',
        userId: 'user1',
        tenantId: 'tenant1',
      };

      (prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (prisma.session.update as jest.Mock).mockResolvedValue({ ...mockSession, revokedAt: new Date() });

      await service.logout('session1', 'user1');

      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('should revoke all sessions on logout-all', async () => {
      const mockSessions = [
        { id: 'session1', userId: 'user1', tenantId: 'tenant1' },
        { id: 'session2', userId: 'user1', tenantId: 'tenant1' },
      ];

      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);
      (prisma.session.update as jest.Mock).mockResolvedValue({ revokedAt: new Date() });

      await service.logoutAll('user1');

      expect(prisma.session.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('Password Security', () => {
    it('should require current password for change', async () => {
      const mockUser = {
        id: 'user1',
        tenantId: 'tenant1',
        passwordHash: await bcrypt.hash('oldpassword', 12),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.changePassword('user1', 'wrongpassword', 'newpassword'),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should revoke all sessions on password change', async () => {
      const mockUser = {
        id: 'user1',
        tenantId: 'tenant1',
        passwordHash: await bcrypt.hash('oldpassword', 12),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.session.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.session.update as jest.Mock).mockResolvedValue({});

      await service.changePassword('user1', 'oldpassword', 'newpassword');

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user1', revokedAt: null },
        }),
      );
    });
  });
});
