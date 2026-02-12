import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt } from '../../../common/utils/crypto.util';
import axios from 'axios';

@Injectable()
export class WhatsAppOnboardingService {
  private readonly logger = new Logger(WhatsAppOnboardingService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly callbackUrl: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('WHATSAPP_APP_ID') || '';
    this.appSecret =
      this.configService.get<string>('WHATSAPP_APP_SECRET') || '';
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost_REPLACED:3000';
    this.callbackUrl = `${backendUrl}/api/integrations/whatsapp/callback`;

    // Check if WhatsApp is properly configured
    this.isConfigured = !!(this.appId && this.appSecret);

    if (!this.isConfigured) {
      this.logger.warn(
        'WhatsApp onboarding service is not fully configured. Some features may be disabled.',
      );
    }
  }

  /**
   * Generates the Meta Business Login URL with encrypted state
   */
  async generateConnectUrl(
    tenantId: string,
    returnUrl?: string,
  ): Promise<string> {
    // 1. Create State Object (Tenant + Timestamp)
    const statePayload = JSON.stringify({
      tenantId,
      ts: Date.now(),
      nonce: Math.random().toString(36).substring(7),
      returnUrl,
    });

    // 2. Encrypt State (AES-256) - prevents tampering & CSRF
    const encryptedState = encrypt(statePayload);

    // 3. Construct URL
    const scopes = 'whatsapp_business_management,whatsapp_business_messaging';
    const configId = this.configService.get<string>('WHATSAPP_CONFIG_ID') || '';

    // 4. Embedded Signup "extras" parameter
    const extras = JSON.stringify({
      setup: {}, // Pre-fill data can go here
      sessionInfoVersion: '3', // Must be '3'
      version: 'v3', // Must be 'v3'
    });

    // Using Facebook Login for Business flow with Embedded Signup config
    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${
      this.appId
    }&redirect_uri=${encodeURIComponent(
      this.callbackUrl,
    )}&state=${encodeURIComponent(encryptedState)}&scope=${scopes}&response_type=code&config_id=${configId}&extras=${encodeURIComponent(extras)}`;

    return url;
  }

  /**
   * Handles the OAuth callback, exchanges code for token, and saves WABA
   */
  async handleCallback(
    code: string,
    state: string,
    selectedWabaId?: string,
    selectedPhoneNumberId?: string,
  ) {
    // 1. Decrypt & Validate State
    let tenantId: string;
    let payload: any;
    try {
      const decodedState = decrypt(state);
      payload = JSON.parse(decodedState);

      // Expire state after 15 mins
      if (Date.now() - payload.ts > 15 * 60 * 1000) {
        throw new BadRequestException('State expired. Please try again.');
      }
      tenantId = payload.tenantId;
    } catch (error) {
      this.logger.error(`Invalid state in callback: ${error.message}`);
      throw new BadRequestException('Invalid authentication state');
    }

    // 2. Exchange Code for Access Token
    let accessToken: string;
    try {
      // Use v22.0 as per user request/documentation for this flow
      const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token`;

      const { data } = await axios.post(tokenUrl, {
        client_id: this.appId,
        client_secret: this.appSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.callbackUrl, // Must match the one in generateConnectUrl
      });

      accessToken = data.access_token;

      this.logger.log(`Token exchanged successfully for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to exchange token for ${tenantId}: ${error.response?.data?.error?.message || error.message}`,
      );
      throw new BadRequestException('Failed to connect with Meta');
    }

    // 3. Retrieve WABA and Phone Details
    let wabaId: string;
    let phoneNumberId: string;
    let phoneNumber: string;

    try {
      // Step A: Get WABAs associated with the token (Owned and Client)
      // We look for accounts where the user has management permissions
      const wabaFields =
        'id,name,currency,timezone,message_template_namespace,owner_business_info';
      const wabaUrl = `https://graph.facebook.com/v22.0/me/whatsapp_business_accounts?access_token=${accessToken}&fields=${wabaFields}`;
      const { data: wabaData } = await axios.get(wabaUrl);

      if (!wabaData.data || wabaData.data.length === 0) {
        throw new Error('No WhatsApp Business Account found for this user');
      }

      // If wabaId is provided by Embedded Signup response, use it. Otherwise pick first.
      let selectedWaba = wabaData.data[0];

      if (selectedWabaId) {
        const found = wabaData.data.find((w: any) => w.id === selectedWabaId);
        if (found) {
          selectedWaba = found;
        } else {
          this.logger.warn(
            `Provided WABA ID ${selectedWabaId} not found in token's access list. Using default.`,
          );
        }
      }

      wabaId = selectedWaba.id;
      this.logger.log(
        `Found WABA: ${selectedWaba.name} (ID: ${wabaId}) for tenant ${tenantId}`,
      );

      // Step B: Get Phone Numbers for that WABA
      const phoneFields =
        'id,display_phone_number,name_status,code_verification_status,quality_rating';
      const phoneUrl = `https://graph.facebook.com/v22.0/${wabaId}/phone_numbers?access_token=${accessToken}&fields=${phoneFields}`;
      const { data: phoneData } = await axios.get(phoneUrl);

      if (!phoneData.data || phoneData.data.length === 0) {
        throw new Error('No phone numbers found in the selected WABA');
      }

      // If phoneNumberId is provided, use it.
      let phone = phoneData.data[0];

      if (selectedPhoneNumberId) {
        const foundPhone = phoneData.data.find(
          (p: any) => p.id === selectedPhoneNumberId,
        );
        if (foundPhone) {
          phone = foundPhone;
        } else {
          this.logger.warn(
            `Provided Phone ID ${selectedPhoneNumberId} not found in WABA. Using default.`,
          );
        }
      }

      phoneNumberId = phone.id;
      phoneNumber = phone.display_phone_number.replace(/\D/g, ''); // Clean number

      this.logger.log(
        `Found Phone: ${phone.display_phone_number} (ID: ${phoneNumberId}) Status: ${phone.name_status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch Meta assets for ${tenantId}. Error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Failed to connect to Facebook. Please ensure your account has a valid WhatsApp Business Account and Phone Number.',
      );
    }

    // 4. Encrypt Access Token
    const encryptedAccessToken = encrypt(accessToken);

    // 5. Update DB (Atomic Transaction)
    await this.prisma.$transaction([
      // A. Upsert Phone Number
      (this.prisma.whatsAppNumber as any).upsert({
        where: {
          phoneNumberId,
        },
        update: {
          encryptedAccessToken,
          setupStatus: 'ACTIVE',
          isEnabled: true,
          wabaId,
          phoneNumber,
          updatedAt: new Date(),
        } as any,
        create: {
          tenantId,
          phoneNumberId,
          wabaId,
          phoneNumber,
          encryptedAccessToken,
          setupStatus: 'ACTIVE',
          purpose: 'DEFAULT',
          isDefault: true,
          isActive: true,
        } as any,
      }),
      // B. Enable WhatsApp CRM on Tenant
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappCrmEnabled: true },
      }),
      // C. Upsert WhatsApp Setting
      this.prisma.whatsAppSetting.upsert({
        where: { tenantId },
        update: { enabled: true },
        create: {
          tenantId,
          enabled: true,
        },
      }),
    ]);

    this.logger.log(`WhatsApp integration completed for tenant ${tenantId}`);

    // 6. Register Phone Number (MANDATORY for SaaS)
    try {
      await this.registerPhoneNumber(phoneNumberId, accessToken);
      this.logger.log(
        `Phone number registered successfully for tenant ${tenantId}`,
      );
    } catch (e) {
      this.logger.warn(
        `Failed to auto-register phone number: ${e.message}. User might need to do it manually or it's already registered.`,
      );
    }

    // 7. Subscribe App to WABA Webhooks (MANDATORY for receiving messages)
    try {
      await this.subscribeApp(wabaId, accessToken);
      this.logger.log(
        `App subscribed to WABA webhooks successfully for tenant ${tenantId}`,
      );
    } catch (e) {
      this.logger.warn(`Failed to subscribe app to WABA: ${e.message}`);
    }

    return { success: true, returnUrl: payload.returnUrl };
  }

  /**
   * Registers the phone number with a PIN to enable messaging.
   */
  private async registerPhoneNumber(phoneId: string, token: string) {
    const url = `https://graph.facebook.com/v22.0/${phoneId}/register`;
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        pin: '123456', // Default PIN for auto-registration
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  /**
   * Subscribes the App to the WABA's webhooks.
   */
  private async subscribeApp(wabaId: string, token: string) {
    const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;
    await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  }

  /**
   * Disconnects the integration (Soft delete/Deactivate)
   */
  async disconnect(tenantId: string) {
    // 1. Find active number
    const activeNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isEnabled: true },
    });

    if (!activeNumber) {
      return; // Already disconnected
    }

    // 2. Mark as DISCONNECTED
    await this.prisma.whatsAppNumber.update({
      where: { id: activeNumber.id },
      data: {
        isEnabled: false,
        setupStatus: 'DISCONNECTED',
        encryptedAccessToken: null, // Clear token for security
      } as any,
    });

    this.logger.log(`WhatsApp integration disconnected for tenant ${tenantId}`);
    return { success: true };
  }
  /**
   * Manually syncs WhatsApp configuration (for existing/manual setups)
   */
  async manualSync(
    tenantId: string,
    wabaId: string,
    phoneNumberId: string,
    accessToken: string,
    phoneNumber: string,
  ) {
    const encryptedAccessToken = encrypt(accessToken);

    // Atomic Update for manual sync
    await this.prisma.$transaction([
      (this.prisma.whatsAppNumber as any).upsert({
        where: {
          phoneNumberId,
        },
        update: {
          encryptedAccessToken,
          setupStatus: 'ACTIVE',
          isEnabled: true,
          wabaId,
          phoneNumber,
          updatedAt: new Date(),
        } as any,
        create: {
          tenantId,
          phoneNumberId,
          wabaId,
          phoneNumber,
          encryptedAccessToken,
          setupStatus: 'ACTIVE',
          purpose: 'DEFAULT',
          isDefault: true,
          isActive: true,
        } as any,
      }),
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappCrmEnabled: true },
      }),
      this.prisma.whatsAppSetting.upsert({
        where: { tenantId },
        update: { enabled: true },
        create: {
          tenantId,
          enabled: true,
        },
      }),
    ]);

    this.logger.log(`Manual WhatsApp sync completed for tenant ${tenantId}`);

    // Attempt to register/subscribe even for manual syncs to ensure connectivity
    try {
      await this.registerPhoneNumber(phoneNumberId, accessToken);
    } catch (e) {
      this.logger.warn(`Manual sync registration warning: ${e.message}`);
    }

    try {
      await this.subscribeApp(wabaId, accessToken);
    } catch (e) {
      this.logger.warn(`Manual sync subscription warning: ${e.message}`);
    }
  }

  /**
   * Gets the current WhatsApp integration status for a tenant
   */
  async getStatus(tenantId: string) {
    const config = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isEnabled: true },
    });

    if (!config) {
      return {
        status: 'DISCONNECTED',
        wabaId: null,
        phoneNumberId: null,
        phoneNumber: null,
      };
    }

    return {
      status: config.setupStatus,
      wabaId: config.wabaId,
      phoneNumberId: config.phoneNumberId,
      phoneNumber: config.phoneNumber,
    };
  }
}
