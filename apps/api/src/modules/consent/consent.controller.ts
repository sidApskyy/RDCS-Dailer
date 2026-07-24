import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { ConsentService, CreateConsentDto } from './consent.service';

@ApiTags('Consents')
@Controller('consents')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post()
  @RequirePermission('consents', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateConsentDto) {
    return this.consentService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermission('consents', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.consentService.findAll(user.tenantId, {
      status,
      type,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('consents', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.consentService.findById(user.tenantId, id);
  }

  @Get('lead/:leadId')
  @RequirePermission('consents', 'read')
  async findByLead(@CurrentUser() user: CurrentUserPayload, @Param('leadId') leadId: string) {
    return this.consentService.findByLead(user.tenantId, leadId);
  }

  @Get('lead/:leadId/latest')
  @RequirePermission('consents', 'read')
  async getLatestConsent(@CurrentUser() user: CurrentUserPayload, @Param('leadId') leadId: string) {
    return this.consentService.getLatestConsent(user.tenantId, leadId);
  }

  @Get('lead/:leadId/check')
  @RequirePermission('consents', 'read')
  async checkConsent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('leadId') leadId: string,
  ) {
    return this.consentService.checkConsent(user.tenantId, leadId);
  }

  @Post('lead/:leadId/revoke')
  @RequirePermission('consents', 'update')
  async revoke(
    @CurrentUser() user: CurrentUserPayload,
    @Param('leadId') leadId: string,
    @Body() body: { reason?: string },
  ) {
    return this.consentService.revoke(user.tenantId, leadId, body.reason);
  }

  @Get('phone/:phoneNumber')
  @RequirePermission('consents', 'read')
  async findByPhoneNumber(@CurrentUser() user: CurrentUserPayload, @Param('phoneNumber') phoneNumber: string) {
    return this.consentService.findByPhoneNumber(user.tenantId, phoneNumber);
  }
}
