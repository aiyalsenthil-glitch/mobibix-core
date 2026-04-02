import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateTradeInDto, UpdateTradeInStatusDto } from './dto/tradein.dto';
import { TradeInStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TradeInService {
  constructor(private prisma: PrismaService) {}

  private toPaisa(rupees: number) {
    return Math.round(rupees * 100);
  }

  private fromPaisa(paisa: number) {
    return paisa / 100;
  }

  private async getNextNumber(shopId: string): Promise<string> {
    const count = await this.prisma.tradeIn.count({ where: { shopId } });
    return `TRD-${String(count + 1).padStart(4, '0')}`;
  }

  private async getNextVoucherCode(tenantId: string): Promise<string> {
    const count = await this.prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*) AS cnt FROM mb_tradein_voucher WHERE "tenantId" = ${tenantId}
    `;
    const n = Number(count[0]?.cnt ?? 0) + 1;
    return `TCV-${String(n).padStart(4, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: CreateTradeInDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, tenantId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const tradeInNumber = await this.getNextNumber(dto.shopId);

    return this.prisma.tradeIn.create({
      data: {
        id: uuidv4(),
        tenantId,
        shopId: dto.shopId,
        tradeInNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deviceBrand: dto.deviceBrand,
        deviceModel: dto.deviceModel,
        deviceImei: dto.deviceImei,
        deviceStorage: dto.deviceStorage,
        deviceColor: dto.deviceColor,
        conditionChecks: dto.conditionChecks ?? {},
        conditionGrade: dto.conditionGrade,
        marketValue: this.toPaisa(dto.marketValue),
        offeredValue: this.toPaisa(dto.offeredValue),
        status: TradeInStatus.DRAFT,
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async list(
    tenantId: string,
    shopId: string,
    opts: { status?: TradeInStatus; page?: number; limit?: number; search?: string },
  ) {
    const take = opts.limit ?? 20;
    const skip = ((opts.page ?? 1) - 1) * take;
    const where: any = {
      tenantId,
      shopId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.search
        ? {
            OR: [
              { customerName: { contains: opts.search, mode: 'insensitive' } },
              { customerPhone: { contains: opts.search } },
              { deviceBrand: { contains: opts.search, mode: 'insensitive' } },
              { deviceModel: { contains: opts.search, mode: 'insensitive' } },
              { tradeInNumber: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.tradeIn.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          customer: { select: { name: true, phone: true } },
          creditVoucher: { select: { voucherCode: true, amount: true, status: true, expiresAt: true } },
        },
      }),
      this.prisma.tradeIn.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        ...t,
        marketValue: this.fromPaisa(t.marketValue),
        offeredValue: this.fromPaisa(t.offeredValue),
        creditVoucher: t.creditVoucher
          ? { ...t.creditVoucher, amount: this.fromPaisa(t.creditVoucher.amount) }
          : null,
      })),
      total,
      page: opts.page ?? 1,
      limit: take,
    };
  }

  async getOne(tenantId: string, id: string) {
    const tradeIn = await this.prisma.tradeIn.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        creditVoucher: true,
      },
    });
    if (!tradeIn) throw new NotFoundException('Trade-in not found');
    return {
      ...tradeIn,
      marketValue: this.fromPaisa(tradeIn.marketValue),
      offeredValue: this.fromPaisa(tradeIn.offeredValue),
      creditVoucher: tradeIn.creditVoucher
        ? {
            ...tradeIn.creditVoucher,
            amount: this.fromPaisa(tradeIn.creditVoucher.amount),
          }
        : null,
    };
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateTradeInStatusDto) {
    const tradeIn = await this.prisma.tradeIn.findFirst({
      where: { id, tenantId },
    });
    if (!tradeIn) throw new NotFoundException('Trade-in not found');

    return this.prisma.tradeIn.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.linkedInvoiceId ? { linkedInvoiceId: dto.linkedInvoiceId } : {}),
      },
    });
  }

  async updateOffer(tenantId: string, id: string, offeredValue: number) {
    const tradeIn = await this.prisma.tradeIn.findFirst({
      where: { id, tenantId },
    });
    if (!tradeIn) throw new NotFoundException('Trade-in not found');

    return this.prisma.tradeIn.update({
      where: { id },
      data: {
        offeredValue: this.toPaisa(offeredValue),
        status: TradeInStatus.OFFERED,
      },
    });
  }

  // ─── Post-Completion: Add to Inventory ─────────────────────────────────────

  async addToInventory(
    tenantId: string,
    tradeInId: string,
    userId: string,
    dto?: { salePrice?: number },
  ) {
    const tradeIn = await this.prisma.tradeIn.findFirst({
      where: { id: tradeInId, tenantId },
    });
    if (!tradeIn) throw new NotFoundException('Trade-in not found');

    const allowedStatuses: TradeInStatus[] = [TradeInStatus.ACCEPTED, TradeInStatus.COMPLETED];
    if (!allowedStatuses.includes(tradeIn.status)) {
      throw new BadRequestException('Trade-in must be ACCEPTED or COMPLETED to add to inventory');
    }

    if (tradeIn.inventoryProductId) {
      // Already added — return existing product info
      const existing = await this.prisma.shopProduct.findUnique({
        where: { id: tradeIn.inventoryProductId },
        select: { id: true, name: true, quantity: true, salePrice: true, costPrice: true },
      });
      return { alreadyAdded: true, product: existing ? { ...existing, salePrice: existing.salePrice ? this.fromPaisa(existing.salePrice) : null, costPrice: existing.costPrice ? this.fromPaisa(existing.costPrice) : null } : null };
    }

    const productName = [
      tradeIn.deviceBrand,
      tradeIn.deviceModel,
      tradeIn.deviceStorage,
      '(Used)',
    ]
      .filter(Boolean)
      .join(' ');

    const costPaisa = tradeIn.offeredValue; // what we paid
    const suggestedSalePrice = dto?.salePrice
      ? this.toPaisa(dto.salePrice)
      : Math.round(costPaisa * 1.3); // 30% markup

    // Check if a product with this name already exists in the shop (upsert pattern)
    const existing = await this.prisma.shopProduct.findFirst({
      where: {
        shopId: tradeIn.shopId,
        name: { equals: productName, mode: 'insensitive' },
      },
      select: { id: true, quantity: true },
    });

    let productId: string;

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        // Increment stock on existing product
        productId = existing.id;
        await tx.$executeRaw`
          UPDATE public."mb_shop_product"
          SET quantity = quantity + 1,
              "costPrice" = ${costPaisa},
              "avgCost" = ${costPaisa},
              "updatedAt" = NOW()
          WHERE id = ${existing.id}
        `;
      } else {
        // Create new product
        // gstRate: 0 because second-hand phone resale uses Margin Scheme (Rule 32(5) CGST Rules).
        // GST is payable only on margin (salePrice - costPrice), not full selling price.
        // The shop must NOT claim ITC on these goods.
        const created = await tx.shopProduct.create({
          data: {
            tenantId,
            shopId: tradeIn.shopId,
            name: productName,
            type: 'GOODS',
            category: 'Used Phones',
            isSerialized: !!tradeIn.deviceImei,
            costPrice: costPaisa,
            avgCost: costPaisa,
            salePrice: suggestedSalePrice,
            lastPurchasePrice: costPaisa,
            gstRate: 0, // Margin Scheme — GST on margin only, reported separately
            quantity: 0,
            isActive: true,
          },
        });
        productId = created.id;

        await tx.$executeRaw`
          UPDATE public."mb_shop_product" SET quantity = 1 WHERE id = ${productId}
        `;
      }

      // Stock ledger entry
      await tx.stockLedger.create({
        data: {
          tenantId,
          shopId: tradeIn.shopId,
          shopProductId: productId,
          type: 'IN',
          quantity: 1,
          referenceType: 'ADJUSTMENT',
          referenceId: tradeIn.id,
          costPerUnit: costPaisa,
          note: `Trade-in receipt: ${tradeIn.tradeInNumber} — ${productName}`,
        },
      });

      // If IMEI exists and product is serialized, register the IMEI
      if (tradeIn.deviceImei) {
        const imeiExists = await tx.iMEI.findFirst({
          where: { imei: tradeIn.deviceImei, tenantId },
          select: { id: true },
        });
        if (!imeiExists) {
          await tx.iMEI.create({
            data: {
              tenantId,
              shopProductId: productId,
              imei: tradeIn.deviceImei,
              status: 'IN_STOCK',
            },
          });
        }
      }

      // Mark trade-in as added to inventory
      const currentAction = tradeIn.postCompletionAction;
      const newAction =
        currentAction === 'VOUCHER_ISSUED' ? 'BOTH' : 'ADDED_TO_INVENTORY';

      await tx.tradeIn.update({
        where: { id: tradeInId },
        data: {
          inventoryProductId: productId,
          postCompletionAction: newAction,
          status: TradeInStatus.COMPLETED,
        },
      });
    });

    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId! },
      select: { id: true, name: true, quantity: true, salePrice: true, costPrice: true, category: true },
    });

    return {
      alreadyAdded: false,
      product: product
        ? {
            ...product,
            salePrice: product.salePrice ? this.fromPaisa(product.salePrice) : null,
            costPrice: product.costPrice ? this.fromPaisa(product.costPrice) : null,
          }
        : null,
    };
  }

  // ─── Post-Completion: Issue Credit Voucher ──────────────────────────────────

  async issueCreditVoucher(tenantId: string, tradeInId: string, userId: string) {
    const tradeIn = await this.prisma.tradeIn.findFirst({
      where: { id: tradeInId, tenantId },
    });
    if (!tradeIn) throw new NotFoundException('Trade-in not found');

    const allowedStatuses: TradeInStatus[] = [TradeInStatus.ACCEPTED, TradeInStatus.COMPLETED];
    if (!allowedStatuses.includes(tradeIn.status)) {
      throw new BadRequestException('Trade-in must be ACCEPTED or COMPLETED to issue a voucher');
    }

    // Check if a voucher already exists for this trade-in
    const existingVoucher = await this.prisma.tradeInVoucher.findUnique({
      where: { tradeInId },
    });
    if (existingVoucher) {
      return {
        alreadyIssued: true,
        voucher: { ...existingVoucher, amount: this.fromPaisa(existingVoucher.amount) },
      };
    }

    const voucherCode = await this.getNextVoucherCode(tenantId);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 months validity

    const voucher = await this.prisma.$transaction(async (tx) => {
      const v = await tx.tradeInVoucher.create({
        data: {
          tenantId,
          shopId: tradeIn.shopId,
          voucherCode,
          tradeInId,
          customerId: tradeIn.customerId,
          customerName: tradeIn.customerName,
          customerPhone: tradeIn.customerPhone,
          amount: tradeIn.offeredValue,
          status: 'ACTIVE',
          expiresAt,
          createdBy: userId,
        },
      });

      const currentAction = tradeIn.postCompletionAction;
      const newAction =
        currentAction === 'ADDED_TO_INVENTORY' ? 'BOTH' : 'VOUCHER_ISSUED';

      await tx.tradeIn.update({
        where: { id: tradeInId },
        data: {
          creditVoucherId: v.id,
          postCompletionAction: newAction,
          status: TradeInStatus.COMPLETED,
        },
      });

      return v;
    });

    return {
      alreadyIssued: false,
      voucher: { ...voucher, amount: this.fromPaisa(voucher.amount) },
    };
  }

  // ─── Post-Completion: Cash Payout to Customer ───────────────────────────────

  async completePayout(
    tenantId: string,
    tradeInId: string,
    payoutMode: 'CASH' | 'UPI' | 'BANK',
  ) {
    const tradeIn = await this.prisma.tradeIn.findFirst({
      where: { id: tradeInId, tenantId },
    });
    if (!tradeIn) throw new NotFoundException('Trade-in not found');

    const allowedStatuses: TradeInStatus[] = [TradeInStatus.ACCEPTED, TradeInStatus.OFFERED];
    if (!allowedStatuses.includes(tradeIn.status)) {
      throw new BadRequestException('Trade-in must be ACCEPTED or OFFERED to record a payout');
    }

    if (tradeIn.payoutMode) {
      return {
        alreadyPaid: true,
        payoutMode: tradeIn.payoutMode,
        payoutAt: tradeIn.payoutAt,
        amount: this.fromPaisa(tradeIn.offeredValue),
      };
    }

    const updated = await this.prisma.tradeIn.update({
      where: { id: tradeInId },
      data: {
        payoutMode,
        payoutAt: new Date(),
        status: TradeInStatus.COMPLETED,
        postCompletionAction: 'CASH_PAYOUT',
      },
    });

    return {
      alreadyPaid: false,
      payoutMode: updated.payoutMode,
      payoutAt: updated.payoutAt,
      amount: this.fromPaisa(tradeIn.offeredValue),
    };
  }

  // ─── Voucher: Lookup for Customer ───────────────────────────────────────────

  async getCustomerVouchers(
    tenantId: string,
    shopId: string,
    customerId?: string,
    phone?: string,
  ) {
    const now = new Date();
    const where: any = {
      tenantId,
      shopId,
      status: 'ACTIVE',
      expiresAt: { gt: now },
    };

    if (customerId) where.customerId = customerId;
    else if (phone) where.customerPhone = phone;

    const vouchers = await this.prisma.tradeInVoucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return vouchers.map((v) => ({
      ...v,
      amount: this.fromPaisa(v.amount),
    }));
  }

  // ─── Voucher: Validate a Code ────────────────────────────────────────────────

  async validateVoucher(tenantId: string, shopId: string, code: string) {
    // Normalize: TCV-1 / TCV-001 → TCV-0001
    const raw = code.toUpperCase().trim();
    const normalized = raw.replace(/^TCV-(\d+)$/, (_, n) => `TCV-${n.padStart(4, '0')}`);

    const voucher = await this.prisma.tradeInVoucher.findFirst({
      where: { voucherCode: normalized, tenantId, shopId },
    });

    if (!voucher) throw new NotFoundException('Voucher not found');

    if (voucher.status !== 'ACTIVE') {
      throw new BadRequestException(`Voucher is ${voucher.status.toLowerCase()}`);
    }

    if (voucher.expiresAt < new Date()) {
      // Auto-expire
      await this.prisma.tradeInVoucher.update({
        where: { id: voucher.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Voucher has expired');
    }

    return { ...voucher, amount: this.fromPaisa(voucher.amount) };
  }

  // ─── Voucher: Redeem ────────────────────────────────────────────────────────

  async redeemVoucher(tenantId: string, shopId: string, code: string, invoiceId: string) {
    const voucher = await this.validateVoucher(tenantId, shopId, code);

    if (voucher.status !== 'ACTIVE') {
      throw new ConflictException('Voucher is no longer active');
    }

    const redeemed = await this.prisma.tradeInVoucher.update({
      where: { id: voucher.id },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedByInvoiceId: invoiceId,
      },
    });

    return { ...redeemed, amount: this.fromPaisa(redeemed.amount) };
  }

  // ─── Price Intelligence ──────────────────────────────────────────────────────

  async getPriceIntel(
    _tenantId: string,
    brand: string,
    model: string,
    storage?: string,
  ) {
    // Primary: cross-tenant crowd data from all accepted/completed trade-ins
    const brandLike = `%${brand.toLowerCase()}%`;
    const modelLike = `%${model.toLowerCase()}%`;

    type CrowdRow = {
      avg_offer: bigint;
      min_offer: bigint;
      max_offer: bigint;
      avg_market: bigint;
      cnt: bigint;
      last_seen: Date;
    };

    let crowdRows: CrowdRow[];

    if (storage) {
      const storageLike = `%${storage.toLowerCase()}%`;
      crowdRows = await this.prisma.$queryRaw<CrowdRow[]>`
        SELECT
          AVG("offeredValue")::bigint  AS avg_offer,
          MIN("offeredValue")::bigint  AS min_offer,
          MAX("offeredValue")::bigint  AS max_offer,
          AVG("marketValue")::bigint   AS avg_market,
          COUNT(*)::bigint             AS cnt,
          MAX("createdAt")             AS last_seen
        FROM mb_trade_in
        WHERE LOWER("deviceBrand") LIKE ${brandLike}
          AND LOWER("deviceModel") LIKE ${modelLike}
          AND LOWER("deviceStorage") LIKE ${storageLike}
          AND status IN ('ACCEPTED', 'COMPLETED')
      `;
    } else {
      crowdRows = await this.prisma.$queryRaw<CrowdRow[]>`
        SELECT
          AVG("offeredValue")::bigint  AS avg_offer,
          MIN("offeredValue")::bigint  AS min_offer,
          MAX("offeredValue")::bigint  AS max_offer,
          AVG("marketValue")::bigint   AS avg_market,
          COUNT(*)::bigint             AS cnt,
          MAX("createdAt")             AS last_seen
        FROM mb_trade_in
        WHERE LOWER("deviceBrand") LIKE ${brandLike}
          AND LOWER("deviceModel") LIKE ${modelLike}
          AND status IN ('ACCEPTED', 'COMPLETED')
      `;
    }

    const crowdRow = crowdRows[0];
    const crowdCount = Number(crowdRow?.cnt ?? 0);

    // Use crowd data if we have at least 3 data points
    if (crowdCount >= 3) {
      return {
        avgOffer: Number(crowdRow.avg_offer) / 100,
        minOffer: Number(crowdRow.min_offer) / 100,
        maxOffer: Number(crowdRow.max_offer) / 100,
        avgMarketValue: Number(crowdRow.avg_market) / 100,
        count: crowdCount,
        lastSeenDate: crowdRow.last_seen,
        dataSource: 'CROWD' as const,
      };
    }

    // Fallback: Cashify baseline from mb_market_price_intel
    const brandExact = brand.toLowerCase();
    const modelExact = model.toLowerCase();

    type BaselineRow = {
      avg_market: number;
      min_market: number;
      max_market: number;
      avg_offer: number;
      sample_count: number;
      last_updated: Date;
    };

    let baselineRows: BaselineRow[];

    if (storage) {
      const storageExact = storage.toLowerCase();
      baselineRows = await this.prisma.$queryRaw<BaselineRow[]>`
        SELECT
          "avgMarketValue" AS avg_market,
          COALESCE("minMarketValue", "avgMarketValue") AS min_market,
          COALESCE("maxMarketValue", "avgMarketValue") AS max_market,
          COALESCE("avgOffer", 0)   AS avg_offer,
          "sampleCount"             AS sample_count,
          "lastUpdated"             AS last_updated
        FROM mb_market_price_intel
        WHERE LOWER(brand) = ${brandExact}
          AND LOWER(model) = ${modelExact}
          AND LOWER(storage) = ${storageExact}
        LIMIT 1
      `;
    } else {
      baselineRows = await this.prisma.$queryRaw<BaselineRow[]>`
        SELECT
          "avgMarketValue" AS avg_market,
          COALESCE("minMarketValue", "avgMarketValue") AS min_market,
          COALESCE("maxMarketValue", "avgMarketValue") AS max_market,
          COALESCE("avgOffer", 0)   AS avg_offer,
          "sampleCount"             AS sample_count,
          "lastUpdated"             AS last_updated
        FROM mb_market_price_intel
        WHERE LOWER(brand) = ${brandExact}
          AND LOWER(model) = ${modelExact}
        ORDER BY "avgMarketValue" ASC
        LIMIT 1
      `;
    }

    if (!baselineRows?.length) {
      if (crowdCount > 0) {
        return {
          avgOffer: Number(crowdRow.avg_offer) / 100,
          minOffer: Number(crowdRow.min_offer) / 100,
          maxOffer: Number(crowdRow.max_offer) / 100,
          avgMarketValue: Number(crowdRow.avg_market) / 100,
          count: crowdCount,
          lastSeenDate: crowdRow.last_seen,
          dataSource: 'CROWD' as const,
        };
      }
      return {
        avgOffer: null,
        minOffer: null,
        maxOffer: null,
        avgMarketValue: null,
        count: 0,
        lastSeenDate: null,
        dataSource: null,
      };
    }

    // Apply 5% yearly depreciation from the baseline date, floor at ₹1,000 (100,000 paisa)
    const b = baselineRows[0];
    const FLOOR_PAISA = 100_000;
    const yearsElapsed =
      (Date.now() - new Date(b.last_updated).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    const deprecFactor = Math.pow(0.95, yearsElapsed);
    const dep = (paisa: number) =>
      Math.max(Math.round(Number(paisa) * deprecFactor), FLOOR_PAISA);

    return {
      avgOffer: dep(b.avg_offer) / 100,
      minOffer: dep(b.min_market) / 100,
      maxOffer: dep(b.max_market) / 100,
      avgMarketValue: dep(b.avg_market) / 100,
      count: crowdCount + Number(b.sample_count),
      lastSeenDate: b.last_updated,
      dataSource: 'CASHIFY' as const,
    };
  }
}
