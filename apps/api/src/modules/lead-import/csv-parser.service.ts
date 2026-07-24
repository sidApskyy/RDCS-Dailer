import * as fs from 'fs';

import { Injectable } from '@nestjs/common';

export interface ParsedRow {
  [key: string]: string;
}

@Injectable()
export class CsvParserService {
  async parseCsv(filePath: string): Promise<ParsedRow[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseCsvContent(content);
  }

  parseCsvContent(content: string): ParsedRow[] {
    const lines = content.split('\n').filter((line: string) => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseLine(lines[0]);
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseLine(lines[i]);
      const row: ParsedRow = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || '';
      }
      
      rows.push(row);
    }

    return rows;
  }

  getHeaders(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line: string) => line.trim());

    if (lines.length === 0) return [];

    return this.parseLine(lines[0]);
  }

  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}
