import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { TimezoneService } from '../compliance/timezone.service';

export interface CreateCallingWindowDto {
  name: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface UpdateCallingWindowDto {
  name?: string;
  description?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface CallingWindowRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
}

export interface WindowCheckResult {
  isInWindow: boolean;
  hasExplicitWindows?: boolean;
  window?: CallingWindowRecord;
  reason?: string;
}

export interface CallingWindowListResult {
  callingWindows: CallingWindowRecord[];
  total: number;
}

@Injectable()
export class CallingWindowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timezoneService: TimezoneService,
  ) {}

  async create(tenantId: string, dto: CreateCallingWindowDto): Promise<CallingWindowRecord> {
    if (!this.timezoneService.isValidTimezone(dto.timezone)) {
      throw new BadRequestException(`Invalid timezone: ${dto.timezone}`);
    }

    if (dto.dayOfWeek < -1 || dto.dayOfWeek > 6) {
      throw new BadRequestException('Invalid day of week');
    }

    const callingWindow = await this.prisma.callingWindow.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        timezone: dto.timezone,
        isActive: true,
      },
    });

    return callingWindow;
  }

  async findById(tenantId: string, id: string): Promise<CallingWindowRecord> {
    const callingWindow = await this.prisma.callingWindow.findFirst({
      where: { tenantId, id },
    });

    if (!callingWindow) {
      throw new NotFoundException('Calling window not found');
    }

    return callingWindow;
  }

  async findAll(tenantId: string, params: { isActive?: boolean; skip?: number; take?: number }): Promise<CallingWindowListResult> {
    const where: { tenantId: string; isActive?: boolean } = { tenantId };
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [callingWindows, total] = await Promise.all([
      this.prisma.callingWindow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip || 0,
        take: params.take || 50,
      }),
      this.prisma.callingWindow.count({ where }),
    ]);

    return { callingWindows, total };
  }

  async update(tenantId: string, id: string, dto: UpdateCallingWindowDto): Promise<CallingWindowRecord> {
    await this.findById(tenantId, id);

    if (dto.timezone && !this.timezoneService.isValidTimezone(dto.timezone)) {
      throw new BadRequestException(`Invalid timezone: ${dto.timezone}`);
    }

    if (dto.dayOfWeek !== undefined && (dto.dayOfWeek < -1 || dto.dayOfWeek > 6)) {
      throw new BadRequestException('Invalid day of week');
    }

    const updated = await this.prisma.callingWindow.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<{ success: true }> {
    await this.findById(tenantId, id);

    await this.prisma.callingWindow.delete({
      where: { id },
    });

    return { success: true };
  }

  async checkCallingWindow(tenantId: string, date: Date): Promise<WindowCheckResult> {
    const callingWindows = await this.prisma.callingWindow.findMany({
      where: { tenantId, isActive: true },
    });

    if (callingWindows.length === 0) {
      return { isInWindow: true, hasExplicitWindows: false, reason: 'No calling windows configured' };
    }

    for (const window of callingWindows) {
      const result = this.checkWindow(date, window);
      if (result.isInWindow) {
        return { isInWindow: true, hasExplicitWindows: true, window };
      }
    }

    return { isInWindow: false, hasExplicitWindows: true, reason: 'Outside all calling windows' };
  }

  private checkWindow(date: Date, window: CallingWindowRecord): WindowCheckResult {
    const dayOfWeek = this.timezoneService.getDayOfWeekInTimezone(date, window.timezone);
    const hour = this.timezoneService.getHourInTimezone(date, window.timezone);
    const minute = this.timezoneService.getMinuteInTimezone(date, window.timezone);
    const currentTime = hour * 60 + minute;

    const [startHour, startMinute] = window.startTime.split(':').map(Number);
    const [endHour, endMinute] = window.endTime.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (window.dayOfWeek === -1 || window.dayOfWeek === dayOfWeek) {
      if (currentTime >= startTime && currentTime < endTime) {
        return { isInWindow: true, window };
      }
    }

    return { isInWindow: false };
  }

  async getNextAvailableWindow(tenantId: string, date: Date): Promise<Date | null> {
    const callingWindows = await this.prisma.callingWindow.findMany({
      where: { tenantId, isActive: true },
    });

    if (callingWindows.length === 0) {
      return date;
    }

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(date);
      checkDate.setDate(checkDate.getDate() + i);

      for (const window of callingWindows) {
        const result = this.checkWindow(checkDate, window);
        if (result.isInWindow) {
          const [startHour, startMinute] = window.startTime.split(':').map(Number);
          checkDate.setHours(startHour, startMinute, 0, 0);
          return checkDate;
        }
      }
    }

    return null;
  }
}
