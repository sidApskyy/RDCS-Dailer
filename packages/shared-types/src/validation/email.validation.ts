export interface EmailValidationResult {
  isValid: boolean;
  normalizedEmail?: string;
  error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  const [localPart, domain] = trimmed.split('@');
  if (localPart.length > 64) {
    return { isValid: false, error: 'Email local part is too long' };
  }

  if (domain.length > 255) {
    return { isValid: false, error: 'Email domain is too long' };
  }

  return {
    isValid: true,
    normalizedEmail: trimmed,
  };
}

export function normalizeEmail(email: string): string | null {
  const result = validateEmail(email);
  return result.isValid ? result.normalizedEmail || null : null;
}
