import { CsvValidatorService } from './csv-validator.service';

describe('CsvValidatorService', () => {
  let service: CsvValidatorService;

  beforeEach(() => {
    service = new CsvValidatorService();
  });

  it('accepts a valid row', () => {
    const result = service.validateRow(
      { phone: '4155551234', email: 'a@b.com', timezone: 'America/New_York', country: 'US', zip: '94105' },
      1,
    );
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a row without a phone', () => {
    const result = service.validateRow({ phone: '' }, 2);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].errorCode).toBe('PHONE_REQUIRED');
    expect(result.errors[0].rowNumber).toBe(2);
  });

  it('rejects an invalid phone format', () => {
    const result = service.validateRow({ phone: 'abc' }, 3);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.errorCode === 'PHONE_INVALID')).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = service.validateRow({ phone: '4155551234', email: 'not-an-email' }, 4);
    expect(result.errors.some((e) => e.errorCode === 'EMAIL_INVALID')).toBe(true);
  });

  it('rejects an invalid timezone', () => {
    const result = service.validateRow({ phone: '4155551234', timezone: 'NotAZone' }, 5);
    expect(result.errors.some((e) => e.errorCode === 'TIMEZONE_INVALID')).toBe(true);
  });

  it('rejects a country code that is not 2 letters', () => {
    const result = service.validateRow({ phone: '4155551234', country: 'USA' }, 6);
    expect(result.errors.some((e) => e.errorCode === 'COUNTRY_INVALID')).toBe(true);
  });

  it('allows empty optional fields', () => {
    const result = service.validateRow({ phone: '4155551234', email: '', timezone: '', country: '' }, 7);
    expect(result.isValid).toBe(true);
  });
});
