import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CrmIntegrationService } from './services/crm-integration.service';
import { MobileShopCrmController } from './crm-integration.controller';
import { CrmEventListener } from './services/crm-event.listener';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { FollowUpsModule } from '../../core/follow-ups/follow-ups.module';

/**
 * MobileShop Integration Module
 *
 * Purpose: Wire up CRM features for MobileShop (mobile repair app)
 *
 * Responsibilities:
 * - Provide CrmIntegrationService for all MobileShop controllers
 * - Consume CORE CRM APIs (Dashboard, Follow-ups, Timeline, WhatsApp)
 * - NEVER re-implement CRM logic
 * - NEVER expose CRM tables or business logic
 *
 * Clean Architecture:
 * - MobileShop.Module imports CRM services but CORE never imports MobileShop
 * - CustomerId is the only link between MobileShop and CRM
 * - All CRM calls go through CrmIntegrationService (HTTP layer)
 *
 * Modules:
 * - JobCardsModule: Mobile repair jobs
 * - IMEIModule: Device tracking
 * - MobileShopInvoicesModule: Repair invoices
 * - CrmIntegrationModule (this): CRM feature wiring
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const port = configService.get('PORT') || 3000;
        const baseUrl =
          configService.get<string>('CORE_API_BASE_URL') ||
          `http://localhost_REPLACED:${port}`;
        return {
          baseURL: baseUrl,
          timeout: 10000,
        };
      },
      inject: [ConfigService],
    }),
    WhatsAppModule,
    FollowUpsModule,
  ],
  controllers: [MobileShopCrmController],
  providers: [CrmIntegrationService, CrmEventListener],
  exports: [CrmIntegrationService],
})
export class CrmIntegrationModule {}
