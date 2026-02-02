import { Injectable } from '@nestjs/common';
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
      const variable = getVariableByKey(key);

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
        if (variable.required && (value === null || value === undefined || value === '')) {
             throw new Error(`Required variable '${key}' resolved to empty value`);
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
          error: (error as any).message,
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
        throw new Error(`Unknown source type: ${variable.sourceType}`);
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
        if (!memberId) throw new Error('Member context required');
        const member = await this.prisma.member.findUnique({
          where: { id: memberId },
        });
        return member?.[fieldName] ?? null;

      case 'Tenant':
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });
        return tenant?.[fieldName] ?? null;

      case 'Invoice':
        if (!invoiceId) throw new Error('Invoice context required');
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: invoiceId },
        });
        return invoice?.[fieldName] ?? null;

      case 'JobCard':
        if (!jobCardId) throw new Error('JobCard context required');
        const jobCard = await this.prisma.jobCard.findUnique({
          where: { id: jobCardId },
        });
        return jobCard?.[fieldName] ?? null;

      case 'Shop':
        if (!shopId) throw new Error('Shop context required');
        const shop = await this.prisma.shop.findUnique({
          where: { id: shopId },
        });
        return shop?.[fieldName] ?? null;
      case 'Party':
        // Resolve Party via Follow-up, Invoice, or JobCard
        if (followUpId) {
          const followUp = await this.prisma.customerFollowUp.findUnique({
            where: { id: followUpId },
            include: { customer: true },
          });
          return (followUp?.customer as any)?.[fieldName] ?? null;
        }
        if (invoiceId) {
          const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { customer: true },
          });
          return (invoice?.customer as any)?.[fieldName] ?? null;
        }
        if (jobCardId) {
          const jobCard = await this.prisma.jobCard.findUnique({
            where: { id: jobCardId },
            include: { customer: true },
          });
          return (jobCard?.customer as any)?.[fieldName] ?? null;
        }
        return null;
      case 'CustomerFollowUp':
        if (!followUpId) throw new Error('Follow-up context required');
        const followUp = await this.prisma.customerFollowUp.findUnique({
          where: { id: followUpId },
        });
        return followUp?.[fieldName] ?? null;
      case 'User':
        // Assignee Name for Follow-ups
        if (followUpId) {
          const followUp = await this.prisma.customerFollowUp.findUnique({
            where: { id: followUpId },
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
        throw new Error(`Unknown table: ${tableName}`);
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
        if (!memberId) throw new Error('Member context required');
        const member = await this.prisma.member.findUnique({
          where: { id: memberId },
          select: { feeAmount: true, paidAmount: true },
        });
        if (!member) return null;
        return member.feeAmount - member.paidAmount;
      }

      // MOBILE_SALES computed variables
      case 'invoicePaidAmount': {
        if (!invoiceId) throw new Error('Invoice context required');
        const receipts = await this.prisma.receipt.findMany({
          where: { linkedInvoiceId: invoiceId },
          select: { amount: true },
        });
        return receipts.reduce((sum, r) => sum + r.amount, 0);
      }

      case 'invoicePendingAmount': {
        if (!invoiceId) throw new Error('Invoice context required');
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { totalAmount: true },
        });
        const receipts = await this.prisma.receipt.findMany({
          where: { linkedInvoiceId: invoiceId },
          select: { amount: true },
        });
        const paid = receipts.reduce((sum, r) => sum + r.amount, 0);
        return (invoice?.totalAmount ?? 0) - paid;
      }

      case 'shopAddress': {
        if (!shopId) throw new Error('Shop context required');
        const shop = await this.prisma.shop.findUnique({
          where: { id: shopId },
          select: { addressLine1: true, city: true },
        });
        if (!shop) return null;
        return `${shop.addressLine1}, ${shop.city}`;
      }

      // MOBILE_REPAIR computed variables
      case 'deviceFullName': {
        if (!jobCardId) throw new Error('JobCard context required');
        const jobCard = await this.prisma.jobCard.findUnique({
          where: { id: jobCardId },
          select: { deviceBrand: true, deviceModel: true },
        });
        if (!jobCard) return null;
        return `${jobCard.deviceBrand} ${jobCard.deviceModel}`;
      }

      case 'balanceAmount': {
        if (!jobCardId) throw new Error('JobCard context required');
        const jobCard = await this.prisma.jobCard.findUnique({
          where: { id: jobCardId },
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

      default:
        throw new Error(
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
        throw new Error(
          `Required manual variable ${variable.key} not provided`,
        );
      }
      return null;
    }

    const value = context.manualInputs[variable.key];

    if (variable.required && !value) {
      throw new Error(`Required manual variable ${variable.key} is empty`);
    }

    // Validate against rules
    if (variable.validationRules && value) {
      const rules = variable.validationRules;

      if (
        typeof value === 'string' &&
        rules.maxLength &&
        value.length > rules.maxLength
      ) {
        throw new Error(
          `${variable.key} exceeds max length of ${rules.maxLength}`,
        );
      }

      if (
        typeof value === 'number' &&
        rules.min !== undefined &&
        value < rules.min
      ) {
        throw new Error(`${variable.key} must be at least ${rules.min}`);
      }

      if (
        typeof value === 'number' &&
        rules.max !== undefined &&
        value > rules.max
      ) {
        throw new Error(`${variable.key} must be at most ${rules.max}`);
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
