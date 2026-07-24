import { PhoneNormalizerService } from './phone-normalizer.service';

describe('PhoneNormalizerService', () => {
  let service: PhoneNormalizerService;

  beforeEach(() => {
    service = new PhoneNormalizerService();
  });

  describe('normalize', () => {
    it('normalizes a US 10-digit number to E.164', () => {
      const result = service.normalize('(415) 555-1234', 'US');
      expect(result.normalized).toBe('+14155551234');
      expect(result.countryCode).toBe('US');
      expect(result.isValid).toBe(true);
    });

    it('preserves the original input', () => {
      const result = service.normalize('415-555-1234', 'US');
      expect(result.original).toBe('415-555-1234');
    });

    it('does not double-add the country code when already present', () => {
      const result = service.normalize('14155551234', 'US');
      expect(result.normalized).toBe('+14155551234');
    });

    it('handles a leading + prefix with country code', () => {
      const result = service.normalize('+14155551234', 'US');
      expect(result.normalized).toBe('+14155551234');
      expect(result.isValid).toBe(true);
    });

    it('strips formatting characters', () => {
      const result = service.normalize('+1 (415) 555.1234', 'US');
      expect(result.normalized).toBe('+14155551234');
    });

    it('marks too-short numbers as invalid', () => {
      const result = service.normalize('12345', 'US');
      expect(result.isValid).toBe(false);
    });
  });
});
