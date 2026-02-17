import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  WhatsAppModule,
  VariableDefinition,
  VariableSourceType,
  formatVariableValue,
  getVariableByKey,
  getVariablesByContext,
  getVariablesByModule,
} from './variable-registry';

/**
 * WhatsApp Variable Resolver Service
 *
 * Extracts actual values from Prisma entities based on variable definitions.
 * Handles ENTITY (direct fields), COMPUTED (calculations), and MANUAL (user input).
 *
 * SAFETY RULES:
 * - Returns null if required field is missing (prevents broken messages)
 * - Validates data types before formatting
 * - Logs resolution failures for debugging
 */

export interface ResolvedVariable {
  key: string;
  value: any;
  formatted: string;
  source: VariableSourceType;
  error?: string;
}

export interface VariableResolutionContext {
  module: WhatsAppModule;
  tenantId: string;
  memberId?: string; // For GYM
  invoiceId?: string; // For MOBILE_SALES
  jobCardId?: string; // For MOBILE_REPAIR
  followUpId?: string; // For CRM/Follow-ups
  shopId?: string; // For MOBILE_SALES and MOBILE_REPAIR
  manualInputs?: Record<string, any>; // User-provided values for MANUAL variables
}

@Injectable()
export class WhatsAppVariableResolver {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve all variables for a template based on context
   */
  async resolveVariables(
    variableKeys: string[],
    context: VariableResolutionContext & { eventType?: string },
  ): Promise<Map<string, ResolvedVariable>> {
    const resolved = new Map<string, ResolvedVariable>();

    // Get allowed variables for this context
    const allowedVars = context.eventType
      ? getVariablesByContext(context.module, context.eventType)
      : getVariablesByModule(context.module);

    const allowedKeys = new Set(allowedVars.map((v) => v.key));

    for (const key of variableKeys) {
      // 🚨 CRITICAL FIX: Prefer definition from Context (Module+Event) over Global Registry
      // The Global Registry flattens keys, causing collisions (e.g., 'customerName' maps to JobCard but needed for Invoice).
      // allowedVars contains the CORRECT definitions for this specific event.
      let variable = allowedVars.find((v) => v.key === key);

      // Fallback to global lookup if not found in context (legacy behavior)
      if (!variable) {
        variable = getVariableByKey(key);
      }

      if (!variable) {
        resolved.set(key, {
          key,
          value: null,
          formatted: '',
          source: VariableSourceType.ENTITY,
          error: `Variable ${key} not found in registry`,
        });
        continue;
      }

      // 🚨 SAFETY CHECK: Is this variable allowed for the current module/event?
      if (!allowedKeys.has(key)) {
        resolved.set(key, {
          key,
          value: null,
          formatted: '',
          source: variable.sourceType,
          error: `Variable ${key} is not allowed for ${context.module} ${context.eventType || ''}`,
        });
        continue;
      }

      try {
        const value = await this.resolveVariable(variable, context);
        const formatted = formatVariableValue(value, variable.dataType);

        // 🚨 STRICT VALIDATION: If variable is required but result is empty/null, FAIL
        if (
          variable.required &&
          (value === null || value === undefined || value === '')
        ) {
          throw new BadRequestException(
            `Required variable '${key}' resolved to empty value`,
          );
        }

        resolved.set(key, {
          key,
          value: value ?? null,
          formatted,
          source: variable.sourceType,
        });
      } catch (error) {
        // Capture specific resolution error
        resolved.set(key, {
          key,
          value: null,
          formatted: '',
          source: variable.sourceType,
          error: error.message,
        });
      }
    }

    return resolved;
  }

  /**
   * Resolve a single variable based on its source type
   */
  private async resolveVariable(
    variable: VariableDefinition,
    context: VariableResolutionContext,
  ): Promise<any> {
    switch (variable.sourceType) {
      case VariableSourceType.ENTITY:
        return this.resolveEntityVariable(variable, context);

      case VariableSourceType.COMPUTED:
        return this.resolveComputedVariable(variable, context);

      case VariableSourceType.MANUAL:
        return this.resolveManualVariable(variable, context);

      default:
        throw new BadRequestException(
          `Unknown source type: ${variable.sourceType}`,
        );
    }
  }

  /**
   * Resolve ENTITY variables (direct Prisma field access)
   */
  private async resolveEntityVariable(
    variable: VariableDefinition,
    context: VariableResolutionContext,
  ): Promise<any> {
    const {
      module,
      tenantId,
      memberId,
      invoiceId,
      jobCardId,
      followUpId,
      shopId,
    } = context;

    // Parse source path (e.g., "Member.fullName" -> table: Member, field: fullName)
    const [tableName, fieldName] = variable.sourcePath.split('.');

    switch (tableName) {
      case 'Member':
        if (!memberId) throw new BadRequestException('Member context required');
        const member = await this.prisma.member.findFirst({
          where: { id: memberId, tenantId },
        });
        return member?.[fieldName] ?? null;

      case 'Tenant':
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        return tenant?.[fieldName] ?? null;

      case 'Invoice':
        if (!invoiceId)
          throw new BadRequestException('Invoice context required');
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: invoiceId, tenantId },
        });
        return invoice?.[fieldName] ?? null;

      case 'JobCard':
        if (!jobCardId)
          throw new BadRequestException('JobCard context required');
        const jobCard = await this.prisma.jobCard.findFirst({
          where: { id: jobCardId, tenantId },
        });
        return jobCard?.[fieldName] ?? null;

      case 'Shop':
        if (!shopId) throw new BadRequestException('Shop context required');
        const shop = await this.prisma.shop.findFirst({
          where: { id: shopId, tenantId },
        });
        return shop?.[fieldName] ?? null;
      case 'Party':
        // Resolve Party via Follow-up, Invoice, or JobCard
        if (followUpId) {
          const followUp = await this.prisma.customerFollowUp.findFirst({
            where: { id: followUpId, tenantId },
            include: { customer: true },
          });
          return (followUp?.customer as any)?.[fieldName] ?? null;
        }
        if (invoiceId) {
          const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, tenantId },
            include: { customer: true },
          });
          return (invoice?.customer as any)?.[fieldName] ?? null;
        }
        if (jobCardId) {
          const jobCard = await this.prisma.jobCard.findFirst({
            where: { id: jobCardId, tenantId },
            include: { customer: true },
          });
          return (jobCard?.customer as any)?.[fieldName] ?? null;
        }
        return null;
      case 'CustomerFollowUp':
        if (!followUpId)
          throw new BadRequestException('Follow-up context required');
        const followUp = await this.prisma.customerFollowUp.findFirst({
          where: { id: followUpId, tenantId },
        });
        return followUp?.[fieldName] ?? null;
      case 'User':
        // Assignee Name for Follow-ups
        if (followUpId) {
          const followUp = await this.prisma.customerFollowUp.findFirst({
            where: { id: followUpId, tenantId },
            include: { assignedToUser: true },
          });
          // Support both fullName and name
          return (
            (followUp?.assignedToUser as any)?.fullName ||
            (followUp?.assignedToUser as any)?.name ||
            null
          );
        }
        return null;

      default:
        throw new BadRequestException(`Unknown table: ${tableName}`);
    }
  }

  /**
   * Resolve COMPUTED variables (calculations from multiple fields)
   */
  private async resolveComputedVariable(
    variable: VariableDefinition,
    context: VariableResolutionContext,
  ): Promise<any> {
    const { module, tenantId, memberId, invoiceId, jobCardId, shopId } =
      context;

    // Handle specific computed variables
    switch (variable.key) {
      // GYM computed variables
      case 'dueAmount': {
        if (!memberId) throw new BadRequestException('Member context required');
        const member = await this.prisma.member.findFirst({
          where: { id: memberId, tenantId },
          select: { feeAmount: true, paidAmount: true },
        });
        if (!member) return null;
        return member.feeAmount - member.paidAmount;
      }

      // MOBILE_SALES computed variables
      case 'invoicePaidAmount': {
        if (!invoiceId)
          throw new BadRequestException('Invoice context required');
        const receipts = await this.prisma.receipt.findMany({
          where: { linkedInvoiceId: invoiceId, tenantId },
          select: { amount: true },
        });
        return receipts.reduce((sum, r) => sum + r.amount, 0);
      }

      case 'invoicePendingAmount': {
        if (!invoiceId)
          throw new BadRequestException('Invoice context required');
        const invoice = await this.prisma.invoice.findFirst({
          where: { id: invoiceId, tenantId },
          select: { totalAmount: true },
        });
        const receipts = await this.prisma.receipt.findMany({
          where: { linkedInvoiceId: invoiceId, tenantId },
          select: { amount: true },
        });
        const paid = receipts.reduce((sum, r) => sum + r.amount, 0);
        return (invoice?.totalAmount ?? 0) - paid;
      }

      case 'shopAddress': {
        if (!shopId) throw new BadRequestException('Shop context required');
        const shop = await this.prisma.shop.findFirst({
          where: { id: shopId, tenantId },
          select: { addressLine1: true, city: true },
        });
        if (!shop) return null;
        return `${shop.addressLine1}, ${shop.city}`;
      }

      // MOBILE_REPAIR computed variables
      case 'deviceFullName': {
        if (!jobCardId)
          throw new BadRequestException('JobCard context required');
        const jobCard = await this.prisma.jobCard.findFirst({
          where: { id: jobCardId, tenantId },
          select: { deviceBrand: true, deviceModel: true },
        });
        if (!jobCard) return null;
        return `${jobCard.deviceBrand} ${jobCard.deviceModel}`;
      }

      case 'balanceAmount': {
        if (!jobCardId)
          throw new BadRequestException('JobCard context required');
        const jobCard = await this.prisma.jobCard.findFirst({
          where: { id: jobCardId, tenantId },
          select: {
            finalCost: true,
            estimatedCost: true,
            advancePaid: true,
          },
        });
        if (!jobCard) return null;
        const cost = jobCard.finalCost ?? jobCard.estimatedCost ?? 0;
        return cost - jobCard.advancePaid;
      }

      case 'invoiceLink':
      case 'invoice_link': {
        if (!invoiceId) return null;
        const baseUrl = process.env.FRONTEND_URL || 'https://mobibix.in';
        return `${baseUrl}/print/invoice/${invoiceId}`;
      }

      case 'jobTrackingLink':
      case 'job_tracking_link': {
        if (!jobCardId) return null;
        const jobCard = await this.prisma.jobCard.findUnique({
          where: { id: jobCardId },
          select: { publicToken: true },
        });
        if (!jobCard?.publicToken) return null;
        const baseUrl = process.env.FRONTEND_URL || 'https://mobibix.in';
        return `${baseUrl}/track/${jobCard.publicToken}`;
      }

      default:
        throw new BadRequestException(
          `Computed variable ${variable.key} not implemented in resolver`,
        );
    }
  }

  /**
   * Resolve MANUAL variables (user input at send time)
   */
  private resolveManualVariable(
    variable: VariableDefinition,
    context: VariableResolutionContext,
  ): any {
    if (!context.manualInputs) {
      if (variable.required) {
        throw new BadRequestException(
          `Required manual variable ${variable.key} not provided`,
        );
      }
      return null;
    }

    const value = context.manualInputs[variable.key];

    if (variable.required && !value) {
      throw new BadRequestException(
        `Required manual variable ${variable.key} is empty`,
      );
    }

    // Validate against rules
    if (variable.validationRules && value) {
      const rules = variable.validationRules;

      if (
        typeof value === 'string' &&
        rules.maxLength &&
        value.length > rules.maxLength
      ) {
        throw new BadRequestException(
          `${variable.key} exceeds max length of ${rules.maxLength}`,
        );
      }

      if (
        typeof value === 'number' &&
        rules.min !== undefined &&
        value < rules.min
      ) {
        throw new BadRequestException(
          `${variable.key} must be at least ${rules.min}`,
        );
      }

      if (
        typeof value === 'number' &&
        rules.max !== undefined &&
        value > rules.max
      ) {
        throw new BadRequestException(
          `${variable.key} must be at most ${rules.max}`,
        );
      }
    }

    return value;
  }

  /**
   * Validate resolution context has required IDs for module
   */
  validateContext(
    module: WhatsAppModule,
    context: VariableResolutionContext,
  ): { valid: boolean; error?: string } {
    switch (module) {
      case WhatsAppModule.GYM:
        if (!context.memberId) {
          return { valid: false, error: 'Member ID required for GYM module' };
        }
        break;

      case WhatsAppModule.MOBILE_SALES:
        if (!context.invoiceId) {
          return {
            valid: false,
            error: 'Invoice ID required for MOBILE_SALES module',
          };
        }
        if (!context.shopId) {
          return {
            valid: false,
            error: 'Shop ID required for MOBILE_SALES module',
          };
        }
        break;

      case WhatsAppModule.MOBILE_REPAIR:
        if (!context.jobCardId) {
          return {
            valid: false,
            error: 'JobCard ID required for MOBILE_REPAIR module',
          };
        }
        if (!context.shopId) {
          return {
            valid: false,
            error: 'Shop ID required for MOBILE_REPAIR module',
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Check if all required variables resolved successfully
   */
  validateResolution(resolvedVariables: Map<string, ResolvedVariable>): {
    valid: boolean;
    missingRequired: string[];
  } {
    const missingRequired: string[] = [];

    for (const [key, resolved] of resolvedVariables.entries()) {
      const variable = getVariableByKey(key);

      if (
        variable?.required &&
        (resolved.value === null ||
          resolved.value === undefined ||
          resolved.error)
      ) {
        missingRequired.push(key);
      }
    }

    return {
      valid: missingRequired.length === 0,
      missingRequired,
    };
  }
}
