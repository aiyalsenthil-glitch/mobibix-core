import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductType, IMEIStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';
import {
  generateSalesInvoiceNumber,
  getFinancialYear,
} from '../../common/utils/invoice-number.util';
import {
  calculateInvoiceTotals,
  InvoiceLineInput,
} from './invoice-calculator.util';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
  ) {}

  /**
   * Get next invoice number for the shop and financial year
   * IMPORTANT: Sequence resets to 0001 on each financial year (April 1)
   * - Each FY (April-March) has its own independent sequence
   * - When FY changes, search finds no invoices with new FY code
   * - First invoice of new FY automatically gets 0001
   * Handles race conditions with retry logic
   */
  private async getNextInvoiceNumber(
    tx: any,
    shopId: string,
    invoicePrefix: string,
  ): Promise<string> {
    const today = new Date();
    const fy = getFinancialYear(today);
    // fy will be "202526" for Apr2025-Mar2026, "202627" for Apr2026-Mar2027, etc.

    // Query all invoices for THIS FINANCIAL YEAR and shop
    // When FY changes, this returns empty array, causing sequence to reset to 0001
    const allInvoices = await tx.invoice.findMany({
      where: {
        shopId: shopId,
        invoiceNumber: { contains: `-S-${fy}-` }, // Only finds invoices from current FY
      },
      select: { invoiceNumber: true },
      orderBy: { createdAt: 'desc' },
    });

    // Find the highest sequence number in current FY
    // If no invoices exist for this FY yet, maxSeq stays 0 (fresh start)
    let maxSeq = 0;
    for (const inv of allInvoices) {
      const parts = inv.invoiceNumber.split('-');
      const seq = parseInt(parts[parts.length - 1], 10); // Extract 0001, 0002, etc.
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }

    const nextSequence = maxSeq + 1; // First invoice = 1, second = 2, etc.

    // Generate candidate invoice number with current FY
    let invoiceNumber = generateSalesInvoiceNumber(
      invoicePrefix,
      nextSequence,
      today,
    );

    // Retry with increment if unique constraint violation
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        // Check if this invoice number already exists
        const existing = await tx.invoice.findFirst({
          where: {
            shopId: shopId,
            invoiceNumber: invoiceNumber,
          },
        });

        if (!existing) {
          return invoiceNumber;
        }

        // If exists, increment and retry
        invoiceNumber = generateSalesInvoiceNumber(
          invoicePrefix,
          nextSequence + retries + 1,
          today,
        );
        retries++;
      } catch {
        retries++;
      }
    }

    throw new BadRequestException(
      'Failed to generate unique invoice number. Please try again.',
    );
  }

  async createInvoice(tenantId: string, dto: SalesInvoiceDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // validate shop and get state + invoicePrefix
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: {
          id: true,
          gstEnabled: true,
          state: true,
          invoicePrefix: true,
        },
      });

      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: {
          country: true,
        },
      });

      if (!shop) throw new BadRequestException('Invalid shop');

      const isIndianTenant =
        (tenant?.country || 'India').toLowerCase() === 'india';
      const isIndianGSTInvoice = isIndianTenant && shop.gstEnabled;

      // Generate invoice number with race condition handling
      const invoiceNumber = await this.getNextInvoiceNumber(
        tx,
        dto.shopId,
        shop.invoicePrefix,
      );
      dto.invoiceNumber = invoiceNumber;

      // fetch products for validation + type checking
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          isSerialized: true,
          hsnCode: true,
          gstRate: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // Build product maps
      const productTypeMap = new Map(products.map((p) => [p.id, p.type]));
      const productSerializedMap = new Map(
        products.map((p) => [p.id, p.isSerialized]),
      );
      const productHsnMap = new Map(
        products.map((p) => [p.id, p.hsnCode || null]),
      );
      const productGstRateMap = new Map(
        products.map((p) => [p.id, p.gstRate ?? 0]),
      );

      // Validate IMEI for serialized products and collect IMEIs
      const allImeis: string[] = [];
      const imeisByProduct = new Map<string, string[]>();

      for (const item of dto.items) {
        const productType = productTypeMap.get(item.shopProductId);
        const isSerialized = productSerializedMap.get(item.shopProductId);

        // ✅ FIX: Enforce isSerialized flag validation
        if (isSerialized && !item.imeis?.length) {
          throw new BadRequestException(
            `Serialized product ${item.shopProductId} requires IMEI list`,
          );
        }

        if (!isSerialized && item.imeis?.length) {
          throw new BadRequestException(
            `Non-serialized product ${item.shopProductId} cannot have IMEIs`,
          );
        }

        if (isSerialized && item.imeis?.length) {
          if (item.quantity !== item.imeis.length) {
            throw new BadRequestException(
              `Quantity (${item.quantity}) must match IMEI count (${item.imeis.length})`,
            );
          }
          allImeis.push(...item.imeis);
          imeisByProduct.set(item.shopProductId, item.imeis);
        }
      }

      // Validate IMEI availability (must exist and be IN_STOCK status)
      if (allImeis.length > 0) {
        const imeiRecords = await tx.iMEI.findMany({
          where: {
            imei: { in: allImeis },
            tenantId,
          },
          select: { imei: true, shopProductId: true, status: true },
        });

        if (imeiRecords.length !== allImeis.length) {
          throw new BadRequestException('One or more IMEIs not found');
        }

        // Validate IMEIs belong to correct products and are IN_STOCK
        for (const record of imeiRecords) {
          const expectedProductId = Array.from(imeisByProduct.entries()).find(
            ([_, imeis]) => imeis.includes(record.imei),
          )?.[0];
          if (record.shopProductId !== expectedProductId) {
            throw new BadRequestException(
              `IMEI ${record.imei} does not belong to product ${expectedProductId}`,
            );
          }
          if (record.status !== 'IN_STOCK') {
            throw new BadRequestException(
              `IMEI ${record.imei} is not available (status: ${record.status})`,
            );
          }
        }
      }

      // 🔒 GST & taxable value calculation (supports inclusive/exclusive pricing)
      const lineInputs: InvoiceLineInput[] = dto.items.map((i) => {
        // Enforce: if shop.gstEnabled = false, GST must be 0
        if (!shop.gstEnabled && i.gstRate > 0) {
          throw new BadRequestException(
            'GST not enabled for this shop. GST rate must be 0.',
          );
        }

        if (i.gstRate < 0 || i.gstRate > 100) {
          throw new BadRequestException(
            `Invalid GST rate: ${i.gstRate}. Must be between 0 and 100%.`,
          );
        }

        const productHsn = productHsnMap.get(i.shopProductId) || null;

        return {
          shopProductId: i.shopProductId,
          quantity: i.quantity,
          rate: i.rate,
          gstRate: i.gstRate,
          hsnCode: productHsn || undefined,
        };
      });

      const calc = calculateInvoiceTotals(lineInputs, {
        isIndianGSTInvoice,
        pricesIncludeTax: !!dto.pricesIncludeTax,
        shopState: shop.state,
        customerState: dto.customerState,
        customerGstin: dto.customerGstin,
      });

      // Store GST values and subtotal with decimal precision (as paisa: rupees * 100)
      // Only round final total
      const toPaisa = (value: number) => Math.round(value * 100);
      const toInt = (value: number) => Math.round(value);

      const invoiceItemsData = calc.lines.map((line) => ({
        shopProductId: line.shopProductId,
        quantity: line.quantity,
        rate: toInt(line.rate),
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        gstAmount: toPaisa(line.gstAmount), // Preserve decimals
        lineTotal: toInt(line.lineTotal),
      }));

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          customerId: dto.customerId,
          invoiceNumber: invoiceNumber,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerState: dto.customerState,
          customerGstin: dto.customerGstin,
          subTotal: toPaisa(calc.subTotal), // Store with decimal precision
          gstAmount: toPaisa(calc.gstAmount), // Store with decimal precision (exclusive mode needs this)
          cgst: toPaisa(calc.cgst), // Store with decimal precision
          sgst: toPaisa(calc.sgst), // Store with decimal precision
          igst: toPaisa(calc.igst), // Store with decimal precision
          totalAmount: toInt(calc.subTotal + calc.gstAmount), // Round only the final total
          // Use first payment method or fall back to paymentMode for backward compatibility
          paymentMode:
            dto.paymentMethods?.[0]?.mode || dto.paymentMode || 'CASH',
          items: { create: invoiceItemsData },
        },
      });

      // Create financial entries for each payment method
      if (dto.paymentMethods && dto.paymentMethods.length > 0) {
        const financialEntries = dto.paymentMethods.map((pm) => ({
          tenantId,
          shopId: dto.shopId,
          type: 'IN' as const,
          amount: pm.amount,
          mode: pm.mode,
          referenceType: 'INVOICE' as const,
          referenceId: invoice.id,
        }));
        await tx.financialEntry.createMany({ data: financialEntries });
      } else {
        // Fallback for old paymentMode format
        await tx.financialEntry.create({
          data: {
            tenantId,
            shopId: dto.shopId,
            type: 'IN',
            amount: toInt(calc.subTotal + calc.gstAmount),
            mode: dto.paymentMode || 'CASH',
            referenceType: 'INVOICE',
            referenceId: invoice.id,
          },
        });
      }

      // ✅ FIX: Use StockService.recordStockOut with validation (prevents negative stock)
      // Get invoice items with IDs for referenceId
      const createdInvoice = await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true },
      });

      if (!createdInvoice) {
        throw new BadRequestException('Failed to create invoice');
      }

      // Create stock OUT entries with validation
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const invoiceItem = createdInvoice.items[i];
        const isSerialized = productSerializedMap.get(item.shopProductId);

        // Use StockService for validation
        await this.stockService.recordStockOut(
          tenantId,
          dto.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          invoiceItem.id, // ✅ Use InvoiceItem.id for better audit trail
          undefined, // costPerUnit not tracked on sale
          isSerialized ? item.imeis : undefined,
        );
      }

      // Link IMEIs to invoice and update status to SOLD
      if (allImeis.length > 0) {
        await tx.iMEI.updateMany({
          where: { imei: { in: allImeis } },
          data: {
            invoiceId: invoice.id,
            status: 'SOLD',
            soldAt: new Date(),
          },
        });
      }

      return invoice;
    });
  }
  async listInvoices(tenantId: string, shopId: string) {
    // validate shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });

    if (!shop) {
      // Check if tenant has any shops
      const shopCount = await this.prisma.shop.count({
        where: { tenantId },
      });

      if (shopCount === 0) {
        return {
          invoices: [],
          empty: true,
          message:
            'No shops found. Create a shop to start creating sales invoices.',
          createShopUrl: '/mobileshop/shops',
        };
      }

      throw new BadRequestException('Invalid shop');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        shopId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        receipts: {
          where: { status: 'ACTIVE' },
          select: { amount: true },
        },
      },
    });

    // Enrich with calculated fields: paidAmount, balanceAmount, paymentStatus
    const enrichedInvoices = invoices.map((invoice) => {
      const paidAmount = invoice.receipts.reduce(
        (sum, receipt) => sum + receipt.amount,
        0,
      );
      const balanceAmount = invoice.totalAmount - paidAmount;

      // Derive payment status
      let paymentStatus = 'UNPAID';
      if (balanceAmount <= 0) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        totalAmount: invoice.totalAmount,
        paymentMode: invoice.paymentMode,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        paidAmount,
        balanceAmount,
        paymentStatus,
      };
    });

    return { invoices: enrichedInvoices, empty: false };
  }
  async updateInvoice(
    tenantId: string,
    invoiceId: string,
    dto: SalesInvoiceDto,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch existing invoice
      const oldInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { items: true },
      });

      if (!oldInvoice) {
        throw new BadRequestException('Invoice not found');
      }

      if (oldInvoice.status === 'CANCELLED') {
        throw new BadRequestException('Cannot update cancelled invoice');
      }

      // 2️⃣ Validate shop
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true, gstEnabled: true },
      });

      if (!shop) throw new BadRequestException('Invalid shop');

      // 3️⃣ Reverse old stock (IN) using StockService with InvoiceItem.id
      for (const item of oldInvoice.items) {
        await this.stockService.recordStockIn(
          tenantId,
          oldInvoice.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          item.id,
        );
      }

      // 3️⃣.5️⃣ Revert old IMEI links (mark as available again)
      // ✅ FIX: Reset status to IN_STOCK and clear soldAt
      await tx.iMEI.updateMany({
        where: { invoiceId: oldInvoice.id },
        data: {
          invoiceId: null,
          status: IMEIStatus.IN_STOCK,
          soldAt: null,
        },
      });

      // 4️⃣ Reverse old financial entry (OUT)
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: oldInvoice.shopId,
          type: 'OUT',
          amount: oldInvoice.totalAmount,
          mode: oldInvoice.paymentMode,
          referenceType: 'INVOICE',
          referenceId: oldInvoice.id,
          note: 'Invoice updated - reverse old',
        },
      });

      // 5️⃣ Fetch new products for validation + type checking (include isSerialized)
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true, type: true, isSerialized: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // Build product maps
      const productTypeMap = new Map(products.map((p) => [p.id, p.type]));
      const productSerializedMap = new Map(
        products.map((p) => [p.id, p.isSerialized]),
      );

      // Validate IMEI for serialized products and collect IMEIs
      const newAllImeis: string[] = [];
      const newImeisByProduct = new Map<string, string[]>();

      for (const item of dto.items) {
        const isSerialized = productSerializedMap.get(item.shopProductId);
        if (isSerialized && !item.imeis?.length) {
          throw new BadRequestException(
            `Serialized product ${item.shopProductId} requires IMEI list`,
          );
        }
        if (!isSerialized && item.imeis?.length) {
          throw new BadRequestException(
            `Non-serialized product ${item.shopProductId} cannot have IMEIs`,
          );
        }
        if (isSerialized && item.imeis?.length) {
          if (item.quantity !== item.imeis.length) {
            throw new BadRequestException(
              `Quantity (${item.quantity}) must match IMEI count (${item.imeis.length})`,
            );
          }
          newAllImeis.push(...item.imeis);
          newImeisByProduct.set(item.shopProductId, item.imeis);
        }
      }

      // Validate new IMEI availability (must exist and not be sold, or be from old invoice)
      if (newAllImeis.length > 0) {
        const imeiRecords = await tx.iMEI.findMany({
          where: {
            imei: { in: newAllImeis },
            tenantId,
          },
          select: { imei: true, shopProductId: true, invoiceId: true },
        });

        if (imeiRecords.length !== newAllImeis.length) {
          throw new BadRequestException('One or more IMEIs not found');
        }

        // Validate IMEIs belong to correct products and are not sold (or are from old invoice)
        for (const record of imeiRecords) {
          const expectedProductId = Array.from(
            newImeisByProduct.entries(),
          ).find(([_, imeis]) => imeis.includes(record.imei))?.[0];
          if (record.shopProductId !== expectedProductId) {
            throw new BadRequestException(
              `IMEI ${record.imei} does not belong to product ${expectedProductId}`,
            );
          }
          if (record.invoiceId && record.invoiceId !== oldInvoice.id) {
            throw new BadRequestException(
              `IMEI ${record.imei} already sold on different invoice`,
            );
          }
        }
      }

      // 6️⃣ VALIDATE GST (frontend-calculated)
      let subTotal = 0;
      let gstAmount = 0;

      const invoiceItemsData = dto.items.map((i) => {
        // Enforce: if shop.gstEnabled = false, GST must be 0
        if (!shop.gstEnabled && i.gstRate > 0) {
          throw new BadRequestException(
            'GST not enabled for this shop. GST rate must be 0.',
          );
        }

        // Validate GST rate range (already validated by DTO, but defensive)
        if (i.gstRate < 0 || i.gstRate > 100) {
          throw new BadRequestException(
            `Invalid GST rate: ${i.gstRate}. Must be 0-100%.`,
          );
        }

        // Validate GST amount is reasonable (defensive check)
        const lineSubtotal = i.rate * i.quantity;
        let expectedGst: number;

        if (dto.pricesIncludeTax) {
          // Price includes GST, extract GST from total
          const divisor = 1 + i.gstRate / 100;
          const base = lineSubtotal / divisor;
          expectedGst = Math.round(lineSubtotal - base);
        } else {
          // Price excludes GST, calculate GST on subtotal
          expectedGst = Math.round((lineSubtotal * i.gstRate) / 100);
        }

        if (Math.abs(i.gstAmount - expectedGst) > 1) {
          // Allow 1 rupee tolerance for rounding
          throw new BadRequestException(
            `GST amount mismatch for product ${i.shopProductId}. Expected ~${expectedGst}, got ${i.gstAmount}.`,
          );
        }

        subTotal += lineSubtotal;
        gstAmount += i.gstAmount;

        return {
          shopProductId: i.shopProductId,
          quantity: i.quantity,
          rate: i.rate,
          hsnCode: '', // Optional: can populate from product if needed
          gstRate: i.gstRate,
          gstAmount: i.gstAmount,
          lineTotal: lineSubtotal + i.gstAmount,
        };
      });

      // 7️⃣ Delete old invoice items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: oldInvoice.id } });

      // 8️⃣ Update invoice with new data
      const updatedInvoice = await tx.invoice.update({
        where: { id: oldInvoice.id },
        data: {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          subTotal,
          gstAmount,
          totalAmount: subTotal + gstAmount,
          paymentMode:
            dto.paymentMethods?.[0]?.mode || dto.paymentMode || 'CASH',
          items: { create: invoiceItemsData },
        },
        include: { items: true },
      });

      // 9️⃣ Create new financial entries for each payment method
      if (dto.paymentMethods && dto.paymentMethods.length > 0) {
        const financialEntries = dto.paymentMethods.map((pm) => ({
          tenantId,
          shopId: dto.shopId,
          type: 'IN' as const,
          amount: pm.amount,
          mode: pm.mode,
          referenceType: 'INVOICE' as const,
          referenceId: updatedInvoice.id,
          note: 'Invoice updated - new entry',
        }));
        await tx.financialEntry.createMany({ data: financialEntries });
      } else {
        // Fallback for old paymentMode format
        await tx.financialEntry.create({
          data: {
            tenantId,
            shopId: dto.shopId,
            type: 'IN',
            amount: subTotal + gstAmount,
            mode: dto.paymentMode || 'CASH',
            referenceType: 'INVOICE',
            referenceId: updatedInvoice.id,
            note: 'Invoice updated - new entry',
          },
        });
      }

      // 🔟 Create new stock entries (OUT) using StockService with InvoiceItem.id
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const invoiceItem = updatedInvoice.items[i];
        const isSerialized = productSerializedMap.get(item.shopProductId);
        await this.stockService.recordStockOut(
          tenantId,
          dto.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          invoiceItem.id,
          undefined,
          isSerialized ? item.imeis : undefined,
        );
      }

      // 🔟.5️⃣ Link new IMEIs to updated invoice and mark SOLD
      if (newAllImeis.length > 0) {
        await tx.iMEI.updateMany({
          where: { imei: { in: newAllImeis } },
          data: {
            invoiceId: updatedInvoice.id,
            status: IMEIStatus.SOLD,
            soldAt: new Date(),
          },
        });
      }

      return updatedInvoice;
    });
  }

  async cancelInvoice(tenantId: string, invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch invoice with items
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }

      if (invoice.status === 'CANCELLED') {
        throw new BadRequestException('Invoice already cancelled');
      }

      // 2️⃣ Mark invoice as cancelled
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // 2️⃣.5️⃣ Revert IMEI links (mark as available again)
      // ✅ FIX: Reset status to IN_STOCK and clear soldAt
      await tx.iMEI.updateMany({
        where: { invoiceId: invoice.id },
        data: {
          invoiceId: null,
          status: IMEIStatus.IN_STOCK,
          soldAt: null,
        },
      });

      // 3️⃣ Reverse stock (IN) using StockService with InvoiceItem.id
      for (const item of invoice.items) {
        await this.stockService.recordStockIn(
          tenantId,
          invoice.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          item.id,
        );
      }

      // 4️⃣ Reverse financial entry (OUT)
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: invoice.shopId,
          type: 'OUT',
          amount: invoice.totalAmount,
          mode: invoice.paymentMode,
          referenceType: 'INVOICE',
          referenceId: invoice.id,
          note: 'Invoice cancelled',
        },
      });

      return { success: true };
    });
  }
  async getInvoiceDetails(tenantId: string, invoiceId: string) {
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        receipts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            transactionRef: true,
            createdAt: true,
            printNumber: true,
          },
        },
        items: {
          select: {
            shopProductId: true,
            quantity: true,
            rate: true,
            hsnCode: true,
            gstRate: true,
            gstAmount: true,
            lineTotal: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    // Calculate payment summary
    const paidAmount = invoice.receipts.reduce(
      (sum, receipt) => sum + receipt.amount,
      0,
    );
    const balanceAmount = invoice.totalAmount - paidAmount;

    // Derive payment status
    let paymentStatus = 'UNPAID';
    if (balanceAmount <= 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    // Convert paisa back to rupees for values stored with decimal precision
    const fromPaisa = (paisa: number) => paisa / 100;

    return {
      id: invoice.id,
      shopId: invoice.shopId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerGstin: invoice.customerGstin,
      customerState: invoice.customerState,

      subTotal: fromPaisa(invoice.subTotal), // Convert from paisa
      gstAmount: fromPaisa(invoice.gstAmount), // Convert from paisa
      cgst: invoice.cgst ? fromPaisa(invoice.cgst) : undefined,
      sgst: invoice.sgst ? fromPaisa(invoice.sgst) : undefined,
      igst: invoice.igst ? fromPaisa(invoice.igst) : undefined,
      totalAmount: invoice.totalAmount,
      paymentMode: invoice.paymentMode,

      // ✅ NEW: Payment summary
      paidAmount: paidAmount,
      balanceAmount: balanceAmount,
      paymentStatus,

      // ✅ NEW: Payment history
      payments: invoice.receipts.map((receipt) => ({
        id: receipt.id,
        amount: receipt.amount,
        method: receipt.paymentMethod,
        transactionRef: receipt.transactionRef,
        createdAt: receipt.createdAt,
        receiptNumber: receipt.printNumber,
      })),

      items: invoice.items.map((item) => {
        // Calculate accurate taxableValue
        const lineTotal = item.lineTotal || 0;
        const gstAmount = fromPaisa(item.gstAmount || 0);
        const taxableValue = Math.round((lineTotal - gstAmount) * 100) / 100;

        return {
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          hsnCode: item.hsnCode || undefined,
          gstRate: item.gstRate || undefined,
          gstAmount,
          lineTotal,
          taxableValue,
        };
      }),
    };
  }

  /**
   * Public invoice verification (limited data, no auth)
   */
  async getPublicInvoiceVerification(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        totalAmount: true,
        status: true,
        shop: {
          select: {
            name: true,
            phone: true,
          },
        },
        items: {
          select: {
            quantity: true,
            rate: true,
            lineTotal: true,
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      shopName: invoice.shop.name,
      shopPhone: invoice.shop.phone,
      items: invoice.items.map((item) => ({
        description: item.product.name,
        quantity: item.quantity,
        rate: item.rate,
        total: item.lineTotal,
      })),
    };
  }

  /**
   * Get sales summary for a shop within a date range
   * Returns aggregated sales, payments, and pending amounts
   * Used for dashboard reports and financial summaries
   */
  async getSalesSummary(
    tenantId: string,
    shopId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Validate shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });

    if (!shop) {
      throw new BadRequestException('Invalid shop');
    }

    // Default to current month if no date range provided
    const now = new Date();
    const defaultStart =
      startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd =
      endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ✅ Aggregate invoices
    const invoiceStats = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        shopId,
        invoiceDate: {
          gte: defaultStart,
          lte: defaultEnd,
        },
        status: { not: 'CANCELLED' },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // ✅ Aggregate receipts by payment method
    const paymentStats = await this.prisma.receipt.findMany({
      where: {
        tenantId,
        shopId,
        createdAt: {
          gte: defaultStart,
          lte: defaultEnd,
        },
        status: 'ACTIVE',
        linkedInvoiceId: {
          not: null, // Only count invoice payments
        },
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    // Calculate totals by payment method
    const byMethod = paymentStats.reduce(
      (acc, receipt) => {
        if (!acc[receipt.paymentMethod]) {
          acc[receipt.paymentMethod] = 0;
        }
        acc[receipt.paymentMethod] += receipt.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalSales = invoiceStats._sum.totalAmount || 0;
    const cashReceived = byMethod['CASH'] || 0;
    const upiReceived = byMethod['UPI'] || 0;
    const cardReceived = byMethod['CARD'] || 0;
    const bankReceived = byMethod['BANK'] || 0;
    const totalReceived =
      cashReceived + upiReceived + cardReceived + bankReceived;
    const pendingAmount = totalSales - totalReceived;

    return {
      period: {
        startDate: defaultStart,
        endDate: defaultEnd,
      },
      summary: {
        totalSales,
        totalInvoices: invoiceStats._count,
        totalReceived,
        pendingAmount,
      },
      breakdown: {
        cashReceived,
        upiReceived,
        cardReceived,
        bankReceived,
      },
    };
  }
}
