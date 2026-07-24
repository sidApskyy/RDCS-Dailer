import { Injectable } from '@nestjs/common';

export interface ValidationError {
  rowNumber: number;
  column: string;
  errorCode: string;
  errorMessage: string;
  originalValue: any;
  normalizedValue?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class CsvValidatorService {
  validateRow(row: any, rowNumber: number): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate phone (required)
    if (!row.phone || typeof row.phone !== 'string' || row.phone.trim() === '') {
      errors.push({
        rowNumber,
        column: 'phone',
        errorCode: 'PHONE_REQUIRED',
        errorMessage: 'Phone number is required',
        originalValue: row.phone,
      });
    } else if (!this.isValidPhoneFormat(row.phone)) {
      errors.push({
        rowNumber,
        column: 'phone',
        errorCode: 'PHONE_INVALID',
        errorMessage: 'Phone number format is invalid',
        originalValue: row.phone,
      });
    }

    // Validate email if provided
    if (row.email && row.email.trim() !== '' && !this.isValidEmail(row.email)) {
      errors.push({
        rowNumber,
        column: 'email',
        errorCode: 'EMAIL_INVALID',
        errorMessage: 'Email format is invalid',
        originalValue: row.email,
      });
    }

    // Validate timezone if provided
    if (row.timezone && row.timezone.trim() !== '' && !this.isValidTimezone(row.timezone)) {
      errors.push({
        rowNumber,
        column: 'timezone',
        errorCode: 'TIMEZONE_INVALID',
        errorMessage: 'Timezone is invalid (must be IANA format)',
        originalValue: row.timezone,
      });
    }

    // Validate country if provided
    if (row.country && row.country.trim() !== '' && row.country.length !== 2) {
      errors.push({
        rowNumber,
        column: 'country',
        errorCode: 'COUNTRY_INVALID',
        errorMessage: 'Country must be 2-letter ISO code',
        originalValue: row.country,
      });
    }

    // Validate zip if provided
    if (row.zip && row.zip.trim() !== '' && !/^[a-zA-Z0-9\s-]+$/.test(row.zip)) {
      errors.push({
        rowNumber,
        column: 'zip',
        errorCode: 'ZIP_INVALID',
        errorMessage: 'ZIP code contains invalid characters',
        originalValue: row.zip,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private isValidPhoneFormat(phone: string): boolean {
    // Basic phone validation - allows various formats
    const cleaned = phone.replace(/[\s\-() +]/g, '');
    return /^\d{7,15}$/.test(cleaned);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidTimezone(timezone: string): boolean {
    // Basic IANA timezone validation
    try {
      // Check if it matches IANA timezone pattern
      return /^[A-Za-z]+\/[A-Za-z_]+$/.test(timezone);
    } catch {
      return false;
    }
  }
}
