import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { ComplianceAuditService } from './compliance-audit.service';
import { ComplianceEngineService, EligibilityCheckConfig } from './compliance-engine.service';

interface CheckEligibilityDto {
  leadId: string;
  phoneNumber: string;
  config?: Partial<EligibilityCheckConfig>;
}

@ApiTags('Compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(
    private readonly complianceEngine: ComplianceEngineService,
    private readonly complianceAudit: ComplianceAuditService,
  ) {}

  @Post('eligibility/check')
  @RequirePermission('compliance', 'read')
  async checkEligibility(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CheckEligibilityDto,
  ) {
    const config: EligibilityCheckConfig = {
      checkDNC: dto.config?.checkDNC ?? true,
      checkConsent: dto.config?.checkConsent ?? true,
      checkCallingWindow: dto.config?.checkCallingWindow ?? true,
      checkTimezone: dto.config?.checkTimezone ?? true,
      campaignId: dto.config?.campaignId,
      timezone: dto.config?.timezone,
    };

    return this.complianceEngine.checkLeadEligibility(user.tenantId, dto.leadId, dto.phoneNumber, config);
  }

  @Get('eligibility/history/:leadId')
  @RequirePermission('compliance', 'read')
  async getEligibilityHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('leadId') leadId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.complianceEngine.getEligibilityHistory(user.tenantId, leadId, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('statistics')
  @RequirePermission('compliance', 'read')
  async getStatistics(@CurrentUser() user: CurrentUserPayload) {
    return this.complianceEngine.getComplianceStatistics(user.tenantId);
  }

  @Get('events')
  @RequirePermission('compliance', 'read')
  async getEvents(
    @CurrentUser() user: CurrentUserPayload,
    @Query('eventType') eventType?: string,
    @Query('outcome') outcome?: string,
    @Query('userId') userId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.complianceAudit.getComplianceEvents(user.tenantId, {
      eventType,
      outcome,
      userId,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('score')
  @RequirePermission('compliance', 'read')
  async getScore(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days?: string,
  ) {
    return this.complianceAudit.getComplianceScore(user.tenantId, days ? parseInt(days) : undefined);
  }
}
