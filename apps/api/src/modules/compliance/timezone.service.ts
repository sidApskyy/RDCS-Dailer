import { Injectable } from '@nestjs/common';

export interface TimezoneConversionResult {
  originalTime: Date;
  originalTimezone: string;
  targetTime: Date;
  targetTimezone: string;
}

export interface TimeWindowResult {
  isInWindow: boolean;
  windowStart?: Date;
  windowEnd?: Date;
  reason?: string;
}

@Injectable()
export class TimezoneService {
  private readonly IANA_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'America/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ];

  isValidTimezone(timezone: string): boolean {
    return this.IANA_TIMEZONES.includes(timezone);
  }

  convertTime(date: Date, fromTimezone: string, toTimezone: string): TimezoneConversionResult {
    if (!this.isValidTimezone(fromTimezone)) {
      throw new Error(`Invalid source timezone: ${fromTimezone}`);
    }

    if (!this.isValidTimezone(toTimezone)) {
      throw new Error(`Invalid target timezone: ${toTimezone}`);
    }

    const targetTime = new Date(date.toLocaleString('en-US', { timeZone: toTimezone }));

    return {
      originalTime: date,
      originalTimezone: fromTimezone,
      targetTime,
      targetTimezone: toTimezone,
    };
  }

  convertToUTC(date: Date, fromTimezone: string): Date {
    return this.convertTime(date, fromTimezone, 'UTC').targetTime;
  }

  convertFromUTC(date: Date, toTimezone: string): Date {
    return this.convertTime(date, 'UTC', toTimezone).targetTime;
  }

  getCurrentTimeInTimezone(timezone: string): Date {
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
  }

  getDayOfWeekInTimezone(date: Date, timezone: string): number {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return localDate.getDay();
  }

  getHourInTimezone(date: Date, timezone: string): number {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return localDate.getHours();
  }

  getMinuteInTimezone(date: Date, timezone: string): number {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return localDate.getMinutes();
  }

  isBusinessHours(date: Date, timezone: string, startHour: number = 9, endHour: number = 17): boolean {
    const hour = this.getHourInTimezone(date, timezone);
    return hour >= startHour && hour < endHour;
  }

  isWeekday(date: Date, timezone: string): boolean {
    const dayOfWeek = this.getDayOfWeekInTimezone(date, timezone);
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  getTimeDifference(timezone1: string, timezone2: string): number {
    const time1 = this.getCurrentTimeInTimezone(timezone1);
    const time2 = this.getCurrentTimeInTimezone(timezone2);
    return (time1.getTime() - time2.getTime()) / (1000 * 60 * 60);
  }

  getAvailableTimezones(): string[] {
    return [...this.IANA_TIMEZONES];
  }

  formatTimeInTimezone(date: Date, timezone: string, format: '24h' | '12h' = '24h'): string {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const hours = localDate.getHours();
    const minutes = localDate.getMinutes().toString().padStart(2, '0');

    if (format === '12h') {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${ampm}`;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
}
