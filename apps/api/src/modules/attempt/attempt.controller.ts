import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { AttemptService, CreateAttemptDto, UpdateAttemptDto } from './attempt.service';

@ApiTags('Attempts')
@Controller('attempts')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class AttemptController {
  constructor(private readonly attemptService: AttemptService) {}

  @Post()
  @RequirePermission('attempts', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateAttemptDto) {
    return this.attemptService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermission('attempts', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('leadId') leadId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (leadId) {
      return this.attemptService.findByLead(user.tenantId, leadId, {
        skip: skip ? parseInt(skip) : undefined,
        take: take ? parseInt(take) : undefined,
      });
    }

    if (campaignId) {
      return this.attemptService.findByCampaign(user.tenantId, campaignId, {
        skip: skip ? parseInt(skip) : undefined,
        take: take ? parseInt(take) : undefined,
      });
    }

    throw new Error('Either leadId or campaignId must be provided');
  }

  @Get(':id')
  @RequirePermission('attempts', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.attemptService.findById(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('attempts', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAttemptDto,
  ) {
    return this.attemptService.update(user.tenantId, id, dto);
  }

  @Post(':id/complete')
  @RequirePermission('attempts', 'update')
  async complete(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAttemptDto,
  ) {
    return this.attemptService.complete(user.tenantId, id, dto);
  }

  @Get('lead/:leadId/statistics')
  @RequirePermission('attempts', 'read')
  async getLeadStatistics(@CurrentUser() user: CurrentUserPayload, @Param('leadId') leadId: string) {
    return this.attemptService.getAttemptStatistics(user.tenantId, leadId);
  }

  @Get('campaign/:campaignId/statistics')
  @RequirePermission('attempts', 'read')
  async getCampaignStatistics(@CurrentUser() user: CurrentUserPayload, @Param('campaignId') campaignId: string) {
    return this.attemptService.getCampaignStatistics(user.tenantId, campaignId);
  }
}
