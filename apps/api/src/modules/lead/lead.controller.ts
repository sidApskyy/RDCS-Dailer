import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { LeadService, CreateLeadDto, UpdateLeadDto, LeadTransitionDto } from './lead.service';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @RequirePermission('leads', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateLeadDto) {
    return this.leadService.create(user.tenantId, dto, user.userId);
  }

  @Get()
  @RequirePermission('leads', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('campaignId') campaignId?: string,
    @Query('leadListId') leadListId?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leadService.findAll(user.tenantId, {
      status,
      campaignId,
      leadListId,
      assignedTo,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('leads', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadService.findById(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('leads', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadService.update(user.tenantId, id, dto, user.userId);
  }

  @Post(':id/transition')
  @RequirePermission('leads', 'update')
  async transitionStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: LeadTransitionDto,
  ) {
    return this.leadService.transitionStatus(user.tenantId, id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermission('leads', 'delete')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadService.delete(user.tenantId, id, user.userId);
  }
}
