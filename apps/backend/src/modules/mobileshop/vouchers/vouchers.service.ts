import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaymentMode, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherEntity } from './entities/voucher.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}
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
      const purchase = await this.prisma.purchase.findUnique({
        where: { id: createVoucherDto.linkedPurchaseId },
      });
      if (!purchase) {
        throw new BadRequestException('Linked purchase does not exist');
      }
      if (purchase.tenantId !== tenantId || purchase.shopId !== shopId) {
        throw new BadRequestException(
          'Linked purchase does not belong to this tenant/shop',
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
      const voucher = await this.prisma.paymentVoucher.create({
        data: {
          id: uuidv4(),
          tenantId,
          shopId,
          voucherId: this.generateVoucherId(),
          voucherType: createVoucherDto.voucherType,
          date: new Date(),
          amount: createVoucherDto.amount,
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

      this.logger.log(
        `Voucher created: ${voucher.voucherId} (${createVoucherDto.voucherType}) (${createVoucherDto.paymentMethod}) ₹${voucher.amount}`,
      );

      return voucher;
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
  ): Promise<{ data: VoucherEntity[]; total: number }> {
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

    return {
      data: vouchers,
      total,
    };
  }

  /**
   * Get single voucher by ID
   */
  async getVoucher(
    tenantId: string,
    shopId: string,
    voucherId: string,
  ): Promise<VoucherEntity> {
    const voucher = await this.prisma.paymentVoucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    if (voucher.tenantId !== tenantId || voucher.shopId !== shopId) {
      throw new BadRequestException(
        'Voucher does not belong to this tenant/shop',
      );
    }

    return voucher;
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
    const voucher = await this.prisma.paymentVoucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new BadRequestException('Voucher not found');
    }

    if (voucher.tenantId !== tenantId || voucher.shopId !== shopId) {
      throw new BadRequestException(
        'Voucher does not belong to this tenant/shop',
      );
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
      return cancelled;
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
      totalAmount: vouchers.reduce((sum, v) => sum + v.amount, 0),
      byVoucherType,
      byPaymentMode,
    };
  }

  // ===== PRIVATE HELPERS =====

  private generateVoucherId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VCH-${timestamp}-${random}`;
  }
}
