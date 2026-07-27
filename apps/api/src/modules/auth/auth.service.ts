import { createHash } from 'crypto';

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { Prisma } from '@rdcs/database';

import { PrismaService } from '../../prisma/prisma.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  expiresAt: Date;
}

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(tenantId: string, dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.createAuditEvent(tenantId, user.id, 'user.created', 'User', user.id, {
      email: user.email,
    });

    return this.createTokenPair(user.id, tenantId);
  }

  async login(tenantId: string, dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account inactive');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account locked. Try again later.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginAttempts: 0, lockedUntil: null },
    });

    await this.createAuditEvent(tenantId, user.id, 'auth.login.success', 'User', user.id, {
      ipAddress,
      userAgent,
    });

    return this.createTokenPair(user.id, tenantId, ipAddress, userAgent);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow<string>('app.jwtRefreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const session = await this.prisma.session.findFirst({
        where: { refreshTokenHash: this.hashToken(refreshToken), revokedAt: null },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      if (session.userId !== payload.sub) {
        throw new UnauthorizedException('Token mismatch');
      }

      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.createAuditEvent(session.tenantId, session.userId, 'auth.token.refresh', 'Session', session.id);

      return this.createTokenPair(session.userId, session.tenantId, session.ipAddress || undefined, session.userAgent || undefined);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException('Invalid session');
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.createAuditEvent(session.tenantId, userId, 'auth.logout', 'Session', sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
    });

    for (const session of sessions) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.createAuditEvent(session.tenantId, userId, 'auth.logout.all', 'Session', session.id);
    }
  }

  async getSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      deviceInfo: s.deviceInfo as Record<string, unknown>,
      expiresAt: s.expiresAt,
    }));
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.logoutAll(userId);

    await this.createAuditEvent(user.tenantId, userId, 'user.password.changed', 'User', userId);
  }

  async verifyToken(token: string): Promise<{ userId: string; tenantId: string }> {
    try {
      const payload = this.jwt.verify(token);
      return { userId: payload.sub, tenantId: payload.tenantId };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async handleFailedLogin(user: { id: string; tenantId: string; loginAttempts: number }): Promise<void> {
    const newAttempts = user.loginAttempts + 1;
    const lockedUntil = newAttempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: newAttempts, lockedUntil },
    });

    await this.createAuditEvent(user.tenantId, user.id, 'auth.login.failed', 'User', user.id, {
      attempts: newAttempts,
      locked: lockedUntil !== null,
    });
  }

  private async createTokenPair(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const payload = { sub: userId, tenantId };
    const accessToken = this.jwt.sign(payload);

    const refreshToken = this.jwt.sign(
      { sub: userId, tenantId, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('app.jwtRefreshSecret'),
        expiresIn: this.config.get<string>('app.jwtRefreshExpiry'),
      },
    );

    const refreshTokenHash = this.hashToken(refreshToken);
    const accessTokenExpiry = this.config.get<string>('app.jwtAccessExpiry') || '15m';
    const expiresAt = new Date(Date.now() + this.parseExpiryToMs(accessTokenExpiry));

    await this.prisma.session.create({
      data: {
        tenantId,
        userId,
        token: this.hashToken(accessToken),
        refreshTokenHash,
        ipAddress,
        userAgent,
        deviceInfo: { type: this.detectDeviceType(userAgent) },
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 1);
  }

  private detectDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private async createAuditEvent(
    tenantId: string,
    userId: string | null,
    action: string,
    resource: string,
    resourceId: string | null,
    metadata?: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        action,
        resource,
        resourceId,
        metadata,
      },
    });
  }
}
