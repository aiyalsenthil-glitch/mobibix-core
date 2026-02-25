import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditEventType {
  SUBMISSION_ATTEMPT = 'SUBMISSION_ATTEMPT',
  SUBMISSION_SUCCESS = 'SUBMISSION_SUCCESS',
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  GST_VERIFIED = 'GST_VERIFIED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

@Injectable()
export class PurchaseAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log purchase submission attempt
   */
  async logSubmissionAttempt(
    tenantId: string,
    purchaseId: string,
    userId: string,
    status: 'ATTEMPT' | 'SUCCESS' | 'FAILED',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Store in audit log (implementation: store in JSON or create AuditLog table)
    // For now, rely on Prisma audit trail via createdAt/updatedAt + transaction logs
    // TODO: Persist to dedicated AuditLog table when created
    // Currently a no-op placeholder
  }

  /**
   * Get submission history for a purchase
   */
  async getSubmissionHistory(
    tenantId: string,
    purchaseId: string,
  ): Promise<
    Array<{
      timestamp: Date;
      status: string;
      userId: string;
      details: string;
    }>
  > {
    // Return Purchase.updatedAt history
    // (Full audit trail would require separate AuditLog table with timestamps)
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        invoiceNumber: true,
        tenantId: true,
      },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      return [];
    }

    return [
      {
        timestamp: purchase.updatedAt,
        status: purchase.status,
        userId: 'system', // Would need userId tracking in Purchase model
        details: `Purchase status: ${purchase.status}`,
      },
    ];
  }

  /**
   * Check for duplicate submission attempts (prevents idempotency issues)
   */
  async checkDuplicateSubmission(
    tenantId: string,
    purchaseId: string,
    withinSeconds: number = 5,
  ): Promise<boolean> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { updatedAt: true, tenantId: true },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      return false;
    }

    const timeSinceLastUpdate =
      (Date.now() - purchase.updatedAt.getTime()) / 1000;
    return timeSinceLastUpdate < withinSeconds;
  }

  /**
   * Get all recent submission attempts (audit trail)
   */
  async getRecentSubmissionAttempts(
    tenantId: string,
    hoursBack: number = 24,
  ): Promise<
    Array<{
      purchaseId: string;
      invoiceNumber: string;
      status: string;
      updatedAt: Date;
    }>
  > {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        updatedAt: { gte: since },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return purchases.map((p) => ({
      purchaseId: p.id,
      invoiceNumber: p.invoiceNumber,
      status: p.status,
      updatedAt: p.updatedAt,
    }));
  }
}
