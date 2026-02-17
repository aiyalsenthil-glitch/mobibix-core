import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentMode, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherEntity } from './entities/voucher.entity';
import { v4 as uuidv4 } from 'uuid';
import { DocumentNumberService } from '../../../common/services/document-number.service';
import { DocumentType } from '@prisma/client';

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumberService: DocumentNumberService,
  ) {}
  private readonly logger = new Logger('VouchersService');

  /**
   * Create a voucher for money paid out
   * CRITICAL: Only PAID amounts create vouchers (NO CREDIT)
   */
  async createVoucher(
    tenantId: string,
    shopId: string,
    createVoucherDto: CreateVoucherDto,
    userId: string,
  ): Promise<VoucherEntity> {
    // ✅ STRICT VALIDATION: REJECT CREDIT
    if (createVoucherDto.paymentMethod === PaymentMode.CREDIT) {
      this.logger.warn(
        `REJECTED: Attempted to create voucher with CREDIT payment mode for tenant=${tenantId}, shop=${shopId}`,
      );
      throw new BadRequestException(
        'CREDIT payments do NOT create vouchers. Record voucher only when cash/UPI/card/bank payment is made.',
      );
    }

    // ✅ VALIDATION: Amount must be positive
    if (createVoucherDto.amount <= 0) {
      throw new BadRequestException('Voucher amount must be positive');
    }

    // ✅ VALIDATION: If linkedPurchaseId provided, verify it exists
    if (createVoucherDto.linkedPurchaseId) {
      const purchase = await this.prisma.purchase.findFirst({
        where: { id: createVoucherDto.linkedPurchaseId, tenantId },
      });
      if (!purchase) {
        throw new BadRequestException('Linked purchase does not exist');
      }
      if (purchase.shopId !== shopId) {
        throw new BadRequestException(
          'Linked purchase does not belong to this shop',
        );
      }
    }

    // ✅ VALIDATION: Supplier validation for SUPPLIER type vouchers
    if (
      createVoucherDto.voucherType === 'SUPPLIER' &&
      !createVoucherDto.globalSupplierId
    ) {
      throw new BadRequestException(
        'SUPPLIER vouchers require a supplier to be specified',
      );
    }

    // ✅ TRANSACTION: Create voucher atomically
    try {
      // Use DocumentNumberService for sequential ID
      const nextVoucherId =
        await this.documentNumberService.generateDocumentNumber(
          shopId,
          DocumentType.PAYMENT_VOUCHER,
          new Date(),
        );

      const voucher = await this.prisma.paymentVoucher.create({
        data: {
          id: uuidv4(),
          tenantId,
          shopId,
          voucherId: nextVoucherId,
          voucherType: createVoucherDto.voucherType,
          date: new Date(),
          amount: this.toPaisa(createVoucherDto.amount),
          paymentMethod: createVoucherDto.paymentMethod,
          transactionRef: createVoucherDto.transactionRef,
          narration: createVoucherDto.narration,
          globalSupplierId: createVoucherDto.globalSupplierId || null,
          expenseCategory: createVoucherDto.expenseCategory || null,
          linkedPurchaseId: createVoucherDto.linkedPurchaseId || null,
          status: VoucherStatus.ACTIVE,
          createdBy: userId,
        },
      });

      // Convert back to Rupees for response
      const response = {
        ...voucher,
        amount: this.fromPaisa(voucher.amount),
      };

      this.logger.log(
        `Voucher created: ${voucher.voucherId} (${createVoucherDto.voucherType}) (${createVoucherDto.paymentMethod}) ₹${response.amount}`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to create voucher for tenant=${tenantId}, shop=${shopId}`,
        error as Error,
      );
      throw new BadRequestException(
        'Failed to create voucher. Please verify your inputs.',
      );
    }
  }

  /**
   * Get all vouchers for a shop (paginated, filtered by date range)
   */
  async getVouchers(
    tenantId: string,
    shopId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      paymentMethod?: PaymentMode;
      status?: VoucherStatus;
      voucherType?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: VoucherEntity[]; total: number; pagination: any }> {
    const skip = filters?.skip || 0;
    const take = filters?.take || 50;

    const where: any = {
      tenantId,
      shopId,
    };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.voucherType) {
      where.voucherType = filters.voucherType;
    }

    const [vouchers, total] = await Promise.all([
      this.prisma.paymentVoucher.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.paymentVoucher.count({ where }),
    ]);

    // Return standardized paginated format
    const page = Math.floor(skip / take) + 1;
    return {
      data: vouchers.map((v) => ({ ...v, amount: this.fromPaisa(v.amount) })),
      total,
      pagination: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
        hasNext: page < Math.ceil(total / take),
        hasPrevious: page > 1,
        offset: skip,
      },
    };
  }

  /**
   * Get single voucher by ID
   */
  async getVoucher(
    tenantId: string,
    shopId: string,
    idOrVoucherId: string,
  ): Promise<VoucherEntity> {
    const voucher = await this.prisma.paymentVoucher.findFirst({
      where: {
        OR: [{ id: idOrVoucherId }, { voucherId: idOrVoucherId }],
        tenantId,
        shopId,
      },
    });

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    return { ...voucher, amount: this.fromPaisa(voucher.amount) };
  }

  /**
   * Cancel a voucher (soft delete - status = CANCELLED)
   * NEVER hard delete - maintain audit trail
   */
  async cancelVoucher(
    tenantId: string,
    shopId: string,
    voucherId: string,
    reason: string,
  ): Promise<VoucherEntity> {
    const voucher = await this.prisma.paymentVoucher.findFirst({
      where: { id: voucherId, tenantId },
    });

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    if (voucher.shopId !== shopId) {
      throw new BadRequestException('Voucher does not belong to this shop');
    }

    if (voucher.status === VoucherStatus.CANCELLED) {
      throw new BadRequestException('Voucher is already cancelled');
    }

    try {
      const cancelled = await this.prisma.paymentVoucher.update({
        where: { id: voucherId },
        data: {
          status: VoucherStatus.CANCELLED,
          narration: `${voucher.narration || ''} [CANCELLED: ${reason}]`.trim(),
        },
      });

      this.logger.log(
        `Voucher cancelled: ${voucher.voucherId} - Reason: ${reason}`,
      );
      return { ...cancelled, amount: this.fromPaisa(cancelled.amount) };
    } catch (error) {
      this.logger.error(
        `Failed to cancel voucher ${voucherId}`,
        error as Error,
      );
      throw new BadRequestException('Failed to cancel voucher');
    }
  }

  /**
   * Get voucher summary for audit/reporting
   */
  async getVoucherSummary(
    tenantId: string,
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalVouchers: number;
    totalAmount: number;
    byVoucherType: Record<string, { count: number; amount: number }>;
    byPaymentMode: Record<string, { count: number; amount: number }>;
  }> {
    const vouchers = await this.prisma.paymentVoucher.findMany({
      where: {
        tenantId,
        shopId,
        status: VoucherStatus.ACTIVE,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const byVoucherType: Record<string, { count: number; amount: number }> = {};
    const byPaymentMode: Record<string, { count: number; amount: number }> = {};

    vouchers.forEach((v) => {
      // By voucher type
      if (!byVoucherType[v.voucherType]) {
        byVoucherType[v.voucherType] = { count: 0, amount: 0 };
      }
      byVoucherType[v.voucherType].count += 1;
      byVoucherType[v.voucherType].amount += v.amount;

      // By payment mode
      if (!byPaymentMode[v.paymentMethod]) {
        byPaymentMode[v.paymentMethod] = { count: 0, amount: 0 };
      }
      byPaymentMode[v.paymentMethod].count += 1;
      byPaymentMode[v.paymentMethod].amount += v.amount;
    });

    return {
      totalVouchers: vouchers.length,
      totalAmount: this.fromPaisa(
        vouchers.reduce((sum, v) => sum + v.amount, 0),
      ),
      byVoucherType: Object.fromEntries(
        Object.entries(byVoucherType).map(([type, data]) => [
          type,
          { ...data, amount: this.fromPaisa(data.amount) },
        ]),
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
   * Create voucher with atomic Purchase.outstanding update (Tier-2 hardening)
   */
  async createVoucherWithPurchaseUpdate(
    tenantId: string,
    shopId: string,
    createVoucherDto: CreateVoucherDto,
    userId: string,
  ): Promise<VoucherEntity> {
    // First, create the voucher (existing logic)
    const voucher = await this.createVoucher(
      tenantId,
      shopId,
      createVoucherDto,
      userId,
    );

    // If linked to purchase, update purchase outstanding atomically
    if (createVoucherDto.linkedPurchaseId) {
      await this.updatePurchaseOutstandingStatus(
        tenantId,
        createVoucherDto.linkedPurchaseId,
        this.toPaisa(createVoucherDto.amount),
        createVoucherDto.voucherSubType || 'SETTLEMENT',
      );
    }

    return voucher;
  }

  /**
   * Update purchase outstanding amount (over-payment prevention)
   */
  private async updatePurchaseOutstandingStatus(
    tenantId: string,
    purchaseId: string,
    voucherAmount: number,
    voucherSubType: 'ADVANCE' | 'SETTLEMENT',
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Get current purchase
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
      });

      if (!purchase || purchase.tenantId !== tenantId) {
        throw new BadRequestException('Purchase not found');
      }
      if (voucherSubType !== 'SETTLEMENT') {
        this.logger.debug(
          `Purchase ${purchase.invoiceNumber}: ADVANCE voucher (not reducing outstanding)`,
        );
        return;
      }

      // Over-payment prevention: voucher <= (subTotal - paidAmount)
      const outstanding = purchase.subTotal - purchase.paidAmount;
      if (voucherAmount > outstanding) {
        throw new BadRequestException(
          `Over-payment prevented: voucher (${this.fromPaisa(voucherAmount)}) exceeds outstanding. Balance: ${this.fromPaisa(outstanding)}`,
        );
      }

      // Update purchase paidAmount
      const newPaidAmount = purchase.paidAmount + voucherAmount;
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
        },
      });

      this.logger.debug(
        `Purchase ${purchase.invoiceNumber}: paidAmount increased by ${this.fromPaisa(voucherAmount)}, new paid: ${this.fromPaisa(newPaidAmount)}/${this.fromPaisa(purchase.subTotal)}`,
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

  private generateVoucherId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VCH-${timestamp}-${random}`;
  }
}
