/**
 * ════════════════════════════════════════════════════
 * WhatsApp Dual-Track Routing Service
 * ════════════════════════════════════════════════════
 *
 * PURPOSE: Route messages through the correct "track" based on
 * tenant's subscription status and phone number configuration.
 *
 * TRACK A — System Default (Module-Level)
 *   - Uses shared module-level phone number
 *   - Limited to: WELCOME, REMINDER, BILLING, PAYMENT_DUE
 *   - No CRM features (no campaigns, no manual replies)
 *   - Outbound-only (no inbound processing)
 *
 * TRACK B — Tenant-Owned
 *   - Uses tenant's own registered phone number
 *   - Full CRM capabilities (campaigns, manual replies, automations)
 *   - Inbound message processing enabled
 *   - Requires active WHATSAPP_CRM add-on subscription
 *
 * FALLBACK: On add-on expiry → automatic downgrade to Track A
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ModuleType } from '@prisma/client';
import { SubscriptionsService } from '../../core/billing/subscriptions/subscriptions.service';

export type RoutingTrack = 'SYSTEM_DEFAULT' | 'TENANT_OWNED';

/** Notification types allowed on Track A (System Default numbers) */
const TRACK_A_ALLOWED_TYPES = new Set([
  'WELCOME',
  'REMINDER',
  'BILLING',
  'PAYMENT_DUE',
]);

@Injectable()
export class WhatsAppRoutingService {
  private readonly logger = new Logger(WhatsAppRoutingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Determine which track a tenant should use for sending messages.
   *
   * @returns Track type and whether the notification type is allowed
   */
  async resolveTrack(
    tenantId: string,
    notificationType: string,
  ): Promise<{
    track: RoutingTrack;
    allowed: boolean;
    reason?: string;
  }> {
    // 1. Check if tenant has an active WHATSAPP_CRM add-on
    let hasActiveAddon = false;
    try {
      const subscription =
        await this.subscriptionsService.getCurrentActiveSubscription(
          tenantId,
          ModuleType.WHATSAPP_CRM,
        );
      hasActiveAddon = !!subscription;
    } catch {
      hasActiveAddon = false;
    }

    // 2. Check if tenant has their own phone number
    const ownNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    // 3. Route decision
    if (hasActiveAddon && ownNumber) {
      // Track B: Full CRM — all notification types allowed
      this.logger.debug(
        `[ROUTING] Tenant ${tenantId} → Track B (tenant-owned)`,
      );
      return { track: 'TENANT_OWNED', allowed: true };
    }

    // Track A: System Default — limited notification types
    const isAllowed = TRACK_A_ALLOWED_TYPES.has(notificationType);

    if (!isAllowed) {
      this.logger.debug(
        `[ROUTING] Tenant ${tenantId} → Track A, type '${notificationType}' NOT allowed`,
      );
      return {
        track: 'SYSTEM_DEFAULT',
        allowed: false,
        reason: `Notification type '${notificationType}' requires WHATSAPP_CRM add-on with tenant-owned number`,
      };
    }

    this.logger.debug(
      `[ROUTING] Tenant ${tenantId} → Track A (system default), type '${notificationType}' allowed`,
    );
    return { track: 'SYSTEM_DEFAULT', allowed: true };
  }

  /**
   * Quick check: does this tenant have full CRM capability?
   */
  async hasCrmCapability(tenantId: string): Promise<boolean> {
    const result = await this.resolveTrack(tenantId, 'CRM_CHECK');
    return result.track === 'TENANT_OWNED';
  }
}
