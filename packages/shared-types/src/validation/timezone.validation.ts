export interface TimezoneValidationResult {
  isValid: boolean;
  normalizedTimezone?: string;
  error?: string;
}

const IANA_TIMEZONES = [
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

export function validateTimezone(timezone: string): TimezoneValidationResult {
  if (!timezone || typeof timezone !== 'string') {
    return { isValid: false, error: 'Timezone is required' };
  }

  const trimmed = timezone.trim();

  if (!IANA_TIMEZONES.includes(trimmed)) {
    return { isValid: false, error: 'Invalid IANA timezone identifier' };
  }

  return {
    isValid: true,
    normalizedTimezone: trimmed,
  };
}

export function normalizeTimezone(timezone: string): string | null {
  const result = validateTimezone(timezone);
  return result.isValid ? result.normalizedTimezone || null : null;
}

export function isValidIANATimezone(timezone: string): boolean {
  return IANA_TIMEZONES.includes(timezone);
}
