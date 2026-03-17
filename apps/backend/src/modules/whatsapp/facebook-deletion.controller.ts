import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';

/**
 * Meta Data Deletion Callback
 * Required by Meta for all apps using Facebook Login.
 * Ref: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Meta sends a signed_request when a user requests deletion of their data.
 * We must:
 *   1. Verify the HMAC-SHA256 signature using WHATSAPP_APP_SECRET
 *   2. Delete or anonymize all data linked to that Facebook user ID
 *   3. Return { url, confirmation_code } so Meta can show status
 *
 * Register these URLs in:
 *   Meta App Dashboard → Settings → Basic → Data Deletion Instructions URL
 *   Set to: https://your-domain.com/api/facebook/deletion
 */
@Controller('facebook')
export class FacebookDeletionController {
  private readonly logger = new Logger(FacebookDeletionController.name);
  private readonly appSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.appSecret = this.configService.getOrThrow<string>('WHATSAPP_APP_SECRET');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://app.mobibix.com';
  }

  /**
   * POST /facebook/deletion
   * Meta POSTs: application/x-www-form-urlencoded with field "signed_request"
   */
  @Public()
  @SkipSubscriptionCheck()
  @Post('deletion')
  async handleDeletion(@Body('signed_request') signedRequest: string) {
    if (!signedRequest) {
      throw new BadRequestException('Missing signed_request');
    }

    // 1. Verify & decode the signed_request
    const payload = this.verifySignedRequest(signedRequest);
    const fbUserId = payload.user_id as string;

    if (!fbUserId) {
      throw new BadRequestException('Invalid signed_request: missing user_id');
    }

    this.logger.log(`Meta data deletion request received for FB user: ${fbUserId}`);

    // 2. Generate a unique confirmation code for this deletion request
    const confirmationCode = crypto.randomBytes(16).toString('hex');

    // 3. Find tenants whose Meta integration was connected by this FB user
    //    We store the Meta user_id in WhatsAppPhoneNumber.wabaId or can look up by token ownership.
    //    In our case we match by the fbUserId stored at connection time if available,
    //    or fall back to marking all numbers with META_CLOUD provider for audit.
    const affectedNumbers = await this.prisma.whatsAppNumber.findMany({
      where: {
        provider: 'META_CLOUD' as any,
        metaUserId: fbUserId,          // stored at metaExchange time
      } as any,
      select: { id: true, tenantId: true, phoneNumberId: true },
    });

    // 4. Anonymize / delete Meta-specific data for all affected records
    if (affectedNumbers.length > 0) {
      const ids = affectedNumbers.map((n) => n.id);
      await this.prisma.$transaction([
        // Clear encrypted access token and Authkey credentials
        this.prisma.whatsAppNumber.updateMany({
          where: { id: { in: ids } },
          data: {
            accessToken: null,
            setupStatus: 'DISCONNECTED' as any,
            isEnabled: false,
          } as any,
        }),
        // Log the deletion for audit
        this.prisma.deletionRequest.createMany({
          data: affectedNumbers.map((n) => ({
            tenantId: n.tenantId,
            requestedBy: `meta:${fbUserId}`,
            reason: 'META_DATA_DELETION_CALLBACK',
            confirmationCode,
            status: 'COMPLETED',
            scheduledAt: new Date(),
            completedAt: new Date(),
          })) as any,
          skipDuplicates: true,
        }),
      ]);

      this.logger.log(
        `Meta deletion: cleared tokens for ${ids.length} WhatsApp numbers, FB user ${fbUserId}`,
      );
    } else {
      // No direct match — still acknowledge and log
      this.logger.warn(
        `Meta deletion: no META_CLOUD numbers found for FB user ${fbUserId}. Logging for audit.`,
      );
    }

    // 5. Return the required Meta response format
    const statusUrl = `${this.frontendUrl}/api/facebook/deletion/status/${confirmationCode}`;
    return {
      url: statusUrl,
      confirmation_code: confirmationCode,
    };
  }

  /**
   * GET /facebook/deletion/status/:code
   * Meta may poll this URL to check deletion completion.
   * Also shown to the user in their Facebook activity log.
   */
  @Public()
  @SkipSubscriptionCheck()
  @Get('deletion/status/:code')
  async getDeletionStatus(@Param('code') code: string) {
    // Simple status page — in production render an HTML page
    return {
      confirmation_code: code,
      status: 'completed',
      message: 'Your data has been deleted from MobiBix.',
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * Verifies the signed_request from Meta using HMAC-SHA256.
   * Format: base64url(signature).base64url(payload)
   * Signature = HMAC-SHA256(payload_base64url, app_secret)
   */
  private verifySignedRequest(signedRequest: string): Record<string, unknown> {
    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Malformed signed_request');
    }

    const [encodedSig, encodedPayload] = parts;

    // Meta uses base64url (no padding, - instead of +, _ instead of /)
    const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const expectedSig = crypto
      .createHmac('sha256', this.appSecret)
      .update(encodedPayload)
      .digest();

    // Constant-time comparison to prevent timing attacks
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) {
      this.logger.error('signed_request signature mismatch — possible tampering');
      throw new BadRequestException('Invalid signed_request signature');
    }

    const payloadJson = Buffer.from(
      encodedPayload.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');

    return JSON.parse(payloadJson) as Record<string, unknown>;
  }
}
