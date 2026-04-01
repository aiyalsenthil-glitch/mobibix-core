import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppCron } from './whatsapp.cron';
import { SafeWhatsAppCron } from './safe-whatsapp.cron';
import { WhatsAppRemindersCron } from './whatsapp-reminders.cron';
import { WhatsAppRemindersService } from './whatsapp-reminders.service';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppWebhookController } from './whatsapp.webhook.controller';
import { WhatsAppSettingsController } from './whatsapp-settings.controller';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppDebugController } from './whatsapp-debug.controller';
import { WhatsAppPhoneNumbersController } from './phone-numbers/whatsapp-phone-numbers.controller';
import { WhatsAppPhoneNumbersService } from './phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppVariableResolver } from './variable-resolver.service';
import { BillingModule } from '../../core/billing/billing.module';
import { EmailModule } from '../../common/email/email.module';
import { MetaTokenExpiryCron } from './meta-token-expiry.cron';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationSafetyService } from './automation-safety.service';
import { EntityResolverService } from './entity-resolver.service';
import { WhatsAppUserController } from './whatsapp-user.controller';
import { WhatsAppUserService } from './whatsapp-user.service';
import { WhatsAppCrmController } from './whatsapp-crm.controller';
import { ShopProductsModule } from '../../core/shop-products/shop-products.module';
import { WhatsAppCapabilityRouter } from './router/whatsapp-capability.router';
import { RetailDemoHandler } from './capabilities/retail-demo/retail-demo.handler';
import { RetailDemoCatalog } from './capabilities/retail-demo/retail-demo.catalog';
import { WhatsAppCrmService } from './whatsapp-crm.service';
import { WhatsAppCrmSubscriptionGuard } from './guards/whatsapp-crm-subscription.guard';
import { WhatsAppCrmEnabledGuard } from './guards/whatsapp-crm-enabled.guard';
import { WhatsAppCrmPhoneNumberGuard } from './guards/whatsapp-crm-phone-number.guard';
import { WhatsAppTokenService } from './whatsapp-token.service';
import { WhatsAppRoutingService } from './whatsapp-routing.service';
import { MetaProvider } from './providers/meta.provider';
import { BaileysProvider } from './providers/baileys.provider';
import { AuthkeyProvider } from './providers/REMOVED_TOKEN.provider';
import { ProviderManager } from './providers/provider-manager.service';
import { WhatsAppOnboardingController } from './onboarding/whatsapp-onboarding.controller';
import { WhatsAppOnboardingService } from './onboarding/whatsapp-onboarding.service';
import { FacebookDeletionController } from './facebook-deletion.controller';
import { WhatsAppInboxGateway } from './inbox/whatsapp-inbox.gateway';
import { WhatsAppInboxService } from './inbox/whatsapp-inbox.service';
import { ConversationEngineService } from './automation/conversation-engine.service';
// Campaign Engine
import { CampaignController } from './campaigns/campaign.controller';
import { CampaignService } from './campaigns/campaign.service';
import { CampaignProcessor } from './campaigns/campaign.processor';
import { AdminWhatsAppController } from './admin-whatsapp.controller';

@Module({
  controllers: [
    WhatsAppWebhookController,
    WhatsAppSettingsController,
    WhatsAppController,
    WhatsAppPhoneNumbersController,
    AutomationController,
    WhatsAppDebugController,
    WhatsAppUserController,
    WhatsAppCrmController,
    WhatsAppOnboardingController,
    FacebookDeletionController,
    CampaignController,
    AdminWhatsAppController,
  ],
  imports: [
    ScheduleModule.forRoot(),
    BillingModule,
    EmailModule,
    ShopProductsModule,
    BullModule.registerQueue({ name: 'whatsapp-send' }),
    BullModule.registerQueue({ name: 'whatsapp-campaigns' }),
  ],
  providers: [
    PrismaService,
    WhatsAppSender,
    WhatsAppCron,
    SafeWhatsAppCron,
    WhatsAppLogger,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
    AutomationService,
    AutomationSafetyService,
    EntityResolverService,
    WhatsAppRemindersService,
    WhatsAppRemindersCron,
    WhatsAppUserService,
    WhatsAppCapabilityRouter,
    RetailDemoHandler,
    RetailDemoCatalog,
    WhatsAppCrmService,
    WhatsAppCrmSubscriptionGuard,
    WhatsAppCrmEnabledGuard,
    WhatsAppCrmPhoneNumberGuard,
    WhatsAppTokenService,
    WhatsAppRoutingService,
    MetaProvider,
    BaileysProvider,   // kept for existing WEB_SOCKET records in DB (read-only compatibility)
    AuthkeyProvider,
    ProviderManager,
    WhatsAppOnboardingService,
    MetaTokenExpiryCron,
    ConversationEngineService,
    WhatsAppInboxGateway,
    WhatsAppInboxService,
    // Campaign Engine
    CampaignService,
    CampaignProcessor,
  ],
  exports: [
    WhatsAppSender,
    WhatsAppPhoneNumbersService,
    WhatsAppVariableResolver,
    AutomationService,
    WhatsAppCrmService,
    WhatsAppCrmSubscriptionGuard,
    WhatsAppCrmEnabledGuard,
    WhatsAppCrmPhoneNumberGuard,
    WhatsAppTokenService,
    WhatsAppRoutingService,
    WhatsAppOnboardingService,
    CampaignService,
  ],
})
export class WhatsAppModule {}
