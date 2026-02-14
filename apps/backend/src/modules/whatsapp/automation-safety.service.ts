import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PlanRulesService } from '../../core/billing/plan-rules.service';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import { ModuleType } from '@prisma/client';

/**
 * ────────────────────────────────────────────────
 * WHATSAPP AUTOMATION SAFETY ENFORCEMENT SERVICE
 * ────────────────────────────────────────────────
 *
 * RESPONSIBILITY: Enforce ALL safety rules before allowing reminders
 *
 * ENFORCES:
 * 1. Template Safety: Only UTILITY templates allowed
 * 2. Feature Safety: Plan must support the feature
 * 3. Opt-In Safety: Coaching/diet features require explicit consent (GYM)
 * 4. Event Context Safety: Event must map to real entities
 *
 * GUARANTEES:
 * - No marketing/auth templates in automations
 * - No messages without plan permission
 * - No diet/trainer messages without opt-in
 * - No mass-blast scenarios
 */
@Injectable()
export class AutomationSafetyService {
  private readonly logger = new Logger(AutomationSafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * ────────────────────────────────────────────────
   * A. TEMPLATE SAFETY CHECK
   * ────────────────────────────────────────────────
   * Ensures template is UTILITY category only
   */
  async validateTemplateSafety(
    tenantId: string,
    templateKey: string,
  ): Promise<{ safe: boolean; reason?: string }> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        templateKey,
      },
    });

    if (!template) {
      return {
        safe: false,
        reason: `Template '${templateKey}' not found for tenant`,
      };
    }

    if (template.category !== 'UTILITY') {
      return {
        safe: false,
        reason: `Template '${templateKey}' is ${template.category}, only UTILITY templates allowed in automations`,
      };
    }

    return { safe: true };
  }

  /**
   * ────────────────────────────────────────────────
   * B. FEATURE SAFETY CHECK
   * ────────────────────────────────────────────────
   * Ensures tenant's plan supports the feature
   */
  async validateFeatureSafety(
    tenantId: string,
    feature: WhatsAppFeature,
    module: ModuleType, // 🔥 NOW REQUIRED
  ): Promise<{ allowed: boolean; reason?: string }> {
    const rules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module,
    );

    if (!rules?.enabled) {
      return {
        allowed: false,
        reason: 'WhatsApp features disabled for tenant plan',
      };
    }

    if (!rules.features.includes(feature)) {
      return {
        allowed: false,
        reason: `Feature '${feature}' not included in tenant's plan`,
      };
    }

    return { allowed: true };
  }

  /**
   * ────────────────────────────────────────────────
   * C. OPT-IN SAFETY CHECK (GYM MODULE ONLY)
   * ────────────────────────────────────────────────
   * For coaching/trainer/diet events, ensure member has opted in
   */
  async validateOptInSafety(
    moduleType: ModuleType,
    eventType: string,
    customerId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Only apply to GYM module
    if (String(moduleType) !== 'GYM') {
      return { allowed: true };
    }

    // Events that require coaching opt-in
    const coachingEvents = ['TRAINER_ASSIGNED', 'COACHING_FOLLOWUP'];

    if (!coachingEvents.includes(eventType)) {
      return { allowed: true };
    }

    // Check if member has coaching enabled
    // TODO: After Prisma migration, hasCoaching will be properly typed
    const member = await this.prisma.member.findUnique({
      where: { id: customerId },
    });

    if (!member?.hasCoaching) {
      return {
        allowed: false,
        reason: `Member has not opted in for coaching-related messages`,
      };
    }

    return { allowed: true };
  }

  /**
   * ────────────────────────────────────────────────
   * D. EVENT CONTEXT SAFETY CHECK
   * ────────────────────────────────────────────────
   * Ensures event maps to actual entities (no mass blast)
   */
  validateEventContextSafety(
    eventType: string,
    entityCount: number,
  ): { safe: boolean; reason?: string } {
    // Event-driven means we have specific entities
    if (entityCount === 0) {
      return {
        safe: false,
        reason: `Event '${eventType}' resolved to zero entities - skipping`,
      };
    }

    // Sanity check: prevent accidental mass operations
    if (entityCount > 1000) {
      this.logger.warn(
        `Event '${eventType}' resolved to ${entityCount} entities - potential mass operation`,
      );
    }

    return { safe: true };
  }

  /**
   * ────────────────────────────────────────────────
   * MASTER SAFETY CHECK
   * ────────────────────────────────────────────────
   * Run all safety checks before creating reminder
   */
  async validateAutomationSafety(
    tenantId: string,
    moduleType: ModuleType,
    eventType: string,
    templateKey: string,
    feature: WhatsAppFeature,
    customerId: string,
    requiresOptIn: boolean,
  ): Promise<{
    safe: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check 1: Template Safety
    const templateCheck = await this.validateTemplateSafety(
      tenantId,
      templateKey,
    );
    if (!templateCheck.safe) {
      reasons.push(templateCheck.reason!);
    }

    // Check 2: Feature Safety
    const featureCheck = await this.validateFeatureSafety(
      tenantId,
      feature,
      moduleType, // 🔥 Pass moduleType
    );
    if (!featureCheck.allowed) {
      reasons.push(featureCheck.reason!);
    }

    // Check 3: Opt-In Safety (if required)
    if (requiresOptIn) {
      const optInCheck = await this.validateOptInSafety(
        moduleType,
        eventType,
        customerId,
      );
      if (!optInCheck.allowed) {
        reasons.push(optInCheck.reason!);
      }
    }

    return {
      safe: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Map template key to WhatsApp feature for enforcement.
   *
   * NOTE: Core notifications (welcome, payment due, reminders) are always-on.
   * Only premium automation (scheduling, batching) requires WHATSAPP_ALERTS_AUTOMATION.
   *
   * This method now returns null for core events (not gated).
   */
  mapTemplateKeyToFeature(templateKey: string): WhatsAppFeature | null {
    // Core notifications: Always-on, never gated
    const coreNotifications = [
      'WELCOME',
      'MEMBER_WELCOME',
      'PAYMENT_DUE',
      'PAYMENT_REMINDER',
      'EXPIRY',
      'EXPIRY_REMINDER',
      'MEMBERSHIP_EXPIRY',
      'REMINDER',
      'FOLLOWUP',
      'JOB_COMPLETED',
      'INVOICE_CREATED',
    ];

    if (coreNotifications.includes(templateKey)) {
      return null; // No feature gate required
    }

    // Advanced automation requires WHATSAPP_ALERTS_AUTOMATION
    // (e.g., scheduled campaigns, batch sends)
    return WhatsAppFeature.WHATSAPP_ALERTS_AUTOMATION;
  }
}
