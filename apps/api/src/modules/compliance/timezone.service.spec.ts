import { TimezoneService } from './timezone.service';

describe('TimezoneService', () => {
  let service: TimezoneService;

  beforeEach(() => {
    service = new TimezoneService();
  });

  it('validates known IANA timezones', () => {
    expect(service.isValidTimezone('America/New_York')).toBe(true);
    expect(service.isValidTimezone('UTC')).toBe(true);
    expect(service.isValidTimezone('Asia/Kolkata')).toBe(true);
  });

  it('rejects unknown timezones', () => {
    expect(service.isValidTimezone('Mars/Phobos')).toBe(false);
    expect(service.isValidTimezone('')).toBe(false);
  });

  it('returns the list of available timezones', () => {
    const zones = service.getAvailableTimezones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones).toContain('UTC');
  });

  it('throws when converting with an invalid timezone', () => {
    expect(() => service.convertTime(new Date(), 'Invalid/Zone', 'UTC')).toThrow();
  });

  it('identifies business hours within the 9-17 window', () => {
    const nineAmUtc = new Date('2024-01-03T12:00:00Z');
    expect(service.isBusinessHours(nineAmUtc, 'UTC', 9, 17)).toBe(true);
    const midnightUtc = new Date('2024-01-03T02:00:00Z');
    expect(service.isBusinessHours(midnightUtc, 'UTC', 9, 17)).toBe(false);
  });
});
