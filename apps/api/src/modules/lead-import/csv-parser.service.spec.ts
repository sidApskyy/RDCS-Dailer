import { CsvParserService } from './csv-parser.service';

describe('CsvParserService', () => {
  let service: CsvParserService;

  beforeEach(() => {
    service = new CsvParserService();
  });

  it('parses a simple CSV into rows keyed by header', () => {
    const content = 'first_name,phone\nJohn,4155551234\nJane,4155555678';
    const rows = service.parseCsvContent(content);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ first_name: 'John', phone: '4155551234' });
    expect(rows[1]).toEqual({ first_name: 'Jane', phone: '4155555678' });
  });

  it('handles quoted fields containing commas', () => {
    const content = 'name,note\n"Doe, John","hello, world"';
    const rows = service.parseCsvContent(content);
    expect(rows[0].name).toBe('Doe, John');
    expect(rows[0].note).toBe('hello, world');
  });

  it('ignores blank lines', () => {
    const content = 'a,b\n1,2\n\n3,4\n';
    const rows = service.parseCsvContent(content);
    expect(rows).toHaveLength(2);
  });

  it('fills missing trailing columns with empty strings', () => {
    const content = 'a,b,c\n1,2';
    const rows = service.parseCsvContent(content);
    expect(rows[0]).toEqual({ a: '1', b: '2', c: '' });
  });

  it('returns an empty array for empty content', () => {
    expect(service.parseCsvContent('')).toEqual([]);
  });
});
