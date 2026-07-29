import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelephonyThrottlerGuard } from './common/guards/telephony-throttler.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { AttemptModule } from './modules/attempt/attempt.module';
import { AuthModule } from './modules/auth/auth.module';
import { CallbackModule } from './modules/callback/callback.module';
import { CallingWindowModule } from './modules/calling-window/calling-window.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ConsentModule } from './modules/consent/consent.module';
import { DispositionModule } from './modules/disposition/disposition.module';
import { DNCModule } from './modules/dnc/dnc.module';
import { LeadModule } from './modules/lead/lead.module';
import { LeadImportModule } from './modules/lead-import/lead-import.module';
import { LeadListModule } from './modules/lead-list/lead-list.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'telephony',
        ttl: 60_000,
        limit: 30,
      },
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    LoggerModule,
    AuthModule,
    RbacModule,
    CampaignModule,
    LeadListModule,
    LeadModule,
    LeadImportModule,
    DispositionModule,
    CallbackModule,
    ConsentModule,
    DNCModule,
    CallingWindowModule,
    AttemptModule,
    ComplianceModule,
    TelephonyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: TelephonyThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
