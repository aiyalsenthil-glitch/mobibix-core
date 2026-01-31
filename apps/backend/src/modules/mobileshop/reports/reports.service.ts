import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { InvoiceStatus, PurchaseStatus, VoucherType, PaymentMode, VoucherStatus, ReceiptType, ReceiptStatus } from '@prisma/client';

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
        status: { not: InvoiceStatus.CANCELLED },
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
        salesPaid: totalSalesPaid,
        salesCredit: totalSalesCredit,
        totalPurchases: purchaseTotal,
        totalExpenses: totalExpenses._sum.amount || 0,
        netCashFlow: (cashIn._sum.amount || 0) - (cashOut._sum.amount || 0),
        pendingReceivables: totalSalesCredit, // Same as Credit Sales
        pendingPayables: pendingPayables,
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
  ) {
    const where: any = {
      tenantId,
      ...(shopId && { shopId }),
      status: { not: InvoiceStatus.CANCELLED },
      ...(startDate && endDate && {
        invoiceDate: { gte: startDate, lte: endDate },
      }),
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        items: true,
        receipts: { where: { status: ReceiptStatus.ACTIVE } },
        customer: { select: { name: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Fetch StockLedger Costs for these invoices
    // We need to match: ReferenceType='SALE' AND ReferenceId IN (InvoiceItem.id)
    const allItemIds = invoices.flatMap(inv => inv.items.map(i => i.id));
    
    // Optimized: Only fetch if we have items
    let costMap = new Map<string, number | null>();
    if (allItemIds.length > 0) {
      const costs = await this.prisma.stockLedger.findMany({
        where: {
          tenantId,
          referenceType: 'SALE',
          referenceId: { in: allItemIds },
        },
        select: { referenceId: true, costPerUnit: true },
      });
      costs.forEach(c => costMap.set(c.referenceId!, c.costPerUnit));
    }

    return invoices.map((inv) => {
      const paid = inv.receipts.reduce((sum, r) => sum + r.amount, 0);
      const pending = inv.totalAmount - paid;

      // Calculate Profit per item
      let totalProfit: number | null = 0;
      let isProfitValid = true;

      for (const item of inv.items) {
        const cost = costMap.get(item.id);
        if (cost === undefined || cost === null) {
          isProfitValid = false;
          break; // One missing cost voids invoice profit (conservative)
        }
        // Profit = (Rate - Cost) * Qty
        // Note: item.rate should be paisa. Ensure DB stores rate in paisa.
        totalProfit! += (item.rate - cost) * item.quantity;
      }

      if (!isProfitValid) totalProfit = null;

      return {
        invoiceNo: inv.invoiceNumber,
        date: inv.invoiceDate,
        customer: inv.customerName,
        totalAmount: inv.totalAmount,
        paidAmount: paid,
        pendingAmount: pending,
        paymentMode: inv.paymentMode,
        profit: totalProfit, // Can be NULL
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
  ) {
    const where: any = {
      tenantId,
      ...(shopId && { shopId }),
      status: { not: PurchaseStatus.CANCELLED },
      ...(startDate && endDate && {
        invoiceDate: { gte: startDate, lte: endDate },
      }),
    };

    const purchases = await this.prisma.purchase.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
    });

    return purchases.map((p) => ({
      purchaseNo: p.invoiceNumber,
      supplier: p.supplierName,
      date: p.invoiceDate,
      totalAmount: p.grandTotal,
      paidAmount: p.paidAmount,
      pendingAmount: p.grandTotal - p.paidAmount,
      stockReceived: p.status !== PurchaseStatus.DRAFT, // Check logic
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
      }
    });
    
    // Standard Prisma GroupBy cannot do Conditional Sum (CASE WHEN).
    // We must use Raw Query or fetch all entries (too heavy).
    // Or we query IN sum and OUT sum separately.
    
    // Strategy: Fetch products, then get balances derived from `StockService.getCurrentStock` 
    // BUT `getCurrentStock` is single product. We need Bulk.
    // Efficient Approach: Raw Query.
    
    const balances = await this.prisma.$queryRaw<
      { shopProductId: string; balance: bigint }[]
    >`
      SELECT "shopProductId", 
             SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE -"quantity" END) as "balance"
      FROM "StockLedger"
      WHERE "tenantId" = ${tenantId}
      ${shopId ? `AND "shopId" = ${shopId}` : ''}
      GROUP BY "shopProductId"
      HAVING SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE -"quantity" END) != 0
    `;

    // Map to Product Details
    const productIds = balances.map(b => b.shopProductId);
    const products = await this.prisma.shopProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, isSerialized: true, costPrice: true, reorderLevel: true }
    });
    
    const productMap = new Map(products.map(p => [p.id, p]));

    return balances.map(b => {
      const prod = productMap.get(b.shopProductId);
      const qty = Number(b.balance);
      const cost = prod?.costPrice || 0;
      
      return {
        product: prod?.name || 'Unknown',
        isSerialized: prod?.isSerialized || false,
        quantity: qty,
        costPrice: cost,
        stockValue: prod?.costPrice ? (qty * cost) : null, // Null if cost unknown
        lowStock: prod?.reorderLevel ? (qty <= prod.reorderLevel) : false
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
  ) {
    const whereInvoice: any = {
      tenantId,
      ...(shopId && { shopId }),
      status: { not: InvoiceStatus.CANCELLED },
      ...(startDate && endDate && {
        invoiceDate: { gte: startDate, lte: endDate },
      }),
    };

    // 1. Total Revenue (From Invoice Items lineTotal)
    // We strictly use lineTotal sum from InvoiceItem
    const revenueAgg = await this.prisma.invoiceItem.aggregate({
      where: {
        invoice: whereInvoice
      },
      _sum: { lineTotal: true }
    });
    
    // 2. Total Cost (From StockLedger OUT entries linked to these SALES)
    // We need to find StockLedger entries where referenceId IN (InvoiceItem IDs).
    // This is complex to join in Prisma efficiently for aggregation.
    // Raw Query is cleaner to summing CostPerUnit * Qty for relevant entries.
    
    // Identify invoices first (to filter date/shop)
    // Then join StockLedger.
    
    /* 
       SELECT SUM(sl."quantity" * sl."costPerUnit") 
       FROM "StockLedger" sl
       JOIN "InvoiceItem" ii ON sl."referenceId" = ii."id"
       JOIN "Invoice" i ON ii."invoiceId" = i."id"
       WHERE sl."referenceType" = 'SALE' ...
    */
    
    const costResult = await this.prisma.$queryRaw<{ total_cost: bigint }[]>`
      SELECT SUM(sl."quantity" * sl."costPerUnit") as "total_cost"
      FROM "StockLedger" sl
      JOIN "InvoiceItem" ii ON sl."referenceId" = ii."id"
      JOIN "Invoice" i ON ii."invoiceId" = i."id"
      WHERE sl."tenantId" = ${tenantId}
        AND sl."referenceType" = 'SALE'
        AND i."status" != 'CANCELLED'
        ${shopId ? `AND i."shopId" = ${shopId}` : ''}
        ${startDate ? `AND i."invoiceDate" >= ${startDate}` : ''}
        ${endDate ? `AND i."invoiceDate" <= ${endDate}` : ''}
    `;

    const totalRevenue = revenueAgg._sum.lineTotal || 0;
    const totalCost = Number(costResult[0]?.total_cost || 0);

    return {
      metrics: {
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
      }
    };
  }
}
