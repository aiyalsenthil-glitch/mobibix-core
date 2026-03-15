import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ModuleType } from '@prisma/client';

/**
 * ────────────────────────────────────────────────
 * ENTITY RESOLVER SERVICE
 * ────────────────────────────────────────────────
 *
 * RESPONSIBILITY: Map events to eligible entities
 *
 * This is the ONLY module-specific layer in the system.
 * Core automation engine remains unchanged.
 *
 * GUARANTEES:
 * - Event-driven (no mass scanning)
 * - Returns only eligible entities
 * - Contains NO WhatsApp logic
 * - Clean separation of concerns
 */

export interface ResolvedEntity {
  customerId: string;
  metadata?: Record<string, any>; // Optional context for template variables
}

@Injectable()
export class EntityResolverService {
  private readonly logger = new Logger(EntityResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ────────────────────────────────────────────────
   * MASTER RESOLVER
   * ────────────────────────────────────────────────
   * Routes to module-specific resolver based on moduleType
   */
  async resolveEntities(
    moduleType: ModuleType,
    eventType: string,
    tenantId: string,
    offsetDays: number,
    conditions?: any,
  ): Promise<ResolvedEntity[]> {
    switch (String(moduleType)) {
      case 'GYM':
        return this.resolveGymEntities(
          tenantId,
          eventType,
          offsetDays,
          conditions,
        );
      case 'MOBILE_SHOP':
        return this.resolveMobileShopEntities(
          tenantId,
          eventType,
          offsetDays,
          conditions,
        );
      default:
        this.logger.warn(`Unknown module type: ${moduleType}`);
        return [];
    }
  }

  private normalizeGymEvent(
    eventType: string,
    offsetDays: number,
  ): {
    normalizedEventType: string;
    effectiveOffsetDays: number;
  } {
    if (eventType === 'DATE') {
      return {
        normalizedEventType: 'MEMBERSHIP_EXPIRY',
        effectiveOffsetDays: offsetDays,
      };
    }

    if (eventType === 'MEMBERSHIP_EXPIRY_BEFORE') {
      return {
        normalizedEventType: 'MEMBERSHIP_EXPIRY',
        effectiveOffsetDays: Math.abs(offsetDays),
      };
    }

    if (eventType === 'MEMBERSHIP_EXPIRY_AFTER') {
      return {
        normalizedEventType: 'MEMBERSHIP_EXPIRY',
        effectiveOffsetDays: -Math.abs(offsetDays),
      };
    }

    if (eventType === 'PAYMENT_DUE_BEFORE') {
      return {
        normalizedEventType: 'PAYMENT_DUE',
        effectiveOffsetDays: Math.abs(offsetDays),
      };
    }

    if (eventType === 'PAYMENT_DUE_AFTER') {
      return {
        normalizedEventType: 'PAYMENT_DUE',
        effectiveOffsetDays: -Math.abs(offsetDays),
      };
    }

    return {
      normalizedEventType: eventType,
      effectiveOffsetDays: offsetDays,
    };
  }

  /**
   * ────────────────────────────────────────────────
   * GYM MODULE RESOLVER
   * ────────────────────────────────────────────────
   */
  private async resolveGymEntities(
    tenantId: string,
    eventType: string,
    offsetDays: number,
    conditions?: any,
  ): Promise<ResolvedEntity[]> {
    const { normalizedEventType, effectiveOffsetDays } = this.normalizeGymEvent(
      eventType,
      offsetDays,
    );

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + effectiveOffsetDays);
    targetDate.setHours(0, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    switch (normalizedEventType) {
      case 'MEMBER_CREATED': {
        // Members created today
        const members = await this.prisma.member.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: targetDate,
              lte: endDate,
            },
            isActive: true,
            ...this.buildConditionFilter(conditions),
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        });

        return members.map((m) => ({
          customerId: m.id,
          metadata: { name: m.fullName, phone: m.phone },
        }));
      }

      case 'MEMBERSHIP_EXPIRY': {
        // Members expiring on target date
        const members = await this.prisma.member.findMany({
          where: {
            tenantId,
            membershipEndAt: {
              gte: targetDate,
              lte: endDate,
            },
            isActive: true,
            ...this.buildConditionFilter(conditions),
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            membershipEndAt: true,
          },
        });

        return members.map((m) => ({
          customerId: m.id,
          metadata: {
            name: m.fullName,
            phone: m.phone,
            expiryDate: m.membershipEndAt,
          },
        }));
      }

      case 'PAYMENT_DUE': {
        // Members with payment due on target date
        const members = await this.prisma.member.findMany({
          where: {
            tenantId,
            paymentDueDate: {
              gte: targetDate,
              lte: endDate,
            },
            isActive: true,
            paymentStatus: {
              in: ['PENDING', 'PARTIAL'],
            },
            ...this.buildConditionFilter(conditions),
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
            paymentDueDate: true,
            feeAmount: true,
            paidAmount: true,
          },
        });

        return members.map((m) => ({
          customerId: m.id,
          metadata: {
            name: m.fullName,
            phone: m.phone,
            dueDate: m.paymentDueDate,
            dueAmount: m.feeAmount - m.paidAmount,
          },
        }));
      }

      case 'TRAINER_ASSIGNED': {
        // Members with trainer assignment (requires hasCoaching = true)

        const members = await this.prisma.member.findMany({
          where: {
            tenantId,
            hasCoaching: true, // Explicit opt-in
            isActive: true,
            ...this.buildConditionFilter(conditions),
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        });

        return members.map((m) => ({
          customerId: m.id,
          metadata: { name: m.fullName, phone: m.phone },
        }));
      }

      case 'COACHING_FOLLOWUP': {
        // Members with active coaching (requires hasCoaching = true)

        const members = await this.prisma.member.findMany({
          where: {
            tenantId,
            hasCoaching: true, // Explicit opt-in
            isActive: true,
            ...this.buildConditionFilter(conditions),
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        });

        return members.map((m) => ({
          customerId: m.id,
          metadata: { name: m.fullName, phone: m.phone },
        }));
      }

      default:
        this.logger.warn(`Unknown GYM event type: ${eventType}`);
        return [];
    }
  }

  /**
   * ────────────────────────────────────────────────
   * MOBILE SHOP MODULE RESOLVER
   * ────────────────────────────────────────────────
   */
  private async resolveMobileShopEntities(
    tenantId: string,
    eventType: string,
    offsetDays: number,
    conditions?: any,
  ): Promise<ResolvedEntity[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offsetDays);
    targetDate.setHours(0, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    switch (eventType) {
      case 'JOB_CREATED': {
        // Job cards created on target date
        const jobs = await this.prisma.jobCard.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: targetDate,
              lte: endDate,
            },
            customerId: { not: null },
            ...this.buildConditionFilter(conditions),
          },
          select: {
            customerId: true,
            jobNumber: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        });

        return jobs
          .filter((job) => job.customerId)
          .map((job) => ({
            customerId: job.customerId!,
            metadata: {
              jobNumber: job.jobNumber,
              name: job.customer?.name,
              phone: job.customer?.phone,
            },
          }));
      }

      case 'JOB_READY': {
        // Job cards ready (prepared) on target date
        const jobs = await this.prisma.jobCard.findMany({
          where: {
            tenantId,
            updatedAt: {
              gte: targetDate,
              lte: endDate,
            },
            status: 'READY',
            customerId: { not: null },
            ...this.buildConditionFilter(conditions),
          },
          select: {
            customerId: true,
            jobNumber: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        });

        return jobs
          .filter((job) => job.customerId)
          .map((job) => ({
            customerId: job.customerId!,
            metadata: {
              jobNumber: job.jobNumber,
              name: job.customer?.name,
              phone: job.customer?.phone,
            },
          }));
      }

      case 'JOB_COMPLETED': {
        // Job cards completed (delivered) on target date
        const jobs = await this.prisma.jobCard.findMany({
          where: {
            tenantId,
            updatedAt: {
              gte: targetDate,
              lte: endDate,
            },
            status: 'DELIVERED',
            customerId: { not: null },
            ...this.buildConditionFilter(conditions),
          },
          select: {
            customerId: true,
            jobNumber: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        });

        return jobs
          .filter((job) => job.customerId)
          .map((job) => ({
            customerId: job.customerId!,
            metadata: {
              jobNumber: job.jobNumber,
              name: job.customer?.name,
              phone: job.customer?.phone,
            },
          }));
      }

      case 'INVOICE_CREATED': {
        // Invoices created on target date
        const invoices = await this.prisma.invoice.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: targetDate,
              lte: endDate,
            },
            customerId: { not: null },
            ...this.buildConditionFilter(conditions),
          },
          select: {
            customerId: true,
            invoiceNumber: true,
            totalAmount: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        });

        return invoices
          .filter((inv) => inv.customerId)
          .map((inv) => ({
            customerId: inv.customerId!,
            metadata: {
              invoiceNumber: inv.invoiceNumber,
              amount: inv.totalAmount,
              name: inv.customer?.name,
              phone: inv.customer?.phone,
            },
          }));
      }

      case 'PAYMENT_PENDING': {
        // Invoices with pending payment
        const invoices = await this.prisma.invoice.findMany({
          where: {
            tenantId,
            paymentStatus: 'PENDING',
            customerId: { not: null },
            createdAt: {
              lte: targetDate, // Created before or on target date
            },
            ...this.buildConditionFilter(conditions),
          },
          select: {
            customerId: true,
            invoiceNumber: true,
            totalAmount: true,
            createdAt: true,
            customer: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        });

        return invoices
          .filter((inv) => inv.customerId)
          .map((inv) => ({
            customerId: inv.customerId!,
            metadata: {
              invoiceNumber: inv.invoiceNumber,
              amount: inv.totalAmount,
              dueDate: inv.createdAt,
              name: inv.customer?.name,
              phone: inv.customer?.phone,
            },
          }));
      }

      default:
        this.logger.warn(`Unknown MOBILE_SHOP event type: ${eventType}`);
        return [];
    }
  }

  /**
   * ────────────────────────────────────────────────
   * CONDITION FILTER BUILDER
   * ────────────────────────────────────────────────
   * Build Prisma where clause from structured conditions
   */
  private buildConditionFilter(conditions?: any): any {
    if (!conditions || typeof conditions !== 'object') {
      return {};
    }

    const filter: any = {};

    // Simple equality operator
    if (
      conditions.field &&
      conditions.operator === '=' &&
      conditions.value !== undefined
    ) {
      filter[conditions.field] = conditions.value;
    }

    // Greater than operator
    if (
      conditions.field &&
      conditions.operator === '>' &&
      conditions.value !== undefined
    ) {
      filter[conditions.field] = { gt: conditions.value };
    }

    // Less than operator
    if (
      conditions.field &&
      conditions.operator === '<' &&
      conditions.value !== undefined
    ) {
      filter[conditions.field] = { lt: conditions.value };
    }

    // DAYS_BEFORE is handled at resolver level (offsetDays)
    // No need to add to filter

    return filter;
  }
}
