import { Injectable } from '@nestjs/common';

export interface NormalizedPhone {
  original: string;
  normalized: string;
  countryCode: string;
  isValid: boolean;
}

@Injectable()
export class PhoneNormalizerService {
  normalize(phone: string, country: string = 'US'): NormalizedPhone {
    const original = phone.trim();
    
    // Remove all non-numeric characters except leading +
    let cleaned = original.replace(/[^\d+]/g, '');
    
    // Determine country code
    let countryCode = country.toUpperCase();
    
    // If number starts with +, extract the dialing code
    if (cleaned.startsWith('+')) {
      const digits = cleaned.substring(1);
      const match = this.matchDialingCode(digits);
      if (match) {
        countryCode = match.iso;
        cleaned = digits.substring(match.dialingCode.length);
      } else {
        // Default to US if no dialing code detected
        countryCode = 'US';
        cleaned = digits;
      }
    }
    
    // Normalize to E.164 format
    const normalized = this.toE164(cleaned, countryCode);
    
    return {
      original,
      normalized,
      countryCode,
      isValid: this.isValidPhoneNumber(normalized),
    };
  }

  private toE164(phone: string, countryCode: string): string {
    // Remove leading 0 for countries that use it
    if (phone.startsWith('0') && ['GB', 'FR', 'DE', 'IT', 'ES'].includes(countryCode)) {
      phone = phone.substring(1);
    }
    
    // Get country dialing code
    const dialingCode = this.getDialingCode(countryCode);
    
    // If number doesn't start with country code, add it
    if (!phone.startsWith(dialingCode)) {
      phone = dialingCode + phone;
    }
    
    return '+' + phone;
  }

  private getDialingCode(countryCode: string): string {
    const codes: Record<string, string> = {
      US: '1',
      CA: '1',
      GB: '44',
      FR: '33',
      DE: '49',
      IT: '39',
      ES: '34',
      AU: '61',
      JP: '81',
      CN: '86',
      IN: '91',
      BR: '55',
      MX: '52',
    };
    
    return codes[countryCode] || '1'; // Default to US/Canada
  }

  private matchDialingCode(digits: string): { dialingCode: string; iso: string } | null {
    // Longer codes first to avoid matching a shorter prefix incorrectly
    const codeToCountry: Array<{ dialingCode: string; iso: string }> = [
      { dialingCode: '44', iso: 'GB' },
      { dialingCode: '33', iso: 'FR' },
      { dialingCode: '49', iso: 'DE' },
      { dialingCode: '39', iso: 'IT' },
      { dialingCode: '34', iso: 'ES' },
      { dialingCode: '61', iso: 'AU' },
      { dialingCode: '81', iso: 'JP' },
      { dialingCode: '86', iso: 'CN' },
      { dialingCode: '91', iso: 'IN' },
      { dialingCode: '55', iso: 'BR' },
      { dialingCode: '52', iso: 'MX' },
      { dialingCode: '1', iso: 'US' },
    ];

    for (const entry of codeToCountry) {
      if (digits.startsWith(entry.dialingCode) && digits.length > entry.dialingCode.length + 6) {
        return entry;
      }
    }

    return null;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // E.164 format: + followed by country code and number
    // Total length should be between 8 and 15 digits (excluding +)
    return /^\+\d{8,15}$/.test(phone);
  }
}
