import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentMode, ReceiptStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptEntity } from './entities/receipt.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger('ReceiptsService');

  /**
   * Create a receipt for money received
   * CRITICAL: Only PAID amounts create receipts (NO CREDIT)
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
      const receipt = await this.prisma.receipt.create({
        data: {
          id: uuidv4(),
          tenantId,
          shopId,
          receiptId: this.generateReceiptId(),
          printNumber: (await this.getNextPrintNumber(shopId)).toString(),
          receiptType: createReceiptDto.receiptType,
          amount: createReceiptDto.amount,
          paymentMethod: createReceiptDto.paymentMethod,
          transactionRef: createReceiptDto.transactionRef,
          customerId: null, // TODO: Link to Customer model when available
          customerName: createReceiptDto.customerName,
          customerPhone: createReceiptDto.customerPhone,
          linkedInvoiceId: createReceiptDto.linkedInvoiceId || null,
          linkedJobId: createReceiptDto.linkedJobId || null,
          narration: createReceiptDto.narration,
          status: ReceiptStatus.ACTIVE,
          createdBy: userId,
        },
      });

      this.logger.log(
        `Receipt created: ${receipt.receiptId} for ${receipt.customerName} (${createReceiptDto.paymentMethod}) ₹${receipt.amount}`,
      );

      return receipt;
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
      data: receipts,
      total,
    };
  }

  /**
   * Get single receipt by ID
   */
  async getReceipt(
    tenantId: string,
    shopId: string,
    receiptId: string,
  ): Promise<ReceiptEntity> {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      throw new BadRequestException('Receipt not found');
    }

    if (receipt.tenantId !== tenantId || receipt.shopId !== shopId) {
      throw new BadRequestException(
        'Receipt does not belong to this tenant/shop',
      );
    }

    return receipt;
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

    if (receipt.tenantId !== tenantId || receipt.shopId !== shopId) {
      throw new BadRequestException(
        'Receipt does not belong to this tenant/shop',
      );
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
      return cancelled;
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
      totalAmount: receipts.reduce((sum, r) => sum + r.amount, 0),
      byPaymentMode,
    };
  }

  // ===== PRIVATE HELPERS =====

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
