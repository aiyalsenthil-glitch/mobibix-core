import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  InvoiceStatus,
  PurchaseStatus,
  VoucherType,
  PaymentMode,
  VoucherStatus,
  ReceiptType,
  ReceiptStatus,
  Prisma,
  ProductType,
} from '@prisma/client';

@Injectable()
export class MobileShopReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1️⃣ DASHBOARD - OWNER OVERVIEW
   */
  async getOwnerDashboard(tenantId: string, shopId?: string) {
    const whereShop = shopId ? { shopId } : {};

    // 1. Total Sales (Paid) - From Receipts
    const paidSales = await this.prisma.receipt.aggregate({
      where: {
        tenantId,
        ...whereShop,
        receiptType: ReceiptType.CUSTOMER,
        status: ReceiptStatus.ACTIVE,
      },
      _sum: { amount: true },
    });

    // 2. Total Invoiced Amount (For Credit Calculation)
    const totalInvoiced = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        ...whereShop,
        status: { not: InvoiceStatus.VOIDED },
      },
      _sum: { totalAmount: true },
    });

    // Sales (Credit) = Claims - Collected
    const totalSalesPaid = paidSales._sum.amount || 0;
    const totalSalesInvoiced = totalInvoiced._sum.totalAmount || 0;
    const totalSalesCredit = Math.max(0, totalSalesInvoiced - totalSalesPaid);

    // 3. Total Purchases
    const totalPurchases = await this.prisma.purchase.aggregate({
      where: {
        tenantId,
        ...whereShop,
        status: { not: PurchaseStatus.CANCELLED },
      },
      _sum: { grandTotal: true, paidAmount: true },
    });

    // 4. Total Expenses (Vouchers)
    const totalExpenses = await this.prisma.paymentVoucher.aggregate({
      where: {
        tenantId,
        ...whereShop,
        voucherType: VoucherType.EXPENSE,
        status: VoucherStatus.ACTIVE,
      },
      _sum: { amount: true },
    });

    // 5. Net Cash Flow (FinancialEntry)
    const cashIn = await this.prisma.financialEntry.aggregate({
      where: { tenantId, ...whereShop, type: 'IN' },
      _sum: { amount: true },
    });
    const cashOut = await this.prisma.financialEntry.aggregate({
      where: { tenantId, ...whereShop, type: 'OUT' },
      _sum: { amount: true },
    });

    // 6. Pending Payables (Purchase)
    // TODO: Switch to Vouchers-based calculation if payments bypass Purchase.paidAmount logic later.
    const purchaseTotal = totalPurchases._sum.grandTotal || 0;
    const purchasePaid = totalPurchases._sum.paidAmount || 0;
    const pendingPayables = Math.max(0, purchaseTotal - purchasePaid);

    return {
      metrics: {
        salesPaid: totalSalesPaid / 100,
        salesCredit: totalSalesCredit / 100,
        totalPurchases: purchaseTotal / 100,
        totalExpenses: (totalExpenses._sum.amount || 0) / 100,
        netCashFlow:
          ((cashIn._sum.amount || 0) - (cashOut._sum.amount || 0)) / 100,
        pendingReceivables: totalSalesCredit / 100, // Same as Credit Sales
        pendingPayables: pendingPayables / 100,
      },
    };
  }

  /**
   * 2️⃣ SALES REPORT
   * Profit = NULL if cost not captured.
   */
  async getSalesReport(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    shopId?: string,
    partyId?: string,
    jobCardOnly?: boolean,
  ) {
    const where: any = {
      tenantId,
      ...(shopId && { shopId }),
      ...(partyId && { customerId: partyId }),
      ...(jobCardOnly && { jobCardId: { not: null } }),
      status: { not: InvoiceStatus.VOIDED },
      ...(startDate &&
        endDate && {
          invoiceDate: { gte: startDate, lte: endDate },
        }),
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        items: { include: { product: true } },
        receipts: { where: { status: ReceiptStatus.ACTIVE } },
        customer: { select: { name: true } },
        shop: { select: { name: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Fetch StockLedger Costs for these invoices
    const salesInvoiceIds = invoices.map((inv) => inv.id);
    const repairJobCardIds = invoices
      .filter((inv) => inv.jobCardId)
      .map((inv) => inv.jobCardId as string);

    const costMap = new Map<string, number | null>(); // Key: referenceId:shopProductId

    if (salesInvoiceIds.length > 0 || repairJobCardIds.length > 0) {
      const costs = await this.prisma.stockLedger.findMany({
        where: {
          tenantId,
          OR: [
            {
              referenceType: 'SALE',
              referenceId: { in: salesInvoiceIds },
            },
            {
              referenceType: 'REPAIR',
              referenceId: { in: repairJobCardIds },
            },
          ],
        },
        select: { referenceId: true, costPerUnit: true, shopProductId: true },
      });
      costs.forEach((c) =>
        costMap.set(`${c.referenceId}:${c.shopProductId}`, c.costPerUnit),
      );
    }

    return invoices.map((inv) => {
      const paid = inv.receipts.reduce((sum, r) => sum + r.amount, 0);
      const pending = inv.totalAmount - paid;

      // Calculate Profit per item
      let totalProfit: number | null = 0;
      let isProfitValid = true;

      for (const item of inv.items) {
        // SERVICE items always have zero cost (100% margin on labor)
        if (item.product?.type === ProductType.SERVICE) {
          totalProfit += item.lineTotal - item.gstAmount;
          continue;
        }

        // Determine correct refId for cost lookup
        // Priority 1: New Format (REPAIR + jobCardId)
        // Priority 2: Legacy/Buggy Format (SALE + invoiceId)
        let cost = inv.jobCardId
          ? costMap.get(`${inv.jobCardId}:${item.shopProductId}`)
          : undefined;

        if (cost === undefined || cost === null) {
          cost = costMap.get(`${inv.id}:${item.shopProductId}`);
        }

        if (cost === undefined || cost === null) {
          isProfitValid = false;
          break; // One missing cost voids invoice profit (conservative)
        }

        // Profit = total net revenue - (cost * quantity)
        totalProfit += item.lineTotal - item.gstAmount - cost * item.quantity;
      }

      if (!isProfitValid) totalProfit = null;

      // Generate payment breakdown from receipts
      let paymentDisplay = inv.paymentMode;
      if (inv.receipts.length > 0) {
        // Group receipts by payment method
        const methodsMap = new Map<string, number>();
        inv.receipts.forEach((r) => {
          const current = methodsMap.get(r.paymentMethod) || 0;
          methodsMap.set(r.paymentMethod, current + r.amount);
        });

        // Use receipts for payment display
        if (methodsMap.size > 0) {
          paymentDisplay = Array.from(methodsMap.keys()).join(' + ') as any;
        }
      } else if (paymentDisplay === 'CREDIT' || !paymentDisplay) {
        paymentDisplay = 'UNPAID' as any;
      }

      return {
        invoiceNo: inv.invoiceNumber,
        date: inv.invoiceDate,
        customer: inv.customerName,
        totalAmount: inv.totalAmount / 100, // Paisa to Rupees
        paidAmount: paid / 100, // Paisa to Rupees
        pendingAmount: pending / 100, // Paisa to Rupees
        paymentMode: paymentDisplay as any, // Allow breakdown strings like "CASH + UPI"
        profit: totalProfit !== null ? totalProfit / 100 : null, // Paisa to Rupees
        shopName: inv.shop.name,
      };
    });
  }

  /**
   * 3️⃣ PURCHASE REPORT
   * Note: Purchase module represents Bill + Stock Receipt together.
   */
  async getPurchaseReport(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    shopId?: string,
    partyId?: string,
  ) {
    const where: any = {
      tenantId,
      ...(shopId && { shopId }),
      ...(partyId && { globalSupplierId: partyId }),
      status: { not: PurchaseStatus.CANCELLED },
      ...(startDate &&
        endDate && {
          invoiceDate: { gte: startDate, lte: endDate },
        }),
    };

    const purchases = await this.prisma.purchase.findMany({
      where,
      include: {
        shop: { select: { name: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return purchases.map((p) => ({
      purchaseNo: p.invoiceNumber,
      supplier: p.supplierName,
      date: p.invoiceDate,
      totalAmount: p.grandTotal / 100, // Paisa to Rupees
      paidAmount: p.paidAmount / 100, // Paisa to Rupees
      pendingAmount: (p.grandTotal - p.paidAmount) / 100, // Paisa to Rupees
      stockReceived: p.status !== PurchaseStatus.DRAFT, // Check logic
      shopName: p.shop.name,
    }));
  }

  /**
   * 4️⃣ INVENTORY REPORT
   * Logic: StockLedger Aggregation
   */
  async getInventoryReport(tenantId: string, shopId?: string) {
    const where: any = { tenantId };
    if (shopId) where.shopId = shopId;

    // Get Raw Aggregation from StockLedger
    const stockBalance = await this.prisma.stockLedger.groupBy({
      by: ['shopProductId'],
      where,
      _sum: {
        quantity: true, // Need to handle IN vs OUT sign manually?
        // groupBy doesn't support conditional sum easily in Prisma standard API without raw.
        // Prisma stores signs? No, type='IN'/'OUT'.
        // So simple sum is not enough unless we stored signed quantity.
        // We stored unsigned quantity + type.
      },
    });

    // Standard Prisma GroupBy cannot do Conditional Sum (CASE WHEN).
    // We must use Raw Query or fetch all entries (too heavy).
    // Or we query IN sum and OUT sum separately.

    // Strategy: Fetch products, then get balances derived from `StockService.getCurrentStock`
    // BUT `getCurrentStock` is single product. We need Bulk.
    // Efficient Approach: Raw Query.

    // ════════════════════════════════════════════════════════════════════
    // ✅ APPROVED RAW SQL: Stock balance calculation
    // ════════════════════════════════════════════════════════════════════
    // Why raw SQL is acceptable here:
    // 1. Requires conditional SUM with CASE WHEN (not supported by Prisma)
    // 2. Performance-critical reporting query (needs to be fast)
    // 3. Properly parameterized with $queryRaw template literals (SQL injection safe)
    // 4. Type-safe: TypeScript types defined for result
    //
    // Alternative would require:
    // - Fetching all StockLedger entries (potentially millions of rows)
    // - Computing balances in application code (slow, memory intensive)
    // - OR making 2 separate Prisma queries (one for IN, one for OUT) then merging
    //
    // Decision: Keep raw SQL for performance and simplicity
    // ════════════════════════════════════════════════════════════════════

    const shopFilter = shopId
      ? Prisma.sql`AND "shopId" = ${shopId}`
      : Prisma.empty;

    const balances = await this.prisma.$queryRaw<
      { shopProductId: string; balance: bigint }[]
    >`
      SELECT "shopProductId", 
             SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE -"quantity" END) as "balance"
      FROM "mb_stock_ledger"
      WHERE "tenantId" = ${tenantId}
      ${shopFilter}
      GROUP BY "shopProductId"
      HAVING SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE -"quantity" END) != 0
    `;

    // Map to Product Details
    const productIds = balances.map((b) => b.shopProductId);
    const products = await this.prisma.shopProduct.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        isSerialized: true,
        costPrice: true,
        reorderLevel: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return balances.map((b) => {
      const prod = productMap.get(b.shopProductId);
      const qty = Number(b.balance);
      const cost = prod?.costPrice || 0;

      return {
        product: prod?.name || 'Unknown',
        isSerialized: prod?.isSerialized || false,
        quantity: qty,
        costPrice: prod?.costPrice ? prod.costPrice / 100 : 0, // Paisa to Rupees
        stockValue: prod?.costPrice ? (qty * prod.costPrice) / 100 : null, // Paisa to Rupees
        lowStock: prod?.reorderLevel ? qty <= prod.reorderLevel : false,
      };
    });
  }

  /**
   * 5️⃣ PROFIT SUMMARY
   * Logic: Paid/Valid Revenue - Cost (LPP)
   */
  async getProfitSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    shopId?: string,
    partyId?: string,
  ) {
    const whereInvoice: any = {
      tenantId,
      ...(shopId && { shopId }),
      ...(partyId && { customerId: partyId }),
      status: { not: InvoiceStatus.VOIDED },
      ...(startDate &&
        endDate && {
          invoiceDate: { gte: startDate, lte: endDate },
        }),
    };

    // 1. Revenue Separation
    const salesRevenueAgg = await this.prisma.invoiceItem.aggregate({
      where: {
        invoice: {
          ...whereInvoice,
          jobCardId: null, // Pure Sales
        },
      },
      _sum: { lineTotal: true },
    });

    const repairRevenueAgg = await this.prisma.invoiceItem.aggregate({
      where: {
        invoice: {
          ...whereInvoice,
          jobCardId: { not: null }, // Repair Invoices
        },
      },
      _sum: { lineTotal: true },
    });

    // Use Prisma.sql for dynamic parts
    const shopFilter = shopId
      ? Prisma.sql`AND i."shopId" = ${shopId}`
      : Prisma.empty;
    const dateStartFilter = startDate
      ? Prisma.sql`AND i."invoiceDate" >= ${startDate}`
      : Prisma.empty;
    const dateEndFilter = endDate
      ? Prisma.sql`AND i."invoiceDate" <= ${endDate}`
      : Prisma.empty;
    const salesPartyFilter = partyId
      ? Prisma.sql`AND i."customerId" = ${partyId}`
      : Prisma.empty;
    // For Repair, JobCard also has customerId.
    const repairPartyFilter = partyId
      ? Prisma.sql`AND jc."customerId" = ${partyId}`
      : Prisma.empty;

    // 2. Cost Separation (Raw Query for Weighted Sum)
    // Note: StockLedger stores createdAt, not invoiceDate. Approximate match or join?
    // Joining InvoiceItem -> Invoice is safer for exact period match if possible.
    // However, StockLedger for 'REPAIR' references JobCard, 'SALE' references InvoiceItem.
    // 'SALE' refId is InvoiceItem.id. 'REPAIR' refId is JobCard.id (mostly).

    // Complex Join Strategy for accuracy:
    // Cost SALE: Join StockLedger -> InvoiceItem -> Invoice
    // Cost REPAIR: Join StockLedger -> JobCard -> Invoice?
    // Repair Stock Out happens BEFORE Invoice usually.
    // But Profit Report is usually based on "Invoiced Period".
    // If we count cost of parts used in jobs invoiced in this period:
    // JOIN StockLedger on refId=jobCardId WHERE jobCardId IN (Invoices in Period).

    // SIMPLE APPROACH (User confirmed "Modernized Approach", implied robust).
    // Let's iterate Invoices and summing costs? No, simplified aggregate.

    // ════════════════════════════════════════════════════════════════════
    // ✅ APPROVED RAW SQL: Profit calculation with multi-table JOINs
    // ════════════════════════════════════════════════════════════════════
    // Why raw SQL is acceptable here:
    // 1. Requires complex JOINs across 3 tables (StockLedger -> Invoice -> JobCard)
    // 2. Filters must apply consistently across all tables
    // 3. Performance-critical reporting query (profit calculations)
    // 4. Properly parameterized with $queryRaw template literals (SQL injection safe)
    // 5. Type-safe: TypeScript types defined for result
    //
    // Alternative would require:
    // - Multiple separate Prisma queries with manual JOIN logic
    // - Loading all records into memory (slow, memory intensive)
    // - Complex nested includes with filtering
    //
    // Decision: Keep raw SQL for accuracy, performance, and maintainability
    // ════════════════════════════════════════════════════════════════════

    // Cost SALE (Linked to Invoice ID)
    const costSaleResult = await this.prisma.$queryRaw<
      { total_cost: bigint }[]
    >`
      SELECT SUM(sl."quantity" * sl."costPerUnit") as "total_cost"
      FROM "mb_stock_ledger" sl
      JOIN "mb_invoice" i ON sl."referenceId" = i."id"
      WHERE sl."tenantId" = ${tenantId}
        AND sl."referenceType" = 'SALE'
        AND i."status" != 'VOIDED'
        AND i."jobCardId" IS NULL
        ${shopFilter}
        ${dateStartFilter}
        ${dateEndFilter}
        ${salesPartyFilter}
    `;

    // Cost REPAIR (Linked to JobCard)
    // JobCard Parts are OUT entries with refType='REPAIR', refId=JobCardId
    // We need to filter these by Invoices in the date range?
    // If we filter by StockLedger.createdAt, it might be different from InvoiceDate.
    // Consistency: Filter by Invoice Date.
    const costRepairResult = await this.prisma.$queryRaw<
      { total_cost: bigint }[]
    >`
      SELECT SUM(sl."quantity" * sl."costPerUnit") as "total_cost"
      FROM "mb_stock_ledger" sl
      JOIN "mb_job_card" jc ON sl."referenceId" = jc."id"
      JOIN "mb_invoice" i ON jc."id" = i."jobCardId"
      WHERE sl."tenantId" = ${tenantId}
        AND sl."referenceType" = 'REPAIR'
        AND i."status" != 'VOIDED'
        ${shopFilter}
        ${dateStartFilter}
        ${dateEndFilter}
        ${repairPartyFilter}
    `;

    const salesRevenuePaisa = Number(salesRevenueAgg._sum.lineTotal || 0);
    const repairRevenuePaisa = Number(repairRevenueAgg._sum.lineTotal || 0);
    const totalRevenuePaisa = salesRevenuePaisa + repairRevenuePaisa;

    const salesCostPaisa = Number(costSaleResult?.[0]?.total_cost || 0);
    const repairCostPaisa = Number(costRepairResult?.[0]?.total_cost || 0);
    const totalCostPaisa = salesCostPaisa + repairCostPaisa;

    // Convert to Rupees
    const salesRevenue = salesRevenuePaisa / 100;
    const repairRevenue = repairRevenuePaisa / 100;
    const totalRevenue = totalRevenuePaisa / 100;

    const salesCost = salesCostPaisa / 100;
    const repairCost = repairCostPaisa / 100;
    const totalCost = totalCostPaisa / 100;

    const salesProfit = salesRevenue - salesCost;
    const repairProfit = repairRevenue - repairCost;
    const totalProfit = totalRevenue - totalCost;

    return {
      metrics: {
        totalRevenue,
        totalCost,
        grossProfit: totalProfit,
        margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,

        // Breakdown
        salesRevenue,
        salesCost,
        salesProfit,

        repairRevenue,
        repairCost,
        repairProfit,
      },
    };
  }

  /**
   * 6️⃣ TOP SELLING PRODUCTS
   * Logic: Group InvoiceItems by product, sum Qty and Amount.
   */
  async getTopSellingProducts(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    shopId?: string,
  ) {
    const whereInvoice: any = {
      tenantId,
      ...(shopId && { shopId }),
      status: { not: InvoiceStatus.VOIDED },
      ...(startDate &&
        endDate && {
          invoiceDate: { gte: startDate, lte: endDate },
        }),
    };

    const topProducts = await this.prisma.invoiceItem.groupBy({
      by: ['shopProductId'],
      where: {
        invoice: whereInvoice,
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: { lineTotal: 'desc' },
      },
      take: 5,
    });

    // Populate Product Names
    const productIds = topProducts.map((p) => p.shopProductId);
    const products = await this.prisma.shopProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((p) => ({
      productId: p.shopProductId,
      name: productMap.get(p.shopProductId)?.name || 'Unknown',
      totalQty: p._sum.quantity || 0,
      totalAmount: (p._sum.lineTotal || 0) / 100, // Paisa to Rupees
    }));
  }

  async getRepairReport(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    shopId?: string,
  ) {
    return this.getSalesReport(
      tenantId,
      startDate,
      endDate,
      shopId,
      undefined,
      true,
    );
  }

  async getRepairMetrics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    shopId?: string,
  ) {
    const report = await this.getRepairReport(
      tenantId,
      startDate,
      endDate,
      shopId,
    );

    const totalRepairs = report.length;
    const totalRevenue = report.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalProfit = report.reduce((sum, r) => sum + (r.profit || 0), 0);

    return {
      totalRepairs,
      totalRevenue,
      totalProfit,
      margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }
}
