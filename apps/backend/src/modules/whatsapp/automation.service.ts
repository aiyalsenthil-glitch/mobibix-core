import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AutomationSafetyService } from './automation-safety.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  ValidateAutomationDto,
} from './dto/automation.dto';
import { ModuleType } from '@prisma/client';

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
      'PAYMENT_DUE',
      'COACHING_FOLLOWUP',
    ],
    MOBILE_SHOP: [
      'JOB_CREATED',
      'JOB_COMPLETED',
      'INVOICE_CREATED',
      'PAYMENT_PENDING',
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
    // Validate event type
    this.validateEventType(dto.moduleType, dto.eventType);

    // Validate conditions
    this.validateConditions(dto.conditions);

    // Create automation
    const automation = await this.prisma.whatsAppAutomation.create({
      data: {
        moduleType: dto.moduleType,
        eventType: dto.eventType,
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
      `Created automation ${automation.id} for ${dto.moduleType}.${dto.eventType}`,
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
}
