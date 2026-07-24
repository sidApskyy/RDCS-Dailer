import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { DispositionService, CreateDispositionDto, UpdateDispositionDto } from './disposition.service';

@ApiTags('Dispositions')
@Controller('dispositions')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class DispositionController {
  constructor(private readonly dispositionService: DispositionService) {}

  @Post()
  @RequirePermission('dispositions', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDispositionDto) {
    return this.dispositionService.create(user.tenantId, dto, user.userId);
  }

  @Get()
  @RequirePermission('dispositions', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.dispositionService.findAll(user.tenantId, {
      category,
      isActive: isActive ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('dispositions', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.dispositionService.findById(user.tenantId, id);
  }

  @Get('code/:code')
  @RequirePermission('dispositions', 'read')
  async findByCode(@CurrentUser() user: CurrentUserPayload, @Param('code') code: string) {
    return this.dispositionService.findByCode(user.tenantId, code);
  }

  @Put(':id')
  @RequirePermission('dispositions', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDispositionDto,
  ) {
    return this.dispositionService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('dispositions', 'delete')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.dispositionService.delete(user.tenantId, id);
  }

  @Post(':id/attach/:campaignId')
  @RequirePermission('dispositions', 'update')
  async attachToCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.dispositionService.attachToCampaign(user.tenantId, id, campaignId);
  }

  @Delete(':id/detach/:campaignId')
  @RequirePermission('dispositions', 'update')
  async detachFromCampaign(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.dispositionService.detachFromCampaign(user.tenantId, id, campaignId);
  }

  @Post('apply/:leadId')
  @RequirePermission('dispositions', 'update')
  async applyToLead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('leadId') leadId: string,
    @Body() body: { dispositionId: string; phoneNumber: string; notes?: string },
  ) {
    return this.dispositionService.applyToLead(user.tenantId, leadId, body.dispositionId, body.phoneNumber || '', body.notes || '', user.userId);
  }
}
