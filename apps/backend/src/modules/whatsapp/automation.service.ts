import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { getScheduledAtUTC } from '../../common/utils/date.util';
import { AutomationSafetyService } from './automation-safety.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ValidateAutomationDto,
} from './dto/automation.dto';
import { ModuleType, ReminderTriggerType } from '@prisma/client';

// ... (existing code)

/**
 * ────────────────────────────────────────────────
 * AUTOMATION SERVICE
 * ────────────────────────────────────────────────
 *
 * CRUD operations for WhatsAppAutomation with validation
 */
@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  // System-defined event registry (immutable)
  private readonly eventRegistry = {
    GYM: [
      'MEMBER_CREATED',
      'TRAINER_ASSIGNED',
      'MEMBERSHIP_EXPIRY',
      'MEMBERSHIP_EXPIRY_BEFORE',
      'MEMBERSHIP_EXPIRY_AFTER',
      'PAYMENT_DUE',
      'PAYMENT_DUE_BEFORE',
      'PAYMENT_DUE_AFTER',
      'COACHING_FOLLOWUP',
    ],
    MOBILE_SHOP: [
      'FOLLOW_UP_SCHEDULED',
      'FOLLOW_UP_OVERDUE',
      'FOLLOW_UP_COMPLETED',
      'INVOICE_CREATED',
      'PAYMENT_PENDING',
      'JOB_CREATED',
      'JOB_READY',
      'JOB_COMPLETED',
    ],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: AutomationSafetyService,
  ) {}

  /**
   * Get event registry (for UI dropdowns)
   */
  getEventRegistry() {
    return this.eventRegistry;
  }

  /**
   * Get valid events for a module type
   */
  getValidEventsForModule(moduleType: ModuleType): string[] {
    return this.eventRegistry[moduleType] || [];
  }

  /**
   * Helper: Map generic event type to Schema Enum
   */
  private mapEventToReminderTrigger(eventType: string): ReminderTriggerType {
    switch (eventType) {
      case 'DATE':
      case 'MEMBER_CREATED':
      case 'MEMBERSHIP_EXPIRY':
      case 'MEMBERSHIP_EXPIRY_BEFORE':
      case 'MEMBERSHIP_EXPIRY_AFTER':
      case 'PAYMENT_DUE':
      case 'PAYMENT_DUE_BEFORE':
      case 'PAYMENT_DUE_AFTER':
      case 'MEMBERSHIP_EXPIRED':
        return ReminderTriggerType.DATE;
      case 'AFTER_JOB':
        return ReminderTriggerType.AFTER_JOB;
      case 'AFTER_INVOICE':
        return ReminderTriggerType.AFTER_INVOICE;
      // MobileShop Events -> EVENT_BASED
      case 'FOLLOW_UP_SCHEDULED':
      case 'FOLLOW_UP_OVERDUE':
      case 'FOLLOW_UP_COMPLETED':
      case 'INVOICE_CREATED':
      case 'INVOICE_PAID':
      case 'PAYMENT_PENDING':
      case 'JOB_CREATED':
      case 'JOB_READY':
      case 'JOB_COMPLETED':
      case 'JOB_DELIVERED':
        return ReminderTriggerType.EVENT_BASED;
      default:
        return ReminderTriggerType.DATE; // Fallback
    }
  }

  /**
   * Validate event type for module
   */
  private validateEventType(moduleType: ModuleType, eventType: string): void {
    const validEvents = this.getValidEventsForModule(moduleType);
    if (!validEvents.includes(eventType)) {
      throw new BadRequestException(
        `Invalid eventType '${eventType}' for moduleType '${moduleType}'. Valid events: ${validEvents.join(', ')}`,
      );
    }
  }

  /**
   * Validate conditions structure
   */
  private validateConditions(conditions?: any): void {
    if (!conditions) return;

    if (typeof conditions !== 'object') {
      throw new BadRequestException('Conditions must be a JSON object');
    }

    // Ensure no dangerous operators
    const dangerousKeys = ['$where', '$function', 'eval', 'exec'];
    const conditionStr = JSON.stringify(conditions).toLowerCase();

    for (const key of dangerousKeys) {
      if (conditionStr.includes(key)) {
        throw new BadRequestException(
          `Dangerous operator '${key}' not allowed in conditions`,
        );
      }
    }

    // Validate structure if condition is present
    if (
      conditions.field ||
      conditions.operator ||
      conditions.value !== undefined
    ) {
      const validOperators = ['=', '>', '<', 'DAYS_BEFORE'];
      if (
        conditions.operator &&
        !validOperators.includes(conditions.operator)
      ) {
        throw new BadRequestException(
          `Invalid operator '${conditions.operator}'. Allowed: ${validOperators.join(', ')}`,
        );
      }
    }
  }

  /**
   * List all automations
   */
  async findAll(moduleType?: ModuleType) {
    const where = moduleType ? { moduleType } : {};

    return this.prisma.whatsAppAutomation.findMany({
      where,
      orderBy: [{ moduleType: 'asc' }, { eventType: 'asc' }],
    });
  }

  /**
   * Get single automation
   */
  async findOne(id: string) {
    const automation = await this.prisma.whatsAppAutomation.findUnique({
      where: { id },
    });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    return automation;
  }

  /**
   * Create new automation with validation
   */
  async create(dto: CreateAutomationDto, userId?: string) {
    // Normalize eventType: replace spaces with underscores
    const normalizedEventType = dto.eventType
      .replace(/\s+/g, '_')
      .toUpperCase();

    // Validate event type
    this.validateEventType(dto.moduleType, normalizedEventType);

    // Validate conditions
    this.validateConditions(dto.conditions);

    // Create automation
    const automation = await this.prisma.whatsAppAutomation.create({
      data: {
        moduleType: dto.moduleType,
        eventType: normalizedEventType, // Use normalized version
        templateKey: dto.templateKey,
        offsetDays: dto.offsetDays,
        enabled: dto.enabled ?? true,
        conditions: dto.conditions || undefined,
        description: dto.description || null,
        requiresOptIn: dto.requiresOptIn ?? false,
        createdBy: userId || null,
      },
    });

    this.logger.log(
      `Created automation ${automation.id} for ${dto.moduleType}.${normalizedEventType}`,
    );

    return automation;
  }

  /**
   * Update automation
   */
  async update(id: string, dto: UpdateAutomationDto) {
    // Check if exists
    const existing = await this.findOne(id);

    // Validate conditions if provided
    if (dto.conditions !== undefined) {
      this.validateConditions(dto.conditions);
    }

    const updated = await this.prisma.whatsAppAutomation.update({
      where: { id },
      data: {
        templateKey: dto.templateKey,
        offsetDays: dto.offsetDays,
        enabled: dto.enabled,
        conditions:
          dto.conditions === undefined ? undefined : dto.conditions || null,
        description: dto.description,
        requiresOptIn: dto.requiresOptIn,
      },
    });

    this.logger.log(`Updated automation ${id}`);

    return updated;
  }

  /**
   * Delete automation
   */
  async delete(id: string) {
    // Check if exists
    await this.findOne(id);

    await this.prisma.whatsAppAutomation.delete({
      where: { id },
    });

    this.logger.log(`Deleted automation ${id}`);

    return { success: true };
  }

  /**
   * Validate automation safety (for UI testing)
   */
  async validateAutomation(dto: ValidateAutomationDto) {
    // Validate event type
    this.validateEventType(dto.moduleType, dto.eventType);

    // Map template to feature
    const feature = this.safetyService.mapTemplateKeyToFeature(dto.templateKey);
    if (!feature) {
      return {
        valid: false,
        errors: [`Unknown template key: ${dto.templateKey}`],
      };
    }

    // Check template safety
    const templateCheck = await this.safetyService.validateTemplateSafety(
      dto.tenantId,
      dto.templateKey,
    );

    // Check feature safety
    const featureCheck = await this.safetyService.validateFeatureSafety(
      dto.tenantId,
      feature,
    );

    const errors: string[] = [];
    if (!templateCheck.safe) errors.push(templateCheck.reason!);
    if (!featureCheck.allowed) errors.push(featureCheck.reason!);

    return {
      valid: errors.length === 0,
      errors,
      warnings: dto.requiresOptIn
        ? ['This automation requires member opt-in (hasCoaching = true)']
        : [],
    };
  }

  /**
   * Get automation statistics
   */
  async getStatistics() {
    const [total, enabled, byModule] = await Promise.all([
      this.prisma.whatsAppAutomation.count(),
      this.prisma.whatsAppAutomation.count({ where: { enabled: true } }),
      this.prisma.whatsAppAutomation.groupBy({
        by: ['moduleType', 'enabled'],
        _count: true,
      }),
    ]);

    return {
      total,
      enabled,
      disabled: total - enabled,
      byModule: byModule.reduce((acc: any, item: any) => {
        const key = item.moduleType;
        if (!acc[key]) {
          acc[key] = { enabled: 0, disabled: 0 };
        }
        if (item.enabled) {
          acc[key].enabled = item._count;
        } else {
          acc[key].disabled = item._count;
        }
        return acc;
      }, {}),
    };
  }

  /**
   * ────────────────────────────────────────────────
   * ⚡ EVENT HANDLING (CORE ENGINE)
   * ────────────────────────────────────────────────
   */
  async handleEvent(event: {
    moduleType: 'GYM' | 'MOBILE_SHOP';
    eventType: string;
    tenantId: string;
    entityId: string;
    customerId?: string;
    payload?: any;
  }) {
    const { moduleType, eventType, tenantId, entityId } = event;
    let { customerId } = event;

    this.logger.log(
      `Handling event: ${moduleType}.${eventType} for ${tenantId}:${entityId}`,
    );

    // 1️⃣ Find matching automations
    const automations = await this.prisma.whatsAppAutomation.findMany({
      where: {
        moduleType: moduleType as any,
        eventType,
        enabled: true,
      },
    });

    if (automations.length === 0) {
      this.logger.debug(`No automations found for ${eventType}`);
      return; // Nothing to do
    }

    // 2️⃣ Resolve Customer ID based on Entity
    // (For MEMBER_CREATED, entityId is memberId)
    if (!customerId && moduleType === 'GYM' && eventType === 'MEMBER_CREATED') {
      const member = await this.prisma.member.findUnique({
        where: { id: entityId },
      });
      // Force cast to access customerId (recently added)
      customerId = (member as any)?.customerId || undefined;
    }

    // fallback or other modules...
    if (!customerId) {
      this.logger.warn(`Could not resolve customer for event ${eventType}`);
      return;
    }

    // 🔥 OPTIMIZATION: Fetch customer ONCE before loop (prevents N+1 query)
    const customer = await this.prisma.party.findUnique({
      where: { id: customerId },
    });

    if (!customer?.phone) {
      this.logger.warn(
        `Skipping automations: Customer ${customerId} has no phone`,
      );
      return;
    }

    // 3️⃣ EXECUTION STRATEGY: Transactional vs Scheduled
    // Transactional events (Utility/Auth) must be sent IMMEDIATELY.
    // Marketing/Reminders are scheduled.

    const TRANSACTIONAL_EVENTS = [
      'JOB_READY',
      'INVOICE_CREATED',
      'INVOICE_PAID',
      'OTP',
      'MEMBER_WELCOME', // Gym welcome
    ];

    const isTransactional = TRANSACTIONAL_EVENTS.includes(eventType);

    for (const automation of automations) {
      if (isTransactional) {
        // 🚀 FIRE INSTANTLY
        this.logger.log(
          `[INSTANT] Firing transactional automation ${automation.templateKey} for ${customerId}`,
        );

        // BETTER APPROACH: scheduledAt = NOW
        // If 'PENDING' is not in ReminderStatus enum, we might need to use 'SCHEDULED' with now().
        // Let's assume 'SCHEDULED' is fine if date is now.

        const scheduledAt = new Date(); // NOW

        await this.prisma.customerReminder.create({
          data: {
            tenantId,
            customerId,
            triggerType: this.mapEventToReminderTrigger(automation.eventType),
            triggerValue: entityId,
            channel: 'WHATSAPP',
            templateKey: automation.templateKey,
            status: 'SCHEDULED', // Use SCHEDULED effectively as pending if time is past/now
            scheduledAt,
          },
        });

        this.logger.log(
          `✅ Queued immediate automation ${automation.templateKey} for customer ${customerId}`,
        );
      } else {
        // 🕒 SCHEDULED REMINDER
        const scheduledAt = getScheduledAtUTC({
          offsetDays: automation.offsetDays || 0,
          localHour: 9, // Default to 9 AM
          localMinute: 0,
        });

        this.logger.log(
          `[REMINDER] ScheduledAt UTC=${scheduledAt.toISOString()}`,
        );

        await this.prisma.customerReminder.create({
          data: {
            tenantId,
            customerId,
            triggerType: this.mapEventToReminderTrigger(automation.eventType),
            triggerValue: entityId,
            channel: 'WHATSAPP',
            templateKey: automation.templateKey,
            status: 'SCHEDULED',
            scheduledAt,
          },
        });

        this.logger.log(
          `✅ Scheduled automation ${automation.templateKey} for customer ${customerId} (At: ${scheduledAt.toISOString()})`,
        );
      }
    }
  }
}
