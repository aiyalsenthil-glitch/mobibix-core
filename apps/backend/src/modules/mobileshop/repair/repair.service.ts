import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ProductType } from '@prisma/client';
import { RepairStockOutDto } from './dto/repair-stock-out.dto';
import { RepairBillDto, BillingMode } from './dto/repair-bill.dto';
import {
  generateSalesInvoiceNumber,
  getFinancialYear,
} from '../../../common/utils/invoice-number.util';

@Injectable()
export class RepairService {
  constructor(private prisma: PrismaService) {}

  async stockOutForRepair(tenantId: string, dto: RepairStockOutDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // validate shop
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true },
      });
      if (!shop) throw new BadRequestException('Invalid shop');

      // validate job card
      const job = await tx.jobCard.findFirst({
        where: {
          id: dto.jobCardId,
          tenantId,
          shopId: dto.shopId,
        },
        select: { id: true, status: true },
      });
      if (!job) throw new BadRequestException('Invalid job card');

      // FIX 1: Job status validation - only allow specific statuses
      const allowedStatuses = [
        'RECEIVED',
        'DIAGNOSING',
        'WAITING_FOR_PARTS',
        'IN_PROGRESS',
      ];
      if (!allowedStatuses.includes(job.status)) {
        throw new BadRequestException(
          `Cannot issue stock for job in status ${job.status}`,
        );
      }

      // validate products and FIX 3: restrict product types
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true, type: true, name: true },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // FIX 3: Block GOODS products from being issued as repair parts
      // SAFETY: Also block SERVICE products (non-physical inventory items)
      for (const product of products) {
        if (product.type === ProductType.GOODS) {
          throw new BadRequestException(
            'Goods products cannot be issued as repair parts. Use SPARE products only.',
          );
        }
        // ⚠️ SAFETY CHECK: Prevent SERVICE products from being used in stock operations
        // SERVICE products (like "Repair Services") represent labor, not physical inventory
        if (product.type === ProductType.SERVICE) {
          throw new BadRequestException(
            `Service product "${product.name}" cannot be issued in stock operations. Only physical inventory items can be stock-out.`,
          );
        }
      }

      // FIX 2: Prevent duplicate stock-out for same job + product
      for (const item of dto.items) {
        const existing = await tx.stockLedger.findFirst({
          where: {
            tenantId,
            shopId: dto.shopId,
            referenceType: 'REPAIR',
            referenceId: dto.jobCardId,
            shopProductId: item.shopProductId,
          },
        });
        if (existing) {
          const product = products.find((p) => p.id === item.shopProductId);
          throw new BadRequestException(
            `Product "${product?.id}" has already been issued for this job`,
          );
        }
      }

      // Validate stock availability before creating OUT entries
      for (const item of dto.items) {
        const product = products.find((p) => p.id === item.shopProductId);
        if (!product) continue;

        // Calculate current stock from StockLedger
        const stockEntries = await tx.stockLedger.findMany({
          where: { shopProductId: item.shopProductId, tenantId },
          select: { type: true, quantity: true },
        });

        const currentStock = stockEntries.reduce((sum, e) => {
          return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
        }, 0);

        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${currentStock}, Required: ${item.quantity}`,
          );
        }
      }

      // Create JobCardPart entries first
      const partsUsedEntries = dto.items.map((i) => ({
        jobCardId: dto.jobCardId,
        shopProductId: i.shopProductId,
        quantity: i.quantity,
        costPrice: i.costPerUnit || 0, // Mapped to costPrice
      }));

      await tx.jobCardPart.createMany({ data: partsUsedEntries });

      // Create corresponding StockLedger OUT entries
      const entries = dto.items.map((i) => ({
        tenantId,
        shopId: dto.shopId,
        shopProductId: i.shopProductId,
        type: 'OUT' as const,
        quantity: i.quantity,
        referenceType: 'REPAIR' as const,
        referenceId: dto.jobCardId,
        costPerUnit: i.costPerUnit,
        note: dto.note ?? null,
      }));

      await tx.stockLedger.createMany({ data: entries });

      return { success: true, entries: entries.length };
    });
  }

  async generateRepairBill(tenantId: string, dto: RepairBillDto) {
    if (!dto.services?.length) {
      throw new BadRequestException('At least one service required');
    }

    return this.prisma.$transaction(async (tx) => {
      // Fetch and validate job card
      const job = await tx.jobCard.findFirst({
        where: {
          id: dto.jobCardId,
          tenantId,
          shopId: dto.shopId,
        },
        select: {
          id: true,
          status: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
        },
      });

      if (!job) {
        throw new BadRequestException('Job card not found');
      }

      // Validate job status is READY
      if (job.status !== 'READY') {
        throw new BadRequestException(
          `Job must be in READY status to bill. Current status: ${job.status}`,
        );
      }

      // Fetch shop for GST setting
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true, gstEnabled: true },
      });

      if (!shop) {
        throw new BadRequestException('Shop not found');
      }

      // Validate GST choice against shop settings
      if (dto.billingMode === BillingMode.WITH_GST && !shop.gstEnabled) {
        throw new BadRequestException(
          'Shop is not registered for GST. Cannot bill with GST.',
        );
      }

      // ISSUE 1 FIX: For services, we need a valid ShopProduct reference
      // ✅ NOW USING ProductType.SERVICE (proper type added to schema)
      //
      // ⚠️ CRITICAL SAFETY NOTES:
      // - SERVICE type products MUST NEVER be included in stock inventory
      // - Must NOT appear in stock-out/stock-in operations
      // - Must NOT be used in warehouse management
      // - This product represents a service (labor), not a physical item
      //
      // SAFETY IMPLEMENTATION:
      // See stockOutForRepair() below - explicitly blocks SERVICE type from stock operations
      //
      // RACE CONDITION PREVENTION:
      // Using findFirst + create with proper handling (upsert requires unique constraint)
      // TODO: Add schema constraint: unique([shopId, tenantId, name]) on ShopProduct
      let serviceProductId: string;

      // Try to find existing "Repair Services" product for this shop
      const existingServiceProduct = await tx.shopProduct.findFirst({
        where: {
          shopId: dto.shopId,
          tenantId,
          name: 'Repair Services',
        },
        select: { id: true },
      });

      if (existingServiceProduct) {
        serviceProductId = existingServiceProduct.id;
      } else {
        // Create SERVICE type product for repair labor
        // ✅ Now using ProductType.SERVICE (safe, explicit type)
        const serviceProduct = await tx.shopProduct.create({
          data: {
            tenantId,
            shopId: dto.shopId,
            name: 'Repair Services',
            type: ProductType.SERVICE, // ✅ Proper SERVICE type (previously SPARE)
            isActive: true,
            salePrice: 0,
          },
          select: { id: true },
        });
        serviceProductId = serviceProduct.id;
      }

      // Generate next invoice number with financial year format
      // IMPORTANT: Sequence resets to 0001 on each financial year (April 1)
      const today = new Date();
      const shopForInvoice = await tx.shop.findFirst({
        where: { id: dto.shopId },
        select: { invoicePrefix: true },
      });

      if (!shopForInvoice) {
        throw new BadRequestException('Shop not found');
      }

      const fy = getFinancialYear(today);
      // fy will be "202526" for Apr2025-Mar2026, "202627" for Apr2026-Mar2027, etc.

      // Find all repair invoices for THIS FINANCIAL YEAR
      // When FY changes, this returns empty array, causing sequence to reset to 0001
      const allInvoices = await tx.invoice.findMany({
        where: {
          shopId: dto.shopId,
          invoiceNumber: { contains: `-S-${fy}-` }, // Only finds invoices from current FY
        },
        select: { invoiceNumber: true },
      });

      // Find highest sequence in current FY
      // If no invoices exist for this FY yet, maxSeq stays 0 (fresh start)
      let maxSeq = 0;
      for (const inv of allInvoices) {
        const parts = inv.invoiceNumber.split('-');
        const seq = parseInt(parts[parts.length - 1], 10); // Extract 0001, 0002, etc.
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }

      const invoiceNumber = generateSalesInvoiceNumber(
        shopForInvoice.invoicePrefix,
        maxSeq + 1, // First invoice = 1, second = 2, etc.
        today,
      );

      // Validate and fetch parts if provided
      const partIds = dto.parts?.map((p) => p.shopProductId) || [];
      const parts = partIds.length
        ? await tx.shopProduct.findMany({
            where: {
              id: { in: partIds },
              tenantId,
              shopId: dto.shopId,
              isActive: true,
            },
            select: { id: true, name: true },
          })
        : [];

      if (parts.length !== partIds.length) {
        throw new BadRequestException('One or more parts not found');
      }

      // Determine service GST rate based on billing mode
      const effectiveServiceGstRate =
        dto.billingMode === BillingMode.WITH_GST
          ? (dto.serviceGstRate ?? 18) // Default 18% if WITH_GST
          : 0; // 0% if WITHOUT_GST

      // Calculate totals
      let servicesTotal = 0;
      let servicesGstTotal = 0;
      let partsTotal = 0;
      let partsGstTotal = 0;

      // ISSUE 2 FIX: Helper function for tax-inclusive/exclusive calculation
      const calculateTax = (
        amount: number,
        taxRate: number,
        pricesIncludeTax: boolean,
      ) => {
        if (pricesIncludeTax) {
          // Price includes tax: extract base and tax
          const base = amount / (1 + taxRate / 100);
          const tax = amount - base;
          return {
            base: Math.round(base),
            tax: Math.round(tax),
            total: amount,
          };
        } else {
          // Price excludes tax: add tax to base
          const base = amount;
          const tax = Math.round((base * taxRate) / 100);
          return { base, tax, total: base + tax };
        }
      };

      // Services total (SAC 9987, taxable but GST depends on billing mode)
      const serviceCalculations = dto.services.map((service) => {
        const calc = calculateTax(
          service.amount,
          effectiveServiceGstRate,
          dto.pricesIncludeTax ?? false,
        );
        servicesTotal += calc.base;
        servicesGstTotal += calc.tax;
        return {
          serviceAmount: service.amount,
          base: calc.base,
          tax: calc.tax,
          total: calc.total,
        };
      });

      // Parts total (if provided)
      const partCalculations = (dto.parts || []).map((part) => {
        const calc = calculateTax(
          part.rate * part.quantity,
          part.gstRate,
          dto.pricesIncludeTax ?? false,
        );
        partsTotal += calc.base;
        partsGstTotal += calc.tax;
        return {
          partAmount: part.rate * part.quantity,
          base: calc.base,
          tax: calc.tax,
          total: calc.total,
        };
      });

      const subtotal = servicesTotal + partsTotal;
      const totalGst = servicesGstTotal + partsGstTotal;
      const grandTotal = subtotal + totalGst;

      // Create invoice items data for DB
      // ISSUE 1 FIX: Use serviceProductId instead of dto.shopId (valid ShopProduct reference)
      // ISSUE 3 FIX: Document that hsnCode '9987' is actually SAC for services
      const serviceItems = dto.services.map((service, idx) => ({
        shopProductId: serviceProductId, // ✅ Valid ShopProduct reference
        quantity: 1,
        rate: serviceCalculations[idx].base,
        hsnCode: '9987', // ✅ SAC 9987 for repair services (stored in hsnCode field)
        gstRate: effectiveServiceGstRate,
        gstAmount: serviceCalculations[idx].tax,
        lineTotal: serviceCalculations[idx].total,
      }));

      const partItems = (dto.parts || []).map((partDto, idx) => ({
        shopProductId: partDto.shopProductId,
        quantity: partDto.quantity,
        rate: partDto.rate,
        hsnCode: '8517', // ✅ HSN for parts
        gstRate: partDto.gstRate,
        gstAmount: partCalculations[idx].tax,
        lineTotal: partCalculations[idx].total,
      }));

      const allItems = [...serviceItems, ...partItems];

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          customerId: job.customerId,
          invoiceNumber,
          invoiceDate: new Date(),
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          subTotal: Math.round(subtotal),
          gstAmount: Math.round(totalGst),
          totalAmount: Math.round(grandTotal),
          paymentMode: dto.paymentMode,
          status: 'PAID',
          items: {
            create: allItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Create financial entry
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          type: 'IN',
          amount: Math.round(grandTotal),
          mode: dto.paymentMode,
          referenceType: 'JOB',
          referenceId: dto.jobCardId,
          note: `Repair bill for job ${job.id} (${dto.billingMode})`,
        },
      });

      // Mark job as DELIVERED (atomic with billing)
      await tx.jobCard.update({
        where: { id: dto.jobCardId },
        data: {
          status: 'DELIVERED',
          finalCost: Math.round(grandTotal),
          updatedAt: new Date(),
        },
      });

      // Return invoice with calculated totals
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        items: invoice.items,
        subTotal: invoice.subTotal,
        gstAmount: invoice.gstAmount,
        totalAmount: invoice.totalAmount,
        paymentMode: invoice.paymentMode,
        billingMode: dto.billingMode,
        status: 'DELIVERED',
      };
    });
  }

  /**
   * Cancel repair job and reverse stock ledger entries
   * Creates IN entries to reverse all OUT entries linked to this job
   */
  async cancelRepair(tenantId: string, shopId: string, jobCardId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Validate job card exists
      const job = await tx.jobCard.findFirst({
        where: { id: jobCardId, tenantId, shopId },
        select: { id: true, status: true },
      });

      if (!job) {
        throw new BadRequestException('Job card not found');
      }

      // Prevent cancelling already delivered jobs
      if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
        throw new BadRequestException(
          `Cannot cancel job in ${job.status} status`,
        );
      }

      // Find all parts used for this repair
      // Find all parts used for this repair
      const partsUsed = await tx.jobCardPart.findMany({
        where: { jobCardId },
        select: { shopProductId: true, quantity: true, costPrice: true },
      });

      if (partsUsed.length > 0) {
        // Create reversal IN entries to restore stock
        const reversalEntries = partsUsed.map((part) => ({
          tenantId,
          shopId,
          shopProductId: part.shopProductId,
          type: 'IN' as const,
          quantity: part.quantity,
          referenceType: 'REPAIR' as const,
          referenceId: jobCardId,
          costPerUnit: part.costPrice, // Mapped from costPrice
          note: `Stock reversal: Job ${jobCardId} cancelled`,
        }));

        await tx.stockLedger.createMany({ data: reversalEntries });
      }

      // Update job status to CANCELLED
      await tx.jobCard.update({
        where: { id: jobCardId },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });

      return { success: true, partsReversed: partsUsed.length };
    });
  }
}
