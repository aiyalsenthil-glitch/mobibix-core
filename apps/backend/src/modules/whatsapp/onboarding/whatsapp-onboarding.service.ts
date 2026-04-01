import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt } from '../../../common/utils/crypto.util'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { PlanRulesService } from '../../../core/billing/plan-rules.service';
import { WhatsAppFeature } from '../../../core/billing/whatsapp-rules';
import { ModuleType } from '@prisma/client';
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
    private readonly planRulesService: PlanRulesService,
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

    // 4. Embedded Signup "extras" parameter for Coexistence
    const extras = JSON.stringify({
      setup: {},
      featureType: 'whatsapp_business_app_onboarding',
      sessionInfoVersion: '3',
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
        throw new NotFoundException(
          'No WhatsApp Business Account found for this user',
        );
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
        throw new NotFoundException(
          'No phone numbers found in the selected WABA',
        );
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
    const accessTokenValue = encrypt(accessToken);

    // 5. Update DB (Atomic Transaction)
    await this.prisma.$transaction([
      // A. Upsert Phone Number
      this.prisma.whatsAppNumber.upsert({
        where: {
          phoneNumberId,
        },
        update: {
          accessToken: accessTokenValue,
          setupStatus: 'ACTIVE',
          isEnabled: true,
          wabaId,
          phoneNumber,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          phoneNumberId,
          wabaId,
          phoneNumber,
          accessToken: accessTokenValue,
          setupStatus: 'ACTIVE',
          purpose: 'DEFAULT',
          isDefault: true,
          isEnabled: true,
        },
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
   * Embedded Signup exchange — called directly from frontend after FB.login().
   * Skips state validation; tenantId comes from the authenticated JWT.
   */
  async metaExchange(
    tenantId: string,
    code: string,
    selectedWabaId?: string,
    selectedPhoneNumberId?: string,
    mode: 'coexist' | 'new_number' = 'coexist',
  ): Promise<{ success: boolean; phoneNumber: string; wabaId: string; tokenType: 'user' | 'system' }> {
    // 1. Exchange code for short-lived user token (no redirect_uri for embedded signup)
    let shortLivedToken: string;
    try {
      const { data } = await axios.get(
        `https://graph.facebook.com/v22.0/oauth/access_token`,
        { params: { client_id: this.appId, client_secret: this.appSecret, code } },
      );
      shortLivedToken = data.access_token;
    } catch (error) {
      this.logger.error(`Meta token exchange failed: ${error.response?.data?.error?.message || error.message}`);
      throw new BadRequestException('Failed to exchange Meta token. The code may have expired — please try again.');
    }

    // 2. Verify required permissions were actually granted
    const REQUIRED_SCOPES = ['whatsapp_business_management', 'whatsapp_business_messaging'];
    try {
      const { data: debugData } = await axios.get(
        `https://graph.facebook.com/v22.0/debug_token`,
        { params: { input_token: shortLivedToken, access_token: `${this.appId}|${this.appSecret}` } },
      );
      const grantedScopes: string[] = debugData?.data?.scopes ?? [];
      const missingScopes = REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));
      if (missingScopes.length > 0) {
        throw new BadRequestException(
          `Missing required permissions: ${missingScopes.join(', ')}. ` +
          'Please re-connect and allow all requested permissions.',
        );
      }
      this.logger.log(`Meta scopes verified for tenant ${tenantId}: ${grantedScopes.join(', ')}`);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`Scope debug check failed (non-fatal): ${error.message}`);
    }

    // 3. Get FB user_id for Data Deletion Callback tracking
    let fbUserId: string | null = null;
    try {
      const { data: meData } = await axios.get(
        `https://graph.facebook.com/v22.0/me`,
        { params: { access_token: shortLivedToken, fields: 'id' } },
      );
      fbUserId = meData.id ?? null;
    } catch { /* non-fatal */ }

    // 4. Exchange for long-lived user token (60-day expiry)
    //    Production systems should use System User tokens instead — no expiry, no user dependency.
    //    Set tokenExpiresAt so we can warn before expiry.
    let accessToken = shortLivedToken;
    let tokenExpiresAt: Date | null = null;
    try {
      const { data: llData } = await axios.get(
        `https://graph.facebook.com/v22.0/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
          },
        },
      );
      accessToken = llData.access_token;
      // expires_in is seconds from now
      if (llData.expires_in) {
        tokenExpiresAt = new Date(Date.now() + llData.expires_in * 1000);
      }
      this.logger.log(`Long-lived token obtained for tenant ${tenantId}, expires: ${tokenExpiresAt?.toISOString() ?? 'never'}`);
    } catch (error) {
      this.logger.warn(`Long-lived token exchange failed, using short-lived token: ${error.message}`);
      // Short-lived tokens expire in ~1h — set expiry so the UI warns
      tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    // 5. Fetch WABA + phone
    let wabaId: string | undefined = selectedWabaId;
    let phoneNumberId: string | undefined = selectedPhoneNumberId;
    let phoneNumber: string;

    try {
      // If we don't have IDs from the frontend, we must list them
      if (!wabaId) {
        const { data: wabaData } = await axios.get(
          `https://graph.facebook.com/v22.0/me/whatsapp_business_accounts`,
          { params: { access_token: accessToken, fields: 'id,name' } },
        );
        if (!wabaData.data?.length) throw new NotFoundException('No WhatsApp Business Account found.');
        wabaId = wabaData.data[0].id;
      }

      // Always fetch the phone number details to get the display_phone_number
      // We can fetch it directly if we have the phone ID, or list them if we only have WABA ID
      if (phoneNumberId) {
        const { data: phone } = await axios.get(
          `https://graph.facebook.com/v22.0/${phoneNumberId}`,
          { params: { access_token: accessToken, fields: 'id,display_phone_number,name_status,quality_rating' } },
        );
        phoneNumber = phone.display_phone_number.replace(/\D/g, '');
      } else {
        const { data: phoneData } = await axios.get(
          `https://graph.facebook.com/v22.0/${wabaId}/phone_numbers`,
          { params: { access_token: accessToken, fields: 'id,display_phone_number,name_status,quality_rating' } },
        );
        if (!phoneData.data?.length) throw new NotFoundException('No phone numbers found in WABA.');
        const phone = phoneData.data[0];
        phoneNumberId = phone.id;
        phoneNumber = phone.display_phone_number.replace(/\D/g, '');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      
      const metaError = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to fetch Meta assets: ${metaError}`, error.response?.data);
      throw new BadRequestException(`Failed to retrieve WhatsApp Business Account details: ${metaError}`);
    }

    // 6. Persist + enable (disable any other active provider first)
    await this.disableOtherProviders(tenantId, phoneNumberId!);
    const encryptedToken = encrypt(accessToken);
    const isSystemToken = tokenExpiresAt === null;
    await this.prisma.$transaction([
      this.prisma.whatsAppNumber.upsert({
        where: { phoneNumberId: phoneNumberId! },
        update: {
          accessToken: encryptedToken,
          setupStatus: 'ACTIVE' as any,
          isEnabled: true,
          wabaId: wabaId!,
          phoneNumber,
          metaUserId: fbUserId,
          tokenExpiresAt,
          updatedAt: new Date(),
        } as any,
        create: {
          tenantId,
          phoneNumberId: phoneNumberId!,
          wabaId: wabaId!,
          phoneNumber,
          accessToken: encryptedToken,
          setupStatus: 'ACTIVE' as any,
          purpose: 'DEFAULT',
          isDefault: true,
          isEnabled: true,
          metaUserId: fbUserId,
          tokenExpiresAt,
        } as any,
      }),
      this.prisma.tenant.update({ where: { id: tenantId }, data: { whatsappCrmEnabled: true } }),
      this.prisma.whatsAppSetting.upsert({ where: { tenantId }, update: { enabled: true }, create: { tenantId, enabled: true } }),
    ]);

    // 7. Register phone (new_number mode only) + subscribe webhooks
    if (mode === 'new_number') {
      // Full Cloud API migration — tenant will lose WhatsApp Business App access
      try { await this.doRegisterPhoneNumber(phoneNumberId!, accessToken); } catch (e) {
        this.logger.warn(`Phone registration failed: ${e.message}`);
      }
    }
    try { await this.subscribeApp(wabaId!, accessToken); } catch (e) {
      this.logger.warn(`Subscribe WABA webhook failed: ${e.message}`);
    }

    // 8. Coexistence Synchronization (New: mandatory for Business App history)
    if (mode === 'coexist') {
      try {
        await this.initiateCoexistenceSync(phoneNumberId!, accessToken);
        this.logger.log(`[Coexistence] Initiated sync for phone ${phoneNumberId}`);
      } catch (e) {
        this.logger.warn(`Failed to initiate Coexistence sync: ${e.message}`);
      }
    }

    this.logger.log(`Meta embedded signup complete for tenant ${tenantId} — WABA ${wabaId} (mode: ${mode})`);
    return {
      success: true,
      phoneNumber,
      wabaId: wabaId!,
      tokenType: (tokenExpiresAt === null ? 'system' : 'user') as 'user' | 'system',
    };
  }

  /**
   * Disables all active WhatsApp numbers for a tenant except the one being configured.
   * Enforces one-provider-at-a-time rule.
   */
  private async disableOtherProviders(tenantId: string, keepPhoneNumberId: string) {
    await this.prisma.whatsAppNumber.updateMany({
      where: {
        tenantId,
        isEnabled: true,
        phoneNumberId: { not: keepPhoneNumberId },
      },
      data: { isEnabled: false, setupStatus: 'DISCONNECTED' as any },
    });
  }

  /**
   * COEXISTENCE MODE stub — /register skipped so tenant keeps WhatsApp Business App.
   * Called from handleCallback/manualSync which don't have mode context.
   * New flows use doRegisterPhoneNumber() directly when mode === 'new_number'.
   */
  private async registerPhoneNumber(_phoneId: string, _token: string) {
    this.logger.log(`[Coexistence] Skipping /register — phone retains WhatsApp Business App access`);
  }

  /**
   * Full Cloud API migration — called only when mode === 'new_number'.
   * Tenant loses WhatsApp Business App access after this call.
   */
  private async doRegisterPhoneNumber(phoneId: string, token: string) {
    const url = `https://graph.facebook.com/v22.0/${phoneId}/register`;
    await axios.post(
      url,
      { messaging_product: 'whatsapp', pin: '123456' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
    this.logger.log(`[New Number] Phone ${phoneId} registered for full Cloud API migration`);
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
   * Initiates the synchronization of contacts and message history from the WhatsApp Business App.
   * Required for Coexistence mode.
   */
  private async initiateCoexistenceSync(phoneId: string, token: string) {
    const url = `https://graph.facebook.com/v22.0/${phoneId}/smb_app_data`;
    
    // 1. Sync Contacts (smb_app_state_sync)
    await axios.post(
      url,
      { messaging_product: 'whatsapp', sync_type: 'smb_app_state_sync' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    // 2. Sync Message History (history)
    await axios.post(
      url,
      { messaging_product: 'whatsapp', sync_type: 'history' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
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
        accessToken: null, // Clear token for security
      } as any,
    });

    this.logger.log(`WhatsApp integration disconnected for tenant ${tenantId}`);
    return { success: true };
  }

  /**
   * Switches the WhatsApp provider engine.
   * Supports: META_CLOUD | WEB_SOCKET | AUTHKEY
   *
   * WEB_SOCKET → sets SCAN_REQUIRED (user must scan QR code)
   * META_CLOUD → sets PENDING (user must complete Meta OAuth)
   * AUTHKEY    → sets PENDING (user must supply API key via configureAuthkey)
   */
  async switchProvider(
    tenantId: string,
    provider: 'META_CLOUD' | 'WEB_SOCKET' | 'AUTHKEY',
  ) {
    const activeNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId },
    });

    if (!activeNumber) {
      return { success: true, provider, requiresSetup: true };
    }

    // Enforce 24h cooldown in production
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    if (isProd && (activeNumber as any).lastProviderSwitchAt) {
      const lastSwitch = new Date((activeNumber as any).lastProviderSwitchAt).getTime();
      const hoursSince = (Date.now() - lastSwitch) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const remaining = Math.ceil(24 - hoursSince);
        throw new BadRequestException(
          `Provider switching is limited to once per 24 hours. Try again in ${remaining}h.`,
        );
      }
    }

    const statusMap: Record<string, string> = {
      WEB_SOCKET: 'SCAN_REQUIRED',
      META_CLOUD: 'PENDING',
      AUTHKEY: 'PENDING',
    };

    await this.prisma.whatsAppNumber.update({
      where: { id: activeNumber.id },
      data: {
        provider: provider as any,
        lastProviderSwitchAt: new Date(),
        setupStatus: statusMap[provider] as any,
        // Clear credentials of the OLD provider on switch for security
        ...(provider !== 'AUTHKEY' && {
          REMOVED_TOKENApiKey: null,
          REMOVED_TOKENSenderId: null,
        }),
        ...(provider !== 'META_CLOUD' && {
          accessToken: null,
        }),
      } as any,
    });

    this.logger.log(`Tenant ${tenantId} switched to ${provider}`);
    return { success: true, provider, requiresSetup: provider !== 'META_CLOUD' };
  }

  /**
   * Configure Authkey credentials for a tenant.
   * Called after the user chooses "Official Mode" and enters their Authkey API key.
   *
   * The REMOVED_TOKENApiKey is stored encrypted (AES-256-GCM).
   * If no WhatsAppNumber record exists yet, one is created as a placeholder.
   */
  async configureAuthkey(
    tenantId: string,
    apiKey: string,
    senderId: string,
    phoneNumber: string,
  ): Promise<{ success: boolean; numberId: string }> {
    if (!apiKey || !senderId || !phoneNumber) {
      throw new BadRequestException('apiKey, senderId, and phoneNumber are required for Authkey setup.');
    }

    // Gate: Tenant must have an Official API addon plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });
    const moduleType =
      tenant?.tenantType?.toUpperCase() === 'GYM'
        ? ModuleType.GYM
        : ModuleType.MOBILE_SHOP;

    const planRules = await this.planRulesService.getPlanRulesForTenant(tenantId, moduleType);
    const hasOfficialApi =
      !planRules ||
      planRules.features.length === 0 ||
      planRules.features.includes(WhatsAppFeature.WHATSAPP_API_ACCESS);

    if (!hasOfficialApi) {
      throw new ForbiddenException({
        message: 'Official WhatsApp API requires a WA Official addon plan. Upgrade to WA Official Starter, Pro, or Business to use Authkey.',
        errorCode: 'WA_PLAN_REQUIRED',
      });
    }

    const encryptedApiKey = encrypt(apiKey);

    // Authkey numbers don't have a Meta phoneNumberId — use phone as unique key
    const placeholderPhoneNumberId = `REMOVED_TOKEN:${tenantId}:${phoneNumber.replace(/\D/g, '')}`;

    // Disable any other active provider before enabling Authkey
    await this.disableOtherProviders(tenantId, placeholderPhoneNumberId);

    const record = await this.prisma.whatsAppNumber.upsert({
      where: { phoneNumberId: placeholderPhoneNumberId },
      update: {
        REMOVED_TOKENApiKey: encryptedApiKey,
        REMOVED_TOKENSenderId: senderId,
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        provider: 'AUTHKEY' as any,
        setupStatus: 'ACTIVE' as any,
        isEnabled: true,
        lastProviderSwitchAt: new Date(),
      } as any,
      create: {
        tenantId,
        phoneNumberId: placeholderPhoneNumberId,
        wabaId: `REMOVED_TOKEN:${tenantId}`,
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        REMOVED_TOKENApiKey: encryptedApiKey,
        REMOVED_TOKENSenderId: senderId,
        provider: 'AUTHKEY' as any,
        setupStatus: 'ACTIVE' as any,
        purpose: 'DEFAULT' as any,
        isDefault: true,
        isEnabled: true,
      } as any,
    });

    // Enable WhatsApp CRM for this tenant
    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsappCrmEnabled: true },
      }),
      this.prisma.whatsAppSetting.upsert({
        where: { tenantId },
        update: { enabled: true },
        create: { tenantId, enabled: true },
      }),
    ]);

    this.logger.log(`Authkey configured for tenant ${tenantId}, number: ${phoneNumber}`);
    return { success: true, numberId: record.id };
  }

  /**
   * Send a test WhatsApp message to verify Authkey credentials.
   * Called in onboarding Step 3 — verify connection.
   * On success, sets REMOVED_TOKENVerifiedAt and lastTestSentAt.
   */
  async verifyAuthkey(tenantId: string, testPhone: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const waNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, provider: 'AUTHKEY' as any, isEnabled: true },
      select: { id: true, REMOVED_TOKENApiKey: true, REMOVED_TOKENSenderId: true, REMOVED_TOKENCountryCode: true },
    } as any);

    if (!waNumber) {
      throw new BadRequestException('No Authkey number configured. Complete Step 2 first.');
    }
    if (!(waNumber as any).REMOVED_TOKENApiKey) {
      throw new BadRequestException('API key not set. Complete Step 2 first.');
    }

    let apiKey: string;
    try {
      apiKey = decrypt((waNumber as any).REMOVED_TOKENApiKey);
    } catch {
      throw new BadRequestException('Stored API key is invalid. Re-enter your Authkey credentials.');
    }

    const phone = testPhone.replace(/\D/g, '');
    const countryCode = (waNumber as any).REMOVED_TOKENCountryCode ?? '91';

    // Use Authkey GET API to send a simple text test
    try {
      const params = new URLSearchParams({
        REMOVED_TOKEN: apiKey,
        mobile: phone,
        country_code: countryCode,
        type: 'whatsapp',
        message: 'MobiBix WhatsApp connection verified successfully. ✅',
      });

      const { data } = await axios.get(
        `https://api.REMOVED_TOKEN.io/request?${params.toString()}`,
        { timeout: 15_000 },
      );

      const success =
        data?.type === 'success' ||
        data?.status === 'success' ||
        data?.status === '1' ||
        (data?.id && Number(data.id) > 0);

      if (!success) {
        const error = data?.message || data?.error || JSON.stringify(data);
        this.logger.warn(`[Authkey verify] failed for tenant ${tenantId}: ${error}`);
        return { success: false, error };
      }

      // Mark as verified
      await this.prisma.whatsAppNumber.update({
        where: { id: waNumber.id },
        data: {
          REMOVED_TOKENVerifiedAt: new Date(),
          lastTestSentAt: new Date(),
        } as any,
      });

      this.logger.log(`Authkey verified for tenant ${tenantId}`);
      return { success: true, messageId: String(data.id ?? data.message_id ?? '') };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[Authkey verify] exception for tenant ${tenantId}: ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Fetch Authkey account balance.
   * GET /whatsapp/REMOVED_TOKEN/balance
   */
  async getAuthkeyBalance(tenantId: string): Promise<{
    connected: boolean;
    balance?: number;
    currency?: string;
    estimatedMessages?: number;
    lastTestSentAt?: Date | null;
    verifiedAt?: Date | null;
    error?: string;
  }> {
    const waNumber = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, provider: 'AUTHKEY' as any, isEnabled: true },
      select: {
        id: true,
        REMOVED_TOKENApiKey: true,
        REMOVED_TOKENVerifiedAt: true,
        lastTestSentAt: true,
      } as any,
    });

    if (!waNumber || !(waNumber as any).REMOVED_TOKENApiKey) {
      return { connected: false, error: 'Authkey not configured' };
    }

    let apiKey: string;
    try {
      apiKey = decrypt((waNumber as any).REMOVED_TOKENApiKey);
    } catch {
      return { connected: false, error: 'Invalid API key stored' };
    }

    try {
      // Authkey balance API
      const { data } = await axios.get('https://api.REMOVED_TOKEN.io/balance', {
        params: { REMOVED_TOKEN: apiKey },
        timeout: 10_000,
      });

      // Authkey returns: { status: "success", balance: "10.50", currency: "INR" }
      const balance = parseFloat(data?.balance ?? '0');
      const currency = data?.currency ?? 'INR';
      const COST_PER_MSG = 0.35; // INR per WhatsApp template
      const estimatedMessages = Math.floor(balance / COST_PER_MSG);

      return {
        connected: true,
        balance,
        currency,
        estimatedMessages,
        lastTestSentAt: (waNumber as any).lastTestSentAt ?? null,
        verifiedAt: (waNumber as any).REMOVED_TOKENVerifiedAt ?? null,
      };
    } catch (err: any) {
      // Balance API failure doesn't mean disconnected — network/endpoint may vary
      return {
        connected: true,
        error: 'Could not fetch balance. Check Authkey account.',
        lastTestSentAt: (waNumber as any).lastTestSentAt ?? null,
        verifiedAt: (waNumber as any).REMOVED_TOKENVerifiedAt ?? null,
      };
    }
  }

  /**
   * Returns status + mode info for the tenant's WhatsApp setup.
   * Used by the frontend to render the correct connection UI.
   */
  async getStatus(tenantId: string) {
    const config = await this.prisma.whatsAppNumber.findFirst({
      where: { tenantId, isEnabled: true },
      select: {
        setupStatus: true,
        wabaId: true,
        phoneNumberId: true,
        phoneNumber: true,
        provider: true,
        REMOVED_TOKENSenderId: true,
      },
    });

    if (!config) {
      return {
        status: 'DISCONNECTED',
        mode: null,
        wabaId: null,
        phoneNumberId: null,
        phoneNumber: null,
        provider: null,
      };
    }

    const modeMap: Record<string, 'WEB' | 'OFFICIAL'> = {
      WEB_SOCKET: 'WEB',
      META_CLOUD: 'OFFICIAL',
      AUTHKEY: 'OFFICIAL',
    };

    return {
      status: config.setupStatus,
      mode: modeMap[config.provider] || null,
      provider: config.provider,
      wabaId: config.wabaId,
      phoneNumberId: config.phoneNumberId,
      phoneNumber: config.phoneNumber,
      // Authkey: expose sender ID (not the API key)
      REMOVED_TOKENSenderId: config.provider === 'AUTHKEY' ? config.REMOVED_TOKENSenderId : undefined,
    };
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
    const accessTokenValue = encrypt(accessToken);

    // Atomic Update for manual sync
    await this.prisma.$transaction([
      (this.prisma.whatsAppNumber as any).upsert({
        where: {
          phoneNumberId,
        },
        update: {
          accessToken: accessTokenValue,
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
          accessToken: accessTokenValue,
          setupStatus: 'ACTIVE',
          purpose: 'DEFAULT',
          isDefault: true,
          isEnabled: true,
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

}
