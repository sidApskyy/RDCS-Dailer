export interface PhoneValidationResult {
  isValid: boolean;
  normalizedNumber?: string;
  countryCode?: string;
  error?: string;
}

export function validatePhoneNumber(phoneNumber: string, defaultCountryCode: string = 'US'): PhoneValidationResult {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = phoneNumber.replace(/[\s\-().]/g, '');

  if (cleaned.length < 10) {
    return { isValid: false, error: 'Phone number is too short' };
  }

  if (cleaned.length > 15) {
    return { isValid: false, error: 'Phone number is too long' };
  }

  if (!/^\+?\d+$/.test(cleaned)) {
    return { isValid: false, error: 'Phone number contains invalid characters' };
  }

  let normalizedNumber = cleaned;
  if (!cleaned.startsWith('+')) {
    normalizedNumber = `+${cleaned}`;
  }

  return {
    isValid: true,
    normalizedNumber,
    countryCode: defaultCountryCode,
  };
}

export function normalizeToE164(phoneNumber: string, defaultCountryCode: string = 'US'): string | null {
  const result = validatePhoneNumber(phoneNumber, defaultCountryCode);
  return result.isValid ? result.normalizedNumber || null : null;
}
