import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { CampaignService, CreateCampaignDto, UpdateCampaignDto, CampaignTransitionDto } from './campaign.service';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @RequirePermission('campaigns', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCampaignDto) {
    return this.campaignService.create(user.tenantId, dto, user.userId);
  }

  @Get()
  @RequirePermission('campaigns', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.campaignService.findAll(user.tenantId, {
      status,
      organizationId,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('slug/:slug')
  @RequirePermission('campaigns', 'read')
  async findBySlug(@CurrentUser() user: CurrentUserPayload, @Param('slug') slug: string) {
    return this.campaignService.findBySlug(user.tenantId, slug);
  }

  @Get(':id')
  @RequirePermission('campaigns', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignService.findById(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('campaigns', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(user.tenantId, id, dto, user.userId);
  }

  @Post(':id/transition')
  @RequirePermission('campaigns', 'update')
  async transitionStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: CampaignTransitionDto,
  ) {
    return this.campaignService.transitionStatus(user.tenantId, id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermission('campaigns', 'delete')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignService.delete(user.tenantId, id);
  }

  @Post(':id/archive')
  @RequirePermission('campaigns', 'update')
  async archive(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.campaignService.archive(user.tenantId, id, user.userId);
  }
}
