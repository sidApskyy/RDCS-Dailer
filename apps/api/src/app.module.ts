import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerService } from './common/logger/logger.service';
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
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    PrismaModule,
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
