import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [
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

if (isProduction) {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/worker-error-%DATE%.log',
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
    new DailyRotateFile({
      filename: 'logs/worker-combined-%DATE%.log',
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

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transports,
  defaultMeta: { service: 'worker' },
  format: winston.format.combine(
    winston.format((info) => {
      const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
      const filteredInfo = { ...info };

      for (const key of sensitiveKeys) {
        if (key in filteredInfo && filteredInfo[key as keyof typeof filteredInfo]) {
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
