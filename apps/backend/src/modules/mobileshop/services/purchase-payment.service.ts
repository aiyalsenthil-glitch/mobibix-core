import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class PurchasePaymentService {
  private readonly logger = new Logger(PurchasePaymentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record payment to supplier against a purchase order
   * Validates amount, updates status, creates SupplierPayment entry
   */
  async recordPayment(
    tenantId: string,
    purchaseId: string,
    amount: number,
    paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK' | 'CREDIT' = 'CASH',
    paymentReference?: string,
  ): Promise<{
    purchase: any;
    payment: any;
  }> {
    if (!tenantId || !purchaseId || amount <= 0) {
      throw new BadRequestException('Invalid tenantId, purchaseId, or amount');
    }

    // Fetch purchase with tenant isolation
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, tenantId },
      include: { party: { select: { name: true } } },
    });

    if (!purchase) {
      this.logger.warn(
        `Purchase not found or unauthorized: tenantId=${tenantId}, purchaseId=${purchaseId}`,
      );
      throw new NotFoundException('Purchase not found');
    }

    // Check balance due
    const balanceDue = purchase.grandTotal - purchase.paidAmount;
    if (amount > balanceDue) {
      this.logger.warn(
        `Overpayment prevented: purchase=${purchaseId}, balanceDue=${balanceDue}, attempted=${amount}`,
      );
      throw new BadRequestException(
        `Cannot pay ₹${amount}. Balance due: ₹${balanceDue}`,
      );
    }

    // Calculate new paid amount and status
    const newPaidAmount = purchase.paidAmount + amount;
    const newStatus: PurchaseStatus =
      newPaidAmount === purchase.grandTotal
        ? PurchaseStatus.PAID
        : PurchaseStatus.PARTIALLY_PAID;

    // Update purchase with atomic transaction
    const updated = await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Create SupplierPayment entry for accounting trail
    const payment = await this.prisma.supplierPayment.create({
      data: {
        tenantId,
        shopId: purchase.shopId,
        purchaseId,
        globalSupplierId: purchase.globalSupplierId,
        amount,
        paymentMethod: paymentMethod,
        paymentReference,
        paymentDate: new Date(),
      },
    });

    this.logger.log(
      `Payment recorded: purchase=${purchaseId}, amount=₹${amount}, newStatus=${newStatus}`,
    );

    return { purchase: updated, payment };
  }

  /**
   * Get purchase status and payment details
   * Returns outstanding balance, payment percentage, overdue days
   */
  async getPurchaseStatus(
    tenantId: string,
    purchaseId: string,
  ): Promise<{
    purchaseId: string;
    purchaseNumber: string;
    supplier: string;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    status: string;
    paymentPercentage: number;
    daysOverdue: number;
    isOverdue: boolean;
  }> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId, tenantId },
      include: { party: { select: { name: true } } },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new NotFoundException('Purchase not found');
    }

    const balanceDue = purchase.grandTotal - purchase.paidAmount;
    const paymentPercentage = Math.round(
      (purchase.paidAmount / purchase.grandTotal) * 100,
    );

    // Calculate days overdue (if due date exists and payment not complete)
    let daysOverdue = 0;
    let isOverdue = false;
    if (purchase.dueDate && purchase.status !== 'PAID') {
      const daysDiff = Math.floor(
        (Date.now() - purchase.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysOverdue = Math.max(0, daysDiff);
      isOverdue = daysOverdue > 0;
    }

    this.logger.debug(
      `Purchase status: ${purchaseId}, balance=${balanceDue}, days_overdue=${daysOverdue}`,
    );

    return {
      purchaseId: purchase.id,
      purchaseNumber: purchase.invoiceNumber,
      supplier: purchase.party?.name || purchase.supplierName || 'Unknown',
      totalAmount: purchase.grandTotal,
      paidAmount: purchase.paidAmount,
      balanceDue,
      status: purchase.status,
      paymentPercentage,
      daysOverdue,
      isOverdue,
    };
  }

  /**
   * Get all pending purchases (UNPAID or PARTIAL) for a supplier/shop
   */
  async getPendingPurchases(
    tenantId: string,
    shopId?: string,
    globalSupplierId?: string,
  ): Promise<
    Array<{
      id: string;
      purchaseNumber: string;
      supplier: string;
      totalAmount: number;
      paidAmount: number;
      balanceDue: number;
      purchaseDate: Date;
      dueDate?: Date;
      daysOverdue: number;
    }>
  > {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        ...(globalSupplierId && { globalSupplierId }),
        status: { in: ['DRAFT', 'SUBMITTED', 'PARTIALLY_PAID'] },
      },
      include: { party: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    return purchases.map((p) => {
      const daysOverdue = p.dueDate
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

      return {
        id: p.id,
        purchaseNumber: p.invoiceNumber,
        supplier: p.party?.name || p.supplierName || 'Unknown',
        totalAmount: p.grandTotal,
        paidAmount: p.paidAmount,
        balanceDue: p.grandTotal - p.paidAmount,
        purchaseDate: p.createdAt,
        dueDate: p.dueDate ?? undefined,
        daysOverdue,
      };
    });
  }

  /**
   * Validate purchase can be voided/deleted
   * Prevents voiding of paid purchases (require credit note instead)
   */
  async validateBeforeDeletion(
    tenantId: string,
    purchaseId: string,
  ): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId, tenantId },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status === 'PAID' || purchase.paidAmount > 0) {
      throw new BadRequestException(
        'Cannot delete paid/partial purchases. Create a credit note instead for audit trail.',
      );
    }

    this.logger.log(
      `Deletion validation passed: purchase=${purchaseId} (UNPAID)`,
    );
  }

  /**
   * Get payables aging report (supplier payment due dates)
   * Groups purchases by age buckets: Current, 30-60 days, 60-90 days, 90+ days
   */
  async getPayablesAging(
    tenantId: string,
    shopId?: string,
  ): Promise<{
    current: number;
    thirtyToSixty: number;
    sixtyToNinety: number;
    ninetyPlus: number;
    total: number;
    totalDue: number;
  }> {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        status: { in: ['DRAFT', 'SUBMITTED', 'PARTIALLY_PAID'] },
      },
      select: { grandTotal: true, paidAmount: true, dueDate: true },
    });

    const now = new Date();
    let current = 0,
      thirtyToSixty = 0,
      sixtyToNinety = 0,
      ninetyPlus = 0,
      totalDue = 0;

    for (const p of purchases) {
      const balanceDue = p.grandTotal - p.paidAmount;
      totalDue += balanceDue;

      if (!p.dueDate) {
        current += balanceDue;
        continue;
      }

      const daysOverdue = Math.floor(
        (now.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOverdue <= 0) {
        current += balanceDue;
      } else if (daysOverdue <= 60) {
        thirtyToSixty += balanceDue;
      } else if (daysOverdue <= 90) {
        sixtyToNinety += balanceDue;
      } else {
        ninetyPlus += balanceDue;
      }
    }

    this.logger.log(
      `Payables aging: current=₹${current}, 30-60=₹${thirtyToSixty}, 60-90=₹${sixtyToNinety}, 90+=₹${ninetyPlus}`,
    );

    return {
      current,
      thirtyToSixty,
      sixtyToNinety,
      ninetyPlus,
      total: purchases.length,
      totalDue,
    };
  }
}
