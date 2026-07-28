import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

import { DispositionCallDto, ManualDialDto, UpdatePresenceDto } from './dto/manual-dial.dto';
import { TelephonyService } from './telephony.service';
import { AgentPresence } from './telephony.types';

@ApiTags('Telephony')
@ApiBearerAuth()
@Controller('calls')
@UseGuards(JwtAuthGuard, TenantIsolationGuard, PermissionsGuard)
export class TelephonyController {
  constructor(private readonly telephony: TelephonyService) {}

  @Post('manual-dial')
  @RequirePermission('calls', 'create')
  manualDial(@CurrentUser() user: CurrentUserPayload, @Body() dto: ManualDialDto) {
    return this.telephony.manualDial(user.tenantId, user.userId, dto);
  }

  @Delete(':id')
  @RequirePermission('calls', 'update')
  cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.telephony.cancel(user.tenantId, user.userId, id);
  }

  @Get(':id')
  @RequirePermission('calls', 'read')
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.telephony.getCall(user.tenantId, id);
  }

  @Get()
  @RequirePermission('calls', 'read')
  list(@CurrentUser() user: CurrentUserPayload, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.telephony.listCalls(user.tenantId, user.userId, skip ? Number(skip) : 0, take ? Number(take) : 50);
  }

  @Post(':id/disposition')
  @RequirePermission('calls', 'update')
  dispose(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: DispositionCallDto) {
    return this.telephony.dispose(user.tenantId, user.userId, id, dto.dispositionId);
  }

  @Put('agent/status')
  @RequirePermission('calls', 'update')
  setStatus(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdatePresenceDto) {
    if (!Object.values(AgentPresence).includes(dto.status as AgentPresence)) throw new BadRequestException('Invalid agent status');
    return this.telephony.setAgentStatus(user.tenantId, user.userId, dto.status as AgentPresence);
  }

  @Get('agent/status')
  @RequirePermission('calls', 'read')
  getStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.telephony.getPresence(user.tenantId, user.userId);
  }
}
