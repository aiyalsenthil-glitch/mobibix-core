import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoyaltyTransactionType,
  LoyaltySource,
  LoyaltyConfig,
  Invoice,
  InvoiceType,
  Prisma,
} from '@prisma/client';

/**
 * LoyaltyService - GST-Safe Loyalty Points Management
 *
 * Key Principles:
 * 1. Points earned ONLY when invoice status = PAID (accrual accounting)
 * 2. Balance calculated from ledger (no direct field updates)
 * 3. GST-safe redemption (discount as line item, reduces taxable value)
 * 4. Automatic reversal on invoice cancellation
 * 5. Idempotency protection (no duplicate earning)
 * 6. Tenant-configurable rules
 *
 * @see docs/loyalty/LOYALTY_SYSTEM_SPEC.md
 */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get tenant's loyalty configuration
   * Creates default config if not exists
   */
  async getConfig(tenantId: string, shopId?: string) {
    let config = await this.prisma.loyaltyConfig.findFirst({
      where: { tenantId, shopId: shopId || null },
    });

    // Create default config if not exists
    if (!config) {
      config = await this.prisma.loyaltyConfig.create({
        data: {
          tenantId,
          shopId: shopId || null,
          isEnabled: false, // Disabled by default
          earnAmountPerPoint: 10000, // ₹100 = 1 point
          pointsPerEarnUnit: 1,
          pointValueInRupees: 1.0, // 1 point = ₹1
          maxRedeemPercent: 50, // Max 50% discount
          allowOnRepairs: true,
          allowOnAccessories: true,
          allowOnServices: false,
          allowManualAdjustment: false,
        },
      });
    }

    return config;
  }

  /**
   * Update loyalty configuration (Admin only)
   */
  async updateConfig(
    tenantId: string,
    shopId: string | undefined,
    data: Partial<LoyaltyConfig>,
  ) {
    const existing = await this.prisma.loyaltyConfig.findFirst({
      where: { tenantId, shopId: shopId || null },
    });

    if (existing) {
      return this.prisma.loyaltyConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      return this.prisma.loyaltyConfig.create({
        data: {
          tenantId,
          shopId: shopId || null,
          ...data,
        } as any,
      });
    }
  }

  /**
   * Get customer's loyalty balance (always calculated from ledger)
   */
  async getCustomerBalance(
    tenantId: string,
    customerId: string,
    shopId?: string,
    tx?: any,
  ): Promise<number> {
    const prisma = tx || this.prisma;
    this.logger.debug(
      `[LoyaltyService] Calculating balance - Tenant: ${tenantId}, Shop: ${shopId}, Customer: ${customerId}`,
    );

    if (!customerId) return 0;

    /**
     * 🛡️ CRITICAL FIX: Use raw SQL for absolute filtering reliability
     * Prisma aggregate/_sum can sometimes skip filters in complex multi-tenant environments
     * if parameters are intermittently null or 'undefined' string.
     */
    const result = await prisma.$queryRaw<Array<{ balance: number }>>`
      SELECT COALESCE(SUM(points), 0)::int as balance
      FROM public."mb_loyalty_transaction"
      WHERE "tenantId" = ${tenantId}
      AND "customerId" = ${customerId}
      ${shopId ? Prisma.sql`AND "shopId" = ${shopId}` : Prisma.empty}
    `;

    const balance = result[0]?.balance || 0;
    this.logger.debug(
      `[LoyaltyService] Calculated balance: ${balance} for customer ${customerId}`,
    );

    return balance;
  }

  /**
   * Get customer's loyalty transaction history
   */
  async getTransactionHistory(
    tenantId: string,
    customerId?: string,
    shopId?: string,
    limit = 50,
  ) {
    const where: any = { tenantId };
    if (customerId) {
      where.customerId = customerId;
    }
    if (shopId) {
      where.shopId = shopId;
    }

    return this.prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Calculate points earned for an invoice
   * GST-Safe: Uses subTotal (taxable amount), not totalAmount
   */
  async calculateEarnedPoints(
    tenantId: string,
    invoice: Pick<
      Invoice,
      'subTotal' | 'invoiceType' | 'customerId' | 'shopId'
    >,
  ): Promise<number> {
    // 1. Get config
    const config = await this.getConfig(tenantId, invoice.shopId || undefined);

    if (!config.isEnabled) {
      return 0;
    }

    // 2. Check minimum invoice amount
    if (
      config.minInvoiceForEarn &&
      invoice.subTotal < config.minInvoiceForEarn
    ) {
      return 0;
    }

    // 3. Check invoice type restrictions
    if (invoice.invoiceType === InvoiceType.REPAIR && !config.allowOnRepairs) {
      return 0;
    }

    // 4. Calculate points from subtotal (GST-safe: taxable amount only)
    const baseAmount = invoice.subTotal; // Already in paise
    const earnUnits = Math.floor(baseAmount / config.earnAmountPerPoint);
    const points = earnUnits * config.pointsPerEarnUnit;

    return points;
  }

  /**
   * Award loyalty points when invoice is marked PAID
   * CRITICAL: Only call this when invoice.status === 'PAID'
   * Implements idempotency protection
   */
  async awardLoyaltyPoints(
    tenantId: string,
    invoice: Invoice,
    tx?: any,
  ): Promise<void> {
    const prisma = tx || this.prisma;
    
    // Idempotency check: Already earned?
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: {
        tenantId,
        invoiceId: invoice.id,
        type: LoyaltyTransactionType.EARN,
      },
    });

    if (existing) {
      this.logger.warn(
        `Loyalty already earned for invoice ${invoice.id} (idempotent skip)`,
      );
      return;
    }

    // Calculate points
    const points = await this.calculateEarnedPoints(tenantId, invoice);

    if (points <= 0) {
      this.logger.debug(`No loyalty points earned for invoice ${invoice.id}`);
      return;
    }

    // Lock the customer row atomically
    await prisma.$executeRawUnsafe(
      `SELECT id FROM public."mb_party" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`,
      invoice.customerId!,
      tenantId
    );

    // Create transaction
    await prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        shopId: invoice.shopId || null,
        customerId: invoice.customerId!,
        points,
        type: LoyaltyTransactionType.EARN,
        source: LoyaltySource.INVOICE,
        invoiceId: invoice.id,
        note: `Earned ${points} points from invoice ${invoice.invoiceNumber} (₹${invoice.subTotal / 100})`,
      },
    });

    this.logger.log(
      `Awarded ${points} loyalty points to customer ${invoice.customerId} for invoice ${invoice.invoiceNumber}`,
    );
  }

  /**
   * Validate and calculate redemption details
   * Returns discount amount in paise
   */
  async validateRedemption(
    tenantId: string,
    customerId: string,
    requestedPoints: number,
    invoiceSubTotal: number, // In paise
    shopId?: string,
    tx?: any,
  ): Promise<{
    success: boolean;
    points: number;
    discountPaise: number;
    discountRupees: number;
    error?: string;
  }> {
    // 1. Get config
    const config = await this.getConfig(tenantId, shopId);

    if (!config.isEnabled) {
      return {
        success: false,
        points: 0,
        discountPaise: 0,
        discountRupees: 0,
        error: 'Loyalty program not enabled',
      };
    }

    // 2. Get current balance atomically
    const balance = await this.getCustomerBalance(tenantId, customerId, shopId, tx);

    if (balance < requestedPoints) {
      return {
        success: false,
        points: 0,
        discountPaise: 0,
        discountRupees: 0,
        error: `Insufficient points. Available: ${balance}, Requested: ${requestedPoints}`,
      };
    }

    // 3. Calculate discount
    const discountRupees = requestedPoints * config.pointValueInRupees;
    const discountPaise = Math.round(discountRupees * 100);

    // 4. Check max redemption percent
    const maxAllowedDiscount = Math.floor(
      (invoiceSubTotal * config.maxRedeemPercent) / 100,
    );
    if (discountPaise > maxAllowedDiscount) {
      const maxPoints = Math.floor(
        maxAllowedDiscount / 100 / config.pointValueInRupees,
      );
      return {
        success: false,
        points: 0,
        discountPaise: 0,
        discountRupees: 0,
        error: `Exceeds max redemption limit (${config.maxRedeemPercent}%). Max points: ${maxPoints}`,
      };
    }

    return {
      success: true,
      points: requestedPoints,
      discountPaise,
      discountRupees,
    };
  }

  /**
   * Redeem loyalty points for an invoice
   * Creates redemption transaction (negative points)
   * MUST be called BEFORE invoice is finalized
   */
  async redeemPoints(
    tenantId: string,
    customerId: string,
    points: number,
    invoiceId: string,
    invoiceNumber: string,
    shopId?: string,
    tx?: any,
  ): Promise<{ discountPaise: number }> {
    const prisma = tx || this.prisma;
    // Get config for conversion
    const config = await this.getConfig(tenantId, shopId);

    // Lock Customer Row securely
    await prisma.$executeRawUnsafe(
      `SELECT id FROM public."mb_party" WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`,
      customerId,
      tenantId
    );

    // Calculate discount
    const discountRupees = points * config.pointValueInRupees;
    const discountPaise = Math.round(discountRupees * 100);

    // Create redemption transaction (negative points)
    await prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        shopId: shopId || null,
        customerId,
        points: -points, // NEGATIVE
        type: LoyaltyTransactionType.REDEEM,
        source: LoyaltySource.REDEMPTION,
        invoiceId,
        note: `Redeemed ${points} points for ₹${discountRupees} discount on invoice ${invoiceNumber}`,
      },
    });

    this.logger.log(
      `Redeemed ${points} loyalty points (₹${discountRupees}) for invoice ${invoiceNumber}`,
    );

    return { discountPaise };
  }

  /**
   * Reverse all loyalty transactions for a cancelled/voided invoice
   * CRITICAL: Call this when invoice is voided/cancelled
   * Implements idempotency protection
   */
  async reversePointsOnCancel(
    tenantId: string,
    invoiceId: string,
    invoiceNumber: string,
  ): Promise<void> {
    // Find all transactions for this invoice
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: {
        tenantId,
        invoiceId,
        type: {
          in: [LoyaltyTransactionType.EARN, LoyaltyTransactionType.REDEEM],
        },
      },
    });

    if (transactions.length === 0) {
      this.logger.debug(
        `No loyalty transactions to reverse for invoice ${invoiceNumber}`,
      );
      return;
    }

    // Create reversals
    let reversalCount = 0;
    for (const txn of transactions) {
      // Check if already reversed (idempotency)
      const existingReversal = await this.prisma.loyaltyTransaction.findFirst({
        where: { reversalOf: txn.id },
      });

      if (existingReversal) {
        this.logger.warn(
          `Transaction ${txn.id} already reversed (idempotent skip)`,
        );
        continue;
      }

      // Create reversal with opposite sign
      await this.prisma.loyaltyTransaction.create({
        data: {
          tenantId: txn.tenantId,
          shopId: txn.shopId,
          customerId: txn.customerId,
          points: -txn.points, // Flip sign
          type: LoyaltyTransactionType.REVERSAL,
          source: txn.source,
          invoiceId,
          reversalOf: txn.id,
          note: `Reversal: Invoice ${invoiceNumber} cancelled`,
        },
      });

      reversalCount++;
    }

    this.logger.log(
      `Reversed ${reversalCount} loyalty transactions for invoice ${invoiceNumber}`,
    );
  }

  /**
   * Create manual adjustment (Admin only)
   * Requires allowManualAdjustment = true
   */
  async createManualAdjustment(
    tenantId: string,
    customerId: string,
    points: number,
    reason: string,
    userId: string,
    userName: string,
    shopId?: string,
  ): Promise<void> {
    // 1. Snapshot Before Points
    const beforePoints = await this.getCustomerBalance(
      tenantId,
      customerId,
      shopId,
    );

    // 2. Check config
    const config = await this.getConfig(tenantId, shopId);

    if (!config.allowManualAdjustment) {
      throw new ForbiddenException('Manual adjustments are disabled');
    }

    if (points === 0) {
      throw new BadRequestException('Points cannot be zero');
    }

    // 3. Atomic Transaction: Transaction Record + Hard Audit Snapshot
    await this.prisma.$transaction(async (tx) => {
      // Create Transaction ledger entry
      await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          shopId: shopId || null,
          customerId,
          points,
          type: LoyaltyTransactionType.MANUAL,
          source: LoyaltySource.MANUAL,
          createdBy: userId,
          note: `Manual adjustment by ${userName}: ${reason}`,
        },
      });

      // Create Snapshot Audit Entry
      // Note: Use 'as any' if Prisma types haven't refreshed in IDE
      await (tx as any).loyaltyAdjustment.create({
        data: {
          tenantId,
          partyId: customerId,
          beforePoints,
          afterPoints: beforePoints + points,
          delta: points,
          reason,
          adjustedBy: userId,
        },
      });
    });

    this.logger.warn(
      `Manual loyalty adjustment: ${points} points for customer ${customerId} (Before: ${beforePoints}, After: ${beforePoints + points}) by ${userName} (${reason})`,
    );
  }

  /**
   * Reverse points proportionally for partial refunds
   */
  async reversePointsProRata(
    tenantId: string,
    invoiceId: string,
    refundId: string,
    returnedAmount: number, // in paise
    originalSubtotal: number, // in paise
    tx?: any,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const earnTxn = await prisma.loyaltyTransaction.findFirst({
      where: { tenantId, invoiceId, type: LoyaltyTransactionType.EARN },
    });

    if (!earnTxn) return;

    // Idempotency: Check if this specific refund was already processed
    const existing = await prisma.loyaltyTransaction.findFirst({
      where: { tenantId, referenceId: refundId, type: LoyaltyTransactionType.REVERSAL },
    });

    if (existing) {
      this.logger.warn(`Pro-rata reversal already processed for refund ${refundId} (idempotent skip)`);
      return;
    }

    const reversalPoints = Math.floor((returnedAmount / originalSubtotal) * earnTxn.points);

    if (reversalPoints > 0) {
      await prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          shopId: earnTxn.shopId,
          customerId: earnTxn.customerId,
          points: -reversalPoints,
          type: LoyaltyTransactionType.REVERSAL,
          source: LoyaltySource.INVOICE,
          invoiceId,
          referenceId: refundId,
          reversalOf: earnTxn.id,
          note: `Pro-rata Reversal: ₹${returnedAmount / 100} returned out of ₹${originalSubtotal / 100}`,
        },
      });
      this.logger.log(`Reversed ${reversalPoints} points for refund ${refundId}`);
    }
  }

  /**
   * Idempotent Expiry Cron Method
   */
  async expireLoyaltyPoints(tenantId: string): Promise<number> {
    const config = await this.getConfig(tenantId);
    if (!config.isEnabled || !config.expiryDays) return 0;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - config.expiryDays);

    const expiringTxns = await this.prisma.$queryRaw<Array<{ id: string, customerId: string, shopId: string, points: number }>>`
      SELECT t.id, t."customerId", t."shopId", t.points 
      FROM public."mb_loyalty_transaction" t
      LEFT JOIN public."mb_loyalty_transaction" exp 
             ON exp."referenceId" = t.id AND exp.type = 'EXPIRE'
      WHERE t."tenantId" = ${tenantId}
        AND t.type = 'EARN'
        AND t."createdAt" < ${expiryDate}
        AND exp.id IS NULL
    `;

    let expiredCount = 0;
    for (const txn of expiringTxns) {
      await this.prisma.loyaltyTransaction.create({
        data: {
          tenantId,
          shopId: txn.shopId,
          customerId: txn.customerId,
          points: -txn.points,
          type: LoyaltyTransactionType.EXPIRE,
          source: LoyaltySource.SYSTEM,
          referenceId: txn.id,
          note: `Points expired after ${config.expiryDays} days`,
        }
      });
      expiredCount++;
    }

    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} loyalty transactions for tenant ${tenantId}`);
    }

    return expiredCount;
  }

  /**
   * Get total outstanding liability for the tenant
   */
  async getLoyaltyLiability(tenantId: string): Promise<{ totalPoints: number, liabilityRupees: number }> {
    const config = await this.getConfig(tenantId);
    
    const result = await this.prisma.$queryRaw<Array<{ balance: number }>>`
      SELECT COALESCE(SUM(points), 0)::int as balance
      FROM public."mb_loyalty_transaction"
      WHERE "tenantId" = ${tenantId}
    `;

    const totalPoints = result[0]?.balance || 0;
    const liabilityRupees = totalPoints * config.pointValueInRupees;

    return { totalPoints, liabilityRupees };
  }

  /**
   * Get loyalty statistics for a tenant
   */
  async getTenantStats(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ) {
    const [issued, redeemed, activeCustomers] = await Promise.all([
      // Points issued
      this.prisma.loyaltyTransaction.aggregate({
        where: {
          tenantId,
          ...(shopId ? { shopId } : {}),
          points: { gt: 0 },
          type: LoyaltyTransactionType.EARN,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { points: true },
      }),

      // Points redeemed
      this.prisma.loyaltyTransaction.aggregate({
        where: {
          tenantId,
          ...(shopId ? { shopId } : {}),
          points: { lt: 0 },
          type: LoyaltyTransactionType.REDEEM,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { points: true },
      }),

      // Active customers with points (current balance > 0)
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "customerId") as count
        FROM (
          SELECT "customerId", SUM("points") as balance
          FROM public."mb_loyalty_transaction"
          WHERE "tenantId" = ${tenantId}
          ${shopId ? Prisma.sql`AND "shopId" = ${shopId}` : Prisma.empty}
          GROUP BY "customerId"
          HAVING SUM("points") > 0
        ) as customers_with_balance
      `,
    ]);

    const totalPointsIssued = issued._sum?.points ?? 0;
    const totalPointsRedeemed = Math.abs(redeemed._sum?.points ?? 0);

    return {
      totalPointsIssued,
      totalPointsRedeemed,
      netPointsBalance: totalPointsIssued - totalPointsRedeemed,
      activeCustomersWithPoints: Number(activeCustomers[0].count),
    };
  }
}
