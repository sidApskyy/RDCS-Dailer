import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        format: isDevelopment
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
              }),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.errors({ stack: true }),
              winston.format.json(),
            ),
      }),
    ];

    // File transports (only in production)
    if (isProduction) {
      transports.push(
        // Error log file
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
        // Combined log file
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      transports,
      // Sensitive data filtering
      format: winston.format.combine(
        winston.format((info) => {
          // Filter out sensitive data
          const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
          const filteredInfo = { ...info };

          for (const key of sensitiveKeys) {
            if (key in filteredInfo) {
              (filteredInfo as Record<string, unknown>)[key] = '[REDACTED]';
            }
            if (filteredInfo.meta && typeof filteredInfo.meta === 'object' && key in filteredInfo.meta) {
              (filteredInfo.meta as Record<string, unknown>)[key] = '[REDACTED]';
            }
          }

          return filteredInfo;
        })(),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    });
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, { context, trace, ...meta });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, { context, ...meta });
  }

  setContext(_context: string): void {
    // Winston doesn't have a built-in context, so we pass it in each log call
    // This method is a no-op but kept for NestJS LoggerService compatibility
  }
}
