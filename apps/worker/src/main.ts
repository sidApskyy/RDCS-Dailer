import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

import { validateEnv } from './env.validation';
import { processCsvImport, CsvImportJobData } from './jobs/csv-import.processor';
import { logger } from './logger';

validateEnv();

const redis = new IORedis(process.env.REDIS_URL || 'redis://:rdcs@localhost:6379/0', {
  maxRetriesPerRequest: null,
});

redis.on('ready', () => logger.info('RDCS worker Redis connection ready'));
redis.on('error', (error) => logger.error('RDCS worker Redis connection error', error.message));

const csvImportWorker = new Worker<CsvImportJobData>(
  'csv-import',
  async (job: Job<CsvImportJobData>) => {
    logger.info('Processing CSV import job', { jobId: job.id, data: job.data });
    return processCsvImport(job);
  },
  { connection: redis },
);

csvImportWorker.on('failed', (job, err) => {
  logger.error('CSV import job failed', { jobId: job?.id, error: err.message, stack: err.stack });
});

csvImportWorker.on('completed', (job, result) => {
  logger.info('CSV import job completed', { jobId: job?.id, result });
});

logger.info('RDCS worker started');

const shutdown = async () => {
  await csvImportWorker.close();
  await redis.quit();
  logger.info('RDCS worker shutdown complete');
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
