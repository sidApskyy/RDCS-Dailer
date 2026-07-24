import { CsvParserService } from '../../src/modules/lead-import/csv-parser.service';

describe('CSV Parser Tests', () => {
  let parser: CsvParserService;

  beforeAll(() => {
    parser = new CsvParserService();
  });

  describe('CSV Parsing', () => {
    it('should parse simple CSV content', () => {
      const csv = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
      const result = parser.parseCsvContent(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      expect(result[1]).toEqual({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      });
    });

    it('should handle quoted fields', () => {
      const csv = 'name,description\n"Test, Inc","A company with, commas"';
      const result = parser.parseCsvContent(csv);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test, Inc');
      expect(result[0].description).toBe('A company with, commas');
    });

    it('should handle empty lines', () => {
      const csv = 'firstName,lastName\nJohn,Doe\n\nJane,Smith';
      const result = parser.parseCsvContent(csv);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty content', () => {
      const result = parser.parseCsvContent('');
      expect(result).toHaveLength(0);
    });

    it('should extract headers correctly', () => {
      const csv = 'firstName,lastName,email,phone\nJohn,Doe,john@example.com,1234567890';
      const headers = parser.getHeaders(csv);

      expect(headers).toEqual(['firstName', 'lastName', 'email', 'phone']);
    });
  });
});
