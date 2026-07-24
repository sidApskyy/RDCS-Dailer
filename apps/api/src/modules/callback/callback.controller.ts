import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { CallbackService, CreateCallbackDto, UpdateCallbackDto } from './callback.service';

@ApiTags('Callbacks')
@Controller('callbacks')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class CallbackController {
  constructor(private readonly callbackService: CallbackService) {}

  @Post()
  @RequirePermission('callbacks', 'create')
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCallbackDto) {
    return this.callbackService.create(user.tenantId, dto, user.userId);
  }

  @Get()
  @RequirePermission('callbacks', 'read')
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.callbackService.findAll(user.tenantId, {
      status,
      assignedTo,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('due')
  @RequirePermission('callbacks', 'read')
  async getDueCallbacks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('assignedTo') assignedTo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.callbackService.getDueCallbacks(user.tenantId, {
      assignedTo,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('callbacks', 'read')
  async findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.callbackService.findById(user.tenantId, id);
  }

  @Put(':id')
  @RequirePermission('callbacks', 'update')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCallbackDto,
  ) {
    return this.callbackService.update(user.tenantId, id, dto);
  }

  @Post(':id/complete')
  @RequirePermission('callbacks', 'update')
  async complete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.callbackService.complete(user.tenantId, id);
  }

  @Post(':id/cancel')
  @RequirePermission('callbacks', 'update')
  async cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.callbackService.cancel(user.tenantId, id);
  }

  @Delete(':id')
  @RequirePermission('callbacks', 'delete')
  async delete(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.callbackService.delete(user.tenantId, id);
  }
}
