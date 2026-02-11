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

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.getOrThrow('WHATSAPP_APP_ID');
    this.appSecret = this.configService.getOrThrow('WHATSAPP_APP_SECRET');
    // Callback URL must allow embedded signup flow return
    this.callbackUrl = `${this.configService.getOrThrow(
      'BACKEND_URL',
    )}/api/integrations/whatsapp/callback`;
  }

  /**
   * Generates the Meta Business Login URL with encrypted state
   */
  async generateConnectUrl(tenantId: string, returnUrl?: string): Promise<string> {
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
    
    // Using Facebook Login for Business flow
    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${
      this.appId
    }&redirect_uri=${encodeURIComponent(
      this.callbackUrl,
    )}&state=${encodeURIComponent(encryptedState)}&scope=${scopes}&response_type=code`;

    return url;
  }

  /**
   * Handles the OAuth callback, exchanges code for token, and saves WABA
   */
  async handleCallback(code: string, state: string) {
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
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${
        this.appId
      }&redirect_uri=${encodeURIComponent(
        this.callbackUrl,
      )}&client_secret=${this.appSecret}&code=${code}`;

      const { data } = await axios.get(tokenUrl);
      accessToken = data.access_token;
      
      this.logger.log(`Token exchanged successfully for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to exchange token for ${tenantId}: ${error.response?.data?.error?.message || error.message}`,
      );
      throw new BadRequestException('Failed to connect with Meta');
    }

    // 3. Retrieve WABA and Phone Details (Production logic)
    // NOTE: In production with Embedded Signup, we usually get the WABA ID 
    // from the initial signup response or by calling /debug_token to see granted permissions.
    // For this implementation, we will fetch the first associated WhatsApp Business Account 
    // and its primary phone number.

    let wabaId: string;
    let phoneNumberId: string;
    let phoneNumber: string;

    try {
      // Step A: Get WABAs associated with the token
      const wabaUrl = `https://graph.facebook.com/v18.0/me/whatsapp_business_accounts?access_token=${accessToken}`;
      const { data: wabaData } = await axios.get(wabaUrl);
      
      if (!wabaData.data || wabaData.data.length === 0) {
        throw new Error('No WhatsApp Business Account found for this user');
      }

      // Pick the first one for now (Simplification)
      wabaId = wabaData.data[0].id;
      this.logger.log(`Found WABA ID: ${wabaId} for tenant ${tenantId}`);

      // Step B: Get Phone Numbers for that WABA
      const phoneUrl = `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
      const { data: phoneData } = await axios.get(phoneUrl);

      if (!phoneData.data || phoneData.data.length === 0) {
        throw new Error('No phone numbers found in the selected WABA');
      }

      // Pick the first active one
      const phone = phoneData.data[0];
      phoneNumberId = phone.id;
      phoneNumber = phone.display_phone_number.replace(/\D/g, ''); // Clean number
      
      this.logger.log(`Found Phone ID: ${phoneNumberId} (${phoneNumber}) for tenant ${tenantId}`);
      this.logger.log(`Found Phone ID: ${phoneNumberId} (${phoneNumber}) for tenant ${tenantId}`);
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

    // 5. Update DB (Upsert)
    await (this.prisma.whatsAppPhoneNumber as any).upsert({
      where: {
        tenantId_phoneNumberId: {
          tenantId,
          phoneNumberId,
        },
      },
      update: {
        encryptedAccessToken,
        setupStatus: 'ACTIVE',
        isActive: true,
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
    });

    this.logger.log(`WhatsApp integration completed for tenant ${tenantId}`);
    return { success: true, returnUrl: payload.returnUrl };
  }

  /**
   * Disconnects the integration (Soft delete/Deactivate)
   */
  async disconnect(tenantId: string) {
    // 1. Find active number
    const activeNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!activeNumber) {
        return; // Already disconnected
    }

    // 2. Mark as DISCONNECTED
    await this.prisma.whatsAppPhoneNumber.update({
      where: { id: activeNumber.id },
      data: {
        isActive: false,
        setupStatus: 'DISCONNECTED',
        encryptedAccessToken: null, // Clear token for security
      } as any,
    });
    
    this.logger.log(`WhatsApp integration disconnected for tenant ${tenantId}`);
    return { success: true };
  }
}
