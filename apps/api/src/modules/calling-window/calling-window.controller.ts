import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { CallingWindowService, CreateCallingWindowDto, UpdateCallingWindowDto } from './calling-window.service';

@ApiTags('Calling Windows')
@Controller('calling-windows')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class CallingWindowController {
  constructor(private readonly callingWindowService: CallingWindowService) {}

  @Post()
  @RequirePermission('calling_windows', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCallingWindowDto) {
    return this.callingWindowService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermission('calling_windows', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.callingWindowService.findAll(user.tenantId, {
      isActive: isActive ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('calling_windows', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.callingWindowService.findById(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('calling_windows', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCallingWindowDto,
  ) {
    return this.callingWindowService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermission('calling_windows', 'delete')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.callingWindowService.delete(user.tenantId, id);
  }

  @Get('check/current')
  @RequirePermission('calling_windows', 'read')
  async checkCurrentWindow(@CurrentUser() user: CurrentUserPayload) {
    return this.callingWindowService.checkCallingWindow(user.tenantId, new Date());
  }

  @Get('check/next')
  @RequirePermission('calling_windows', 'read')
  async getNextAvailableWindow(@CurrentUser() user: CurrentUserPayload) {
    return this.callingWindowService.getNextAvailableWindow(user.tenantId, new Date());
  }
}
