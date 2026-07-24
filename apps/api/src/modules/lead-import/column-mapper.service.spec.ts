import { ColumnMapperService } from './column-mapper.service';

describe('ColumnMapperService', () => {
  let service: ColumnMapperService;

  beforeEach(() => {
    service = new ColumnMapperService();
  });

  it('maps standard columns by name', () => {
    const result = service.detectMapping(['First Name', 'Phone', 'Email']);
    expect(result.mapping['First Name']).toBe('first_name');
    expect(result.mapping['Phone']).toBe('phone');
    expect(result.mapping['Email']).toBe('email');
    expect(result.missingRequired).toHaveLength(0);
  });

  it('flags a missing required phone column', () => {
    const result = service.detectMapping(['Name', 'Email']);
    expect(result.missingRequired).toContain('phone');
  });

  it('treats unknown columns as custom fields', () => {
    const result = service.detectMapping(['Phone', 'Loan Amount']);
    expect(result.extraColumns).toContain('Loan Amount');
    expect(result.mapping['Loan Amount']).toMatch(/^custom_/);
  });

  it('applies the mapping to a raw row', () => {
    const { mapping } = service.detectMapping(['Phone', 'Email']);
    const mapped = service.applyMapping({ Phone: '4155551234', Email: 'a@b.com' }, mapping);
    expect(mapped.phone).toBe('4155551234');
    expect(mapped.email).toBe('a@b.com');
  });
});
