import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';

import { MockTelephonyAdapter } from './mock-telephony.adapter';
import { PROVIDER_REGISTRY, ProviderRegistry, ProviderRegistryImpl } from './provider-registry.service';
import { TelephonySocketService } from './telephony-socket.service';
import { TELEPHONY_ADAPTER } from './telephony.adapter';
import { TelephonyController } from './telephony.controller';
import { TelephonyEvents } from './telephony.events';
import { TelephonyService } from './telephony.service';
import { TwilioAdapter } from './twilio.adapter';

@Module({
  imports: [PrismaModule, ComplianceModule, AuthModule],
  controllers: [TelephonyController],
  providers: [
    TelephonyEvents,
    TelephonyService,
    TelephonySocketService,
    MockTelephonyAdapter,
    TwilioAdapter,
    ProviderRegistryImpl,
    { provide: PROVIDER_REGISTRY, useExisting: ProviderRegistryImpl },
    {
      provide: TELEPHONY_ADAPTER,
      useFactory: (registry: ProviderRegistry, mockAdapter: MockTelephonyAdapter, twilioAdapter: TwilioAdapter) => {
        registry.register('mock', mockAdapter);
        registry.register('twilio', twilioAdapter);
        return registry.resolve();
      },
      inject: [PROVIDER_REGISTRY, MockTelephonyAdapter, TwilioAdapter],
    },
  ],
  exports: [TelephonyService, TelephonyEvents],
})
export class TelephonyModule {}
