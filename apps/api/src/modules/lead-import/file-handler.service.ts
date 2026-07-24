import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  fileName?: string;
}

@Injectable()
export class FileHandlerService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_EXTENSIONS = ['.csv'];

  async validateFile(filePath: string): Promise<FileValidationResult> {
    try {
      if (!fs.existsSync(filePath)) {
        return { isValid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();

      // Check file size
      if (stats.size === 0) {
        return { isValid: false, error: 'File is empty' };
      }

      if (stats.size > this.MAX_FILE_SIZE) {
        return { isValid: false, error: `File size exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB` };
      }

      // Check file extension
      if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
        return { isValid: false, error: `Invalid file extension. Allowed: ${this.ALLOWED_EXTENSIONS.join(', ')}` };
      }

      // Check if file is readable
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch {
        return { isValid: false, error: 'File is not readable' };
      }

      return {
        isValid: true,
        fileSize: stats.size,
        fileName,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  async safeDeleteFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      // Log error but don't throw - file cleanup is not critical
      console.error('Failed to delete file:', filePath, error);
    }
  }

  getSafeFilePath(baseDir: string, fileName: string): string {
    // Prevent path traversal
    const sanitizedFileName = path.basename(fileName);
    return path.join(baseDir, sanitizedFileName);
  }
}
