import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { LeadImportService, CreateImportDto } from './lead-import.service';

@ApiTags('Lead Imports')
@Controller('lead-imports')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class LeadImportController {
  constructor(private readonly leadImportService: LeadImportService) {}

  @Post()
  @RequirePermission('lead_imports', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateImportDto) {
    return this.leadImportService.createImport(user.tenantId, dto, user.userId);
  }

  @Get()
  @RequirePermission('lead_imports', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('leadListId') leadListId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leadImportService.findAll(user.tenantId, {
      leadListId,
      status,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('lead_imports', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadImportService.findById(user.tenantId, id);
  }

  @Get(':id/progress')
  @RequirePermission('lead_imports', 'read')
  async getProgress(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadImportService.getProgress(user.tenantId, id);
  }

  @Get(':id/rows')
  @RequirePermission('lead_imports', 'read')
  async getImportRows(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.leadImportService.getImportRows(id, {
      status,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Post(':id/start')
  @RequirePermission('lead_imports', 'update')
  async startProcessing(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.leadImportService.startProcessing(user.tenantId, id);
  }
}
