import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { LoggerService } from './common/logger/logger.service';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { validateEnv } from './common/validation/env.validation';
import { TelephonySocketService } from './modules/telephony/telephony-socket.service';

async function bootstrap() {
  // Validate environment variables
  validateEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(CorrelationMiddleware);

  const config = new DocumentBuilder()
    .setTitle('RDCS API')
    .setDescription('RDCS In-House Dialer Platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  app.get(TelephonySocketService).attach(app.getHttpServer());
  logger.log(`RDCS API running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
