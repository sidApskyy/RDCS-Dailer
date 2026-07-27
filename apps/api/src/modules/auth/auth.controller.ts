import { Body, Controller, Post, Headers, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService, TokenPair, SessionInfo } from './auth.service';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Headers('x-tenant-id') tenantId: string, @Body() dto: RegisterDto): Promise<TokenPair> {
    return this.authService.register(tenantId, dto);
  }

  @Post('login')
  login(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<TokenPair> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(tenantId, dto, ipAddress, userAgent);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string): Promise<TokenPair> {
    return this.authService.refresh(refreshToken);
  }

  @Post('verify')
  verify(@Headers('authorization') authHeader: string): Promise<{ userId: string; tenantId: string }> {
    const token = authHeader?.replace('Bearer ', '');
    return this.authService.verifyToken(token);
  }

  @Post('logout')
  @ApiBearerAuth()
  logout(@CurrentUser() user: CurrentUserPayload, @Body('sessionId') sessionId: string): Promise<void> {
    return this.authService.logout(sessionId, user.userId);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  logoutAll(@CurrentUser() user: CurrentUserPayload): Promise<void> {
    return this.authService.logoutAll(user.userId);
  }

  @Get('sessions')
  @ApiBearerAuth()
  getSessions(@CurrentUser() user: CurrentUserPayload): Promise<SessionInfo[]> {
    return this.authService.getSessions(user.userId);
  }

  @Post('change-password')
  @ApiBearerAuth()
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }
}
