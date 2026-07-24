import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RbacService } from '../rbac/rbac.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';


@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('app.jwtSecret'),
        signOptions: { expiresIn: config.get<string>('app.jwtAccessExpiry') },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, PermissionsGuard, RbacService],
  controllers: [AuthController],
  exports: [AuthService, RbacService, PermissionsGuard],
})
export class AuthModule {}
