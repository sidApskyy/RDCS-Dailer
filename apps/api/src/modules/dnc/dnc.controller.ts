import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';

import { DNCService, CreateDNCListDto, AddDNCEntryDto } from './dnc.service';

@ApiTags('DNC')
@Controller('dnc')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
@ApiBearerAuth()
export class DNCController {
  constructor(private readonly dncService: DNCService) {}

  @Post('lists')
  @RequirePermission('dnc', 'create')
  async createList(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateDNCListDto) {
    return this.dncService.createList(user.tenantId, dto, user.userId);
  }

  @Get('lists')
  @RequirePermission('dnc', 'read')
  async findAllLists(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.dncService.findAll(user.tenantId, {
      type,
      isActive: isActive ? isActive === 'true' : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get('lists/:id')
  @RequirePermission('dnc', 'read')
  async findListById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.dncService.findById(user.tenantId, id);
  }

  @Put('lists/:id')
  @RequirePermission('dnc', 'update')
  async updateList(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.dncService.updateList(user.tenantId, id, dto);
  }

  @Delete('lists/:id')
  @RequirePermission('dnc', 'delete')
  async deleteList(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.dncService.deleteList(user.tenantId, id);
  }

  @Post('lists/:id/entries')
  @RequirePermission('dnc', 'update')
  async addEntry(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: AddDNCEntryDto,
  ) {
    return this.dncService.addEntry(user.tenantId, id, dto, user.userId);
  }

  @Post('lists/:id/entries/bulk')
  @RequirePermission('dnc', 'update')
  async bulkAddEntries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { phoneNumbers: string[] },
  ) {
    return this.dncService.bulkAddEntries(user.tenantId, id, body.phoneNumbers, user.userId);
  }

  @Get('lists/:id/entries')
  @RequirePermission('dnc', 'read')
  async getEntries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.dncService.getEntries(user.tenantId, id, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Delete('lists/:id/entries/:entryId')
  @RequirePermission('dnc', 'update')
  async removeEntry(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    return this.dncService.removeEntry(user.tenantId, id, entryId);
  }

  @Get('check/:phoneNumber')
  @RequirePermission('dnc', 'read')
  async checkDNC(@CurrentUser() user: CurrentUserPayload, @Param('phoneNumber') phoneNumber: string) {
    return this.dncService.checkDNC(user.tenantId, phoneNumber);
  }
}
