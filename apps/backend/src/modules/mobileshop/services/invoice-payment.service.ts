import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { LoyaltyService } from '../../../core/loyalty/loyalty.service';
import { InvoiceStatus, PaymentMode } from '@prisma/client';

/**
 * InvoicePaymentService: Manages invoice payment collections
 *
 * Responsibilities:
 * - Record customer payments against invoices
 * - Update invoice.paidAmount and status
 * - Prevent overpayment
 * - Block deletion of paid/partial invoices
 * - Create Receipt entries for accounting
 */
@Injectable()
export class InvoicePaymentService {
  private readonly logger = new Logger(InvoicePaymentService.name);

  constructor(
    private prisma: PrismaService,
    private loyaltyService: LoyaltyService,
  ) {}

  /**
   * Record a payment against an invoice
   * Updates invoice.paidAmount and automatically transitions status
   *
   * Status transitions:
   * - UNPAID → PARTIAL (if paidAmount > 0 and < totalAmount)
   * - UNPAID/PARTIAL → PAID (if paidAmount == totalAmount)
   */
  async recordPayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    paymentMethod: string = 'CASH',
    _reference?: string, // Reserved for future use
  ) {
    // Step 1: Validate invoice exists and belongs to tenant
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Step 2: Check if invoice can accept payment
    if (invoice.status === InvoiceStatus.VOIDED) {
      throw new BadRequestException('Cannot accept payment on voided invoice');
    }

    // Step 3: Validate payment amount
    const balanceDue = invoice.totalAmount - invoice.paidAmount;
    if (amount > balanceDue) {
      throw new BadRequestException(
        `Cannot pay ₹${amount}. Balance due: ₹${balanceDue}`,
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Step 4: Calculate new status
    const newPaidAmount = invoice.paidAmount + amount;
    const newStatus =
      newPaidAmount === invoice.totalAmount
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

    // Step 5: Update invoice atomically
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Step 6: Award loyalty points if invoice is now PAID (idempotent)
    if (newStatus === InvoiceStatus.PAID && invoice.customerId) {
      try {
        await this.loyaltyService.awardLoyaltyPoints(tenantId, updatedInvoice);
      } catch (error) {
        // Log but don't fail payment if loyalty service fails
        this.logger.error(
          `Failed to award loyalty points for invoice ${invoiceId}`,
          error as Error,
        );
      }
    }

    // Step 7: Create Receipt entry (for accounting)
    const receipt = await this.prisma.receipt.create({
      data: {
        tenantId,
        shopId: invoice.shopId,
        linkedInvoiceId: invoiceId,
        customerId: invoice.customerId,
        receiptId: `RCP-${Date.now()}`,
        printNumber: `RCP-${Date.now()}`,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        amount,
        paymentMethod: paymentMethod as PaymentMode,
        receiptType: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    this.logger.log(
      `Payment recorded: Invoice ${invoice.invoiceNumber}, Amount ₹${amount}, ` +
        `Paid: ₹${newPaidAmount}/${invoice.totalAmount}, Status: ${newStatus}`,
    );

    return { invoice: updatedInvoice, receipt };
  }

  /**
   * Get detailed invoice payment status
   */
  async getInvoiceStatus(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const balanceDue = invoice.totalAmount - invoice.paidAmount;
    const daysOverdue = this.calculateDaysOverdue(invoice.createdAt);

    return {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue,
      status: invoice.status,
      daysOverdue,
      isOverdue: daysOverdue > 30, // Invoice overdue after 30 days
      paymentPercentage: Math.round(
        (invoice.paidAmount / invoice.totalAmount) * 100,
      ),
    };
  }

  /**
   * Prevent deletion of paid/partial invoices
   * Must create credit note instead
   *
   * This is a safety check to maintain audit trail
   */
  async validateBeforeDeletion(
    tenantId: string,
    invoiceId: string,
  ): Promise<boolean> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) return true; // Already deleted

    if (invoice.paidAmount > 0) {
      throw new BadRequestException(
        `Cannot delete invoice with payments (₹${invoice.paidAmount} collected). ` +
          `Create a credit note instead for audit trail.`,
      );
    }

    return true;
  }

  /**
   * Calculate days overdue from invoice creation date
   */
  private calculateDaysOverdue(createdAt: Date): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (createdAt < thirtyDaysAgo) {
      return Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    return 0;
  }

  /**
   * Get all pending invoices for a customer
   * Useful for customer statement view
   */
  async getPendingInvoicesForCustomer(
    tenantId: string,
    customerId: string,
    shopId?: string,
  ) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.UNPAID] },
        ...(shopId && { shopId }),
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paidAmount: true,
        invoiceDate: true,
        status: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });
  }
}
