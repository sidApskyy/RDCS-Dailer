import { Injectable } from '@nestjs/common';

export interface ColumnMapping {
  [key: string]: string; // CSV column -> internal field
}

export interface MappingResult {
  mapping: ColumnMapping;
  missingRequired: string[];
  extraColumns: string[];
}

@Injectable()
export class ColumnMapperService {
  private readonly STANDARD_COLUMNS = [
    'first_name',
    'last_name',
    'phone',
    'email',
    'address',
    'city',
    'state',
    'zip',
    'country',
    'timezone',
    'external_id',
  ];

  private readonly REQUIRED_COLUMNS = ['phone'];

  detectMapping(headers: string[]): MappingResult {
    const mapping: ColumnMapping = {};
    const missingRequired: string[] = [];
    const extraColumns: string[] = [];

    const normalizedHeaders = headers.map(h => this.normalizeColumnName(h));

    // Map standard columns
    for (const standard of this.STANDARD_COLUMNS) {
      const match = normalizedHeaders.find(h => h === standard || h.includes(standard.replace('_', '')));
      if (match) {
        const originalIndex = normalizedHeaders.indexOf(match);
        mapping[headers[originalIndex]] = standard;
      }
    }

    // Check for required columns
    for (const required of this.REQUIRED_COLUMNS) {
      if (!Object.values(mapping).includes(required)) {
        missingRequired.push(required);
      }
    }

    // Identify extra columns (custom fields)
    for (let i = 0; i < headers.length; i++) {
      if (!mapping[headers[i]]) {
        extraColumns.push(headers[i]);
        mapping[headers[i]] = `custom_${headers[i].toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      }
    }

    return { mapping, missingRequired, extraColumns };
  }

  applyMapping(row: any, mapping: ColumnMapping): any {
    const mapped: any = {};
    for (const [csvColumn, internalField] of Object.entries(mapping)) {
      mapped[internalField] = row[csvColumn];
    }
    return mapped;
  }

  private normalizeColumnName(column: string): string {
    return column
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
