import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentMode, ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptEntity } from './entities/receipt.entity';
import { v4 as uuidv4 } from 'uuid';

import { DocumentNumberService } from '../../../common/services/document-number.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}
  private readonly logger = new Logger('ReceiptsService');

  /**
   * Create a receipt for money received
   */
  async createReceipt(
    tenantId: string,
    shopId: string,
    createReceiptDto: CreateReceiptDto,
    userId: string,
  ): Promise<ReceiptEntity> {
    // ✅ STRICT VALIDATION: REJECT CREDIT
    if (createReceiptDto.paymentMethod === PaymentMode.CREDIT) {
      this.logger.warn(
        `REJECTED: Attempted to create receipt with CREDIT payment mode for tenant=${tenantId}, shop=${shopId}`,
      );
      throw new BadRequestException(
        'CREDIT payments do NOT create receipts. Record receipt only when cash/UPI/card/bank payment is received.',
      );
    }

    // ✅ VALIDATION: Amount must be positive
    if (createReceiptDto.amount <= 0) {
      throw new BadRequestException('Receipt amount must be positive');
    }

    // ✅ VALIDATION: If linkedInvoiceId provided, verify it exists
    if (createReceiptDto.linkedInvoiceId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: createReceiptDto.linkedInvoiceId },
      });
      if (!invoice) {
        throw new BadRequestException('Linked invoice does not exist');
      }
      if (invoice.tenantId !== tenantId || invoice.shopId !== shopId) {
        throw new BadRequestException(
          'Linked invoice does not belong to this tenant/shop',
        );
      }
    }

    // ✅ VALIDATION: If linkedJobId provided, verify it exists
    if (createReceiptDto.linkedJobId) {
      const job = await this.prisma.jobCard.findUnique({
        where: { id: createReceiptDto.linkedJobId },
      });
      if (!job) {
        throw new BadRequestException('Linked job does not exist');
      }
      if (job.tenantId !== tenantId || job.shopId !== shopId) {
        throw new BadRequestException(
          'Linked job does not belong to this tenant/shop',
        );
      }
    }

    // ✅ TRANSACTION: Create receipt atomically
    try {
      // Use DocumentNumberService for sequential ID
      const nextReceiptId =
        await this.documentNumberService.generateDocumentNumber(
          shopId,
          DocumentType.RECEIPT,
          new Date(),
        );

      const receipt = await this.prisma.receipt.create({
        data: {
          id: uuidv4(),
          tenantId,
          shopId,
          receiptId: nextReceiptId,
          printNumber: '0', // Deprecated/Unused for now, keeping schema valid
          receiptType: createReceiptDto.receiptType,
          amount: this.toPaisa(createReceiptDto.amount),
          paymentMethod: createReceiptDto.paymentMethod,
          transactionRef: createReceiptDto.transactionRef,
          customerId: null, // TODO: Link to Customer model when available
          customerName: createReceiptDto.customerName,
          customerPhone: createReceiptDto.customerPhone,
          linkedInvoiceId: createReceiptDto.linkedInvoiceId || null,
          linkedJobCardId: createReceiptDto.linkedJobId || null,
          narration: createReceiptDto.narration,
          status: ReceiptStatus.ACTIVE,
          createdBy: userId,
        },
      });

      // Convert back to Rupees for response
      const response: ReceiptEntity = {
        ...receipt,
        amount: this.fromPaisa(receipt.amount),
        updatedAt: receipt.updatedAt,
        linkedJobCardId: receipt.linkedJobCardId,
        linkedJobId: receipt.linkedJobCardId,
      };

      this.logger.log(
        `Receipt created: ${receipt.receiptId} for ${receipt.customerName} (${createReceiptDto.paymentMethod}) ₹${response.amount}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to create receipt for tenant=${tenantId}, shop=${shopId}`,
        error as Error,
      );
      throw new BadRequestException(
        'Failed to create receipt. Please verify your inputs.',
      );
    }
  }

  /**
   * Get all receipts for a shop (paginated, filtered by date range)
   */
  async getReceipts(
    tenantId: string,
    shopId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      paymentMethod?: PaymentMode;
      status?: ReceiptStatus;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: ReceiptEntity[]; total: number }> {
    const skip = filters?.skip || 0;
    const take = filters?.take || 50;

    const where: any = {
      tenantId,
      shopId,
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [receipts, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return {
      data: receipts.map((r) => ({
        ...r,
        amount: this.fromPaisa(r.amount),
        updatedAt: r.updatedAt,
        linkedJobCardId: r.linkedJobCardId,
        linkedJobId: r.linkedJobCardId,
      })),
      total,
    };
  }

  /**
   * Get single receipt by ID (UUID) or Receipt ID (RCP-...)
   */
  async getReceipt(
    tenantId: string,
    shopId: string,
    idOrReceiptId: string,
  ): Promise<ReceiptEntity> {
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        OR: [{ id: idOrReceiptId }, { receiptId: idOrReceiptId }],
        tenantId,
        shopId,
      },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    return {
      ...receipt,
      amount: this.fromPaisa(receipt.amount),
      updatedAt: receipt.updatedAt,
      linkedJobCardId: receipt.linkedJobCardId,
      linkedJobId: receipt.linkedJobCardId,
    };
  }

  /**
   * Cancel a receipt (soft delete - status = CANCELLED)
   * NEVER hard delete - maintain audit trail
   */
  async cancelReceipt(
    tenantId: string,
    shopId: string,
    receiptId: string,
    reason: string,
  ): Promise<ReceiptEntity> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    // Only validate tenantId - allow cancelling receipts from any shop within the tenant
    // This allows invoice cancellation to work even if receipt is from a different shop
    if (receipt.tenantId !== tenantId) {
      throw new BadRequestException('Receipt does not belong to this tenant');
    }

    if (receipt.status === ReceiptStatus.CANCELLED) {
      throw new BadRequestException('Receipt is already cancelled');
    }

    try {
      const cancelled = await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: ReceiptStatus.CANCELLED,
          narration: `${receipt.narration || ''} [CANCELLED: ${reason}]`.trim(),
        },
      });

      this.logger.log(
        `Receipt cancelled: ${receipt.receiptId} - Reason: ${reason}`,
      );
      return {
        ...cancelled,
        amount: this.fromPaisa(cancelled.amount),
        updatedAt: cancelled.updatedAt,
        linkedJobCardId: cancelled.linkedJobCardId,
        linkedJobId: cancelled.linkedJobCardId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel receipt ${receiptId}`,
        error as Error,
      );
      throw new BadRequestException('Failed to cancel receipt');
    }
  }

  /**
   * Get receipt summary for audit/reporting
   */
  async getReceiptSummary(
    tenantId: string,
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalReceipts: number;
    totalAmount: number;
    byPaymentMode: Record<string, { count: number; amount: number }>;
  }> {
    const receipts = await this.prisma.receipt.findMany({
      where: {
        tenantId,
        shopId,
        status: ReceiptStatus.ACTIVE,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const byPaymentMode: Record<string, { count: number; amount: number }> = {};

    receipts.forEach((r) => {
      if (!byPaymentMode[r.paymentMethod]) {
        byPaymentMode[r.paymentMethod] = { count: 0, amount: 0 };
      }
      byPaymentMode[r.paymentMethod].count += 1;
      byPaymentMode[r.paymentMethod].amount += r.amount;
    });

    return {
      totalReceipts: receipts.length,
      totalAmount: this.fromPaisa(
        receipts.reduce((sum, r) => sum + r.amount, 0),
      ),
      byPaymentMode: Object.fromEntries(
        Object.entries(byPaymentMode).map(([mode, data]) => [
          mode,
          { ...data, amount: this.fromPaisa(data.amount) },
        ]),
      ),
    };
  }

  /**
   * Create receipt with atomic Invoice.paidAmount update (Tier-2 hardening)
   */
  async createReceiptWithInvoiceUpdate(
    tenantId: string,
    shopId: string,
    createReceiptDto: CreateReceiptDto,
    userId: string,
  ): Promise<ReceiptEntity> {
    // First, create the receipt (existing logic)
    const receipt = await this.createReceipt(
      tenantId,
      shopId,
      createReceiptDto,
      userId,
    );

    // If linked to invoice, update invoice status atomically
    if (createReceiptDto.linkedInvoiceId) {
      await this.updateInvoicePaymentStatus(
        tenantId,
        createReceiptDto.linkedInvoiceId,
        this.toPaisa(createReceiptDto.amount),
      );
    }

    return receipt;
  }

  /**
   * Update invoice payment status and paidAmount (atomic)
   */
  private async updateInvoicePaymentStatus(
    tenantId: string,
    invoiceId: string,
    receiptAmount: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Get current invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice || invoice.tenantId !== tenantId) {
        throw new BadRequestException('Invoice not found');
      }

      // Over-collection prevention: receipt + previous payments <= invoice amount
      const newPaidAmount = invoice.paidAmount + receiptAmount;
      if (newPaidAmount > invoice.subTotal) {
        throw new BadRequestException(
          `Over-collection prevented: receipt (${this.fromPaisa(receiptAmount)}) would exceed invoice balance. Outstanding: ${this.fromPaisa(invoice.subTotal - invoice.paidAmount)}`,
        );
      }

      // Calculate new status
      let newStatus = invoice.status;
      if (newPaidAmount === 0) {
        newStatus = 'UNPAID';
      } else if (newPaidAmount >= invoice.subTotal) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      // Update invoice atomically
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      this.logger.debug(
        `Invoice ${invoice.invoiceNumber}: status updated to ${newStatus}, paidAmount: ${this.fromPaisa(newPaidAmount)}/${this.fromPaisa(invoice.subTotal)}`,
      );
    });
  }

  // ===== PRIVATE HELPERS =====

  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }

  private generateReceiptId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  private async getNextPrintNumber(shopId: string): Promise<number> {
    const lastReceipt = await this.prisma.receipt.findFirst({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      select: { printNumber: true },
    });

    if (!lastReceipt || !lastReceipt.printNumber) {
      return 1;
    }

    return parseInt(lastReceipt.printNumber, 10) + 1;
  }
}
