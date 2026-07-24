import * as fs from 'fs';

import { PrismaClient } from '@rdcs/database';
import { Job } from 'bullmq';

import { logger } from '../logger';


const prisma = new PrismaClient();

export interface CsvImportJobData {
  tenantId: string;
  importId: string;
  leadListId: string;
  filePath: string;
  userId: string;
}

export async function processCsvImport(job: Job<CsvImportJobData>) {
  const { tenantId, importId, leadListId, filePath, userId } = job.data;

  logger.info('Starting CSV import job', { jobId: job.id, importId, tenantId });

  try {
    // Update import status to processing
    await prisma.leadListImport.update({
      where: { id: importId },
      data: { status: 'processing', startedAt: new Date() },
    });

    // Read and parse CSV
    const rows = await readCsvFile(filePath);
    const totalRows = rows.length;

    if (totalRows === 0) {
      throw new Error('CSV file is empty');
    }

    await prisma.leadListImport.update({
      where: { id: importId },
      data: { totalRows },
    });

    // Get headers for column mapping
    const headers = Object.keys(rows[0]);
    const mapping = detectColumnMapping(headers);

    let processedRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    let duplicateRows = 0;
    let suppressedRows = 0;
    let invalidRows = 0;

    // Process rows in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        const rowNumber = i + rows.indexOf(row) + 1;

        try {
          const result = await processRow(tenantId, leadListId, row, rowNumber, importId, mapping, userId);
          
          if (result.status === 'processed') {
            successfulRows++;
          } else if (result.status === 'duplicate') {
            duplicateRows++;
          } else if (result.status === 'suppressed') {
            suppressedRows++;
          } else if (result.status === 'invalid') {
            invalidRows++;
          }

          processedRows++;
        } catch (error) {
          failedRows++;
          processedRows++;
          
          await prisma.leadImportRow.create({
            data: {
              importId,
              rowNumber,
              status: 'failed',
              rawData: row,
              errorCode: 'PROCESSING_ERROR',
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
      }

      // Update progress every batch
      await prisma.leadListImport.update({
        where: { id: importId },
        data: { processedRows, successfulRows, failedRows, duplicateRows, suppressedRows, invalidRows },
      });
      await job.updateProgress(Math.floor((processedRows / totalRows) * 100));
    }

    // Finalize import
    await prisma.leadListImport.update({
      where: { id: importId },
      data: {
        status: 'completed',
        processedRows,
        successfulRows,
        failedRows,
        duplicateRows,
        suppressedRows,
        invalidRows,
        completedAt: new Date(),
      },
    });

    await prisma.leadList.update({
      where: { id: leadListId },
      data: {
        totalRows: { increment: totalRows },
        processedRows: { increment: processedRows },
        successfulRows: { increment: successfulRows },
        failedRows: { increment: failedRows },
        duplicateRows: { increment: duplicateRows },
        suppressedRows: { increment: suppressedRows },
      },
    });

    logger.info('CSV import job completed', { jobId: job.id, importId, successfulRows, failedRows });

    return { success: true, processedRows, successfulRows, failedRows };
  } catch (error) {
    logger.error('CSV import job failed', { jobId: job.id, importId, error });

    await prisma.leadListImport.update({
      where: { id: importId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

async function readCsvFile(filePath: string): Promise<Record<string, string>[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error('File does not exist');
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return parseCsvContent(content);
}

function parseCsvContent(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((line: string) => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
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

function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'));

  const standardColumns = ['first_name', 'last_name', 'phone', 'email', 'address', 'city', 'state', 'zip', 'country', 'timezone', 'external_id'];

  for (const standard of standardColumns) {
    const match = normalizedHeaders.findIndex(h => h === standard || h.includes(standard.replace('_', '')));
    if (match !== -1) {
      mapping[headers[match]] = standard;
    }
  }

  // Map remaining columns as custom fields
  for (let i = 0; i < headers.length; i++) {
    if (!mapping[headers[i]]) {
      mapping[headers[i]] = `custom_${headers[i].toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
  }

  return mapping;
}

async function processRow(
  tenantId: string,
  leadListId: string,
  row: Record<string, string>,
  rowNumber: number,
  importId: string,
  mapping: Record<string, string>,
  userId: string,
): Promise<{ status: string; leadId?: string }> {
  // Apply column mapping
  const mapped: Record<string, string | undefined> = {};
  for (const [csvColumn, internalField] of Object.entries(mapping)) {
    mapped[internalField] = row[csvColumn];
  }

  // Validate required fields
  if (!mapped.phone || mapped.phone.trim() === '') {
    await prisma.leadImportRow.create({
      data: {
        importId,
        rowNumber,
        status: 'invalid',
        rawData: row,
        normalizedData: mapped,
        errorCode: 'PHONE_REQUIRED',
        errorMessage: 'Phone number is required',
      },
    });
    return { status: 'invalid' };
  }

  // Normalize phone
  const normalizedPhone = normalizePhone(mapped.phone, mapped.country || 'US');

  // Check for duplicates
  const existingPhone = await prisma.leadPhone.findFirst({
    where: {
      tenantId,
      phoneNumber: normalizedPhone.normalized,
      lead: {
        leadListId,
        deletedAt: null,
      },
    },
  });

  if (existingPhone) {
    await prisma.leadImportRow.create({
      data: {
        importId,
        rowNumber,
        status: 'duplicate',
        rawData: row,
        normalizedData: mapped,
        leadId: existingPhone.leadId,
      },
    });
    return { status: 'duplicate', leadId: existingPhone.leadId };
  }

  // Check external ID duplicate if provided
  if (mapped.external_id) {
    const existingExternal = await prisma.lead.findFirst({
      where: {
        tenantId,
        leadListId,
        externalId: mapped.external_id,
        deletedAt: null,
      },
    });

    if (existingExternal) {
      await prisma.leadImportRow.create({
        data: {
          importId,
          rowNumber,
          status: 'duplicate',
          rawData: row,
          normalizedData: mapped,
          leadId: existingExternal.id,
        },
      });
      return { status: 'duplicate', leadId: existingExternal.id };
    }
  }

  // Check DNC
  const dncEntry = await prisma.dNCEntry.findFirst({
    where: {
      tenantId,
      phoneNumber: normalizedPhone.normalized,
      dncList: {
        isActive: true,
      },
    },
  });

  if (dncEntry) {
    await prisma.leadImportRow.create({
      data: {
        importId,
        rowNumber,
        status: 'suppressed',
        rawData: row,
        normalizedData: mapped,
        errorCode: 'DNC_SUPPRESSED',
        errorMessage: 'Phone number is on DNC list',
      },
    });
    return { status: 'suppressed' };
  }

  // Create lead
  const lead = await prisma.lead.create({
    data: {
      tenantId,
      leadListId,
      externalId: mapped.external_id,
      firstName: mapped.first_name,
      lastName: mapped.last_name,
      email: mapped.email,
      timezone: mapped.timezone || 'UTC',
      customFields: extractCustomFields(mapped) || undefined,
      status: 'new',
      createdBy: userId,
      phones: {
        create: {
          tenantId,
          phoneNumber: normalizedPhone.normalized,
          type: 'mobile',
          isPrimary: true,
          isValid: normalizedPhone.isValid,
          normalizedNumber: normalizedPhone.normalized,
        },
      },
    },
  });

  await prisma.leadImportRow.create({
    data: {
      importId,
      rowNumber,
      status: 'processed',
      rawData: row,
      normalizedData: mapped,
      leadId: lead.id,
    },
  });

  return { status: 'processed', leadId: lead.id };
}

function normalizePhone(phone: string, country: string): { normalized: string; isValid: boolean } {
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Simple E.164 normalization (defaults to US/CA dialing code)
  const dialingCode = country === 'US' || country === 'CA' ? '1' : '1';
  let normalized = cleaned;

  if (!normalized.startsWith(dialingCode)) {
    normalized = dialingCode + normalized;
  }

  return {
    normalized: '+' + normalized,
    isValid: /^\+\d{10,15}$/.test('+' + normalized),
  };
}

function extractCustomFields(mapped: Record<string, string | undefined>): Record<string, string> | null {
  const custom: Record<string, string> = {};
  for (const [key, value] of Object.entries(mapped)) {
    if (key.startsWith('custom_') && value !== undefined) {
      custom[key.replace('custom_', '')] = value;
    }
  }
  return Object.keys(custom).length > 0 ? custom : null;
}
