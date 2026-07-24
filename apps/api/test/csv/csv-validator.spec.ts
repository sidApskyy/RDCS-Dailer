import { CsvValidatorService } from '../../src/modules/lead-import/csv-validator.service';

describe('CSV Validator Tests', () => {
  let validator: CsvValidatorService;

  beforeAll(() => {
    validator = new CsvValidatorService();
  });

  describe('Phone Validation', () => {
    it('should validate correct phone format', () => {
      const row = {
        phone: '+1234567890',
        email: 'test@example.com',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing phone', () => {
      const row = {
        phone: '',
        email: 'test@example.com',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorCode).toBe('PHONE_REQUIRED');
    });

    it('should reject invalid phone format', () => {
      const row = {
        phone: 'invalid',
        email: 'test@example.com',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe('PHONE_INVALID');
    });

    it('should accept phone with various formats', () => {
      const validPhones = [
        '1234567890',
        '(123) 456-7890',
        '+1 (123) 456-7890',
        '123-456-7890',
      ];

      validPhones.forEach(phone => {
        const row = { phone, email: 'test@example.com' };
        const result = validator.validateRow(row, 1);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      const row = {
        phone: '+1234567890',
        email: 'test@example.com',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const row = {
        phone: '+1234567890',
        email: 'invalid-email',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe('EMAIL_INVALID');
    });

    it('should allow empty email', () => {
      const row = {
        phone: '+1234567890',
        email: '',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Timezone Validation', () => {
    it('should validate correct IANA timezone', () => {
      const row = {
        phone: '+1234567890',
        timezone: 'America/New_York',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid timezone', () => {
      const row = {
        phone: '+1234567890',
        timezone: 'Invalid/Timezone',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe('TIMEZONE_INVALID');
    });

    it('should allow empty timezone', () => {
      const row = {
        phone: '+1234567890',
        timezone: '',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Country Validation', () => {
    it('should validate correct 2-letter country code', () => {
      const row = {
        phone: '+1234567890',
        country: 'US',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid country code', () => {
      const row = {
        phone: '+1234567890',
        country: 'USA',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe('COUNTRY_INVALID');
    });

    it('should allow empty country', () => {
      const row = {
        phone: '+1234567890',
        country: '',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });
  });

  describe('ZIP Code Validation', () => {
    it('should validate correct ZIP format', () => {
      const row = {
        phone: '+1234567890',
        zip: '12345',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });

    it('should validate ZIP with dash', () => {
      const row = {
        phone: '+1234567890',
        zip: '12345-6789',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });

    it('should reject ZIP with invalid characters', () => {
      const row = {
        phone: '+1234567890',
        zip: '12@45',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe('ZIP_INVALID');
    });

    it('should allow empty ZIP', () => {
      const row = {
        phone: '+1234567890',
        zip: '',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Multiple Errors', () => {
    it('should report multiple validation errors', () => {
      const row = {
        phone: 'invalid',
        email: 'not-an-email',
        timezone: 'Invalid',
        country: 'USA',
        zip: '12@45',
      };

      const result = validator.validateRow(row, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
