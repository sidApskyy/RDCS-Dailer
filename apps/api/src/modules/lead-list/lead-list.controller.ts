import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { LeadListService, CreateLeadListDto, UpdateLeadListDto } from './lead-list.service';

@ApiTags('Lead Lists')
@Controller('lead-lists')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class LeadListController {
  constructor(private readonly leadListService: LeadListService) {}

  @Post()
  @RequirePermission('lead_lists', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateLeadListDto) {
    return this.leadListService.create(user.tenantId, dto, user.userId);
  }

  @Get()
  @RequirePermission('lead_lists', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leadListService.findAll(user.tenantId, {
      status,
      organizationId,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('lead_lists', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadListService.findById(user.tenantId, id);
  }

  @Get(':id/statistics')
  @RequirePermission('lead_lists', 'read')
  async getStatistics(@Param('id') id: string) {
    return this.leadListService.getStatistics(id);
  }

  @Put(':id')
  @RequirePermission('lead_lists', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLeadListDto,
  ) {
    return this.leadListService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('lead_lists', 'delete')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadListService.delete(user.tenantId, id);
  }

  @Post(':id/attach/:campaignId')
  @RequirePermission('lead_lists', 'update')
  async attachToCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.leadListService.attachToCampaign(user.tenantId, id, campaignId);
  }

  @Delete(':id/detach/:campaignId')
  @RequirePermission('lead_lists', 'update')
  async detachFromCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.leadListService.detachFromCampaign(user.tenantId, id, campaignId);
  }
}
