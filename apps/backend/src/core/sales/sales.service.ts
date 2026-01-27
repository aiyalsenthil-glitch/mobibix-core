import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductType, IMEIStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';
import {
  generateSalesInvoiceNumber,
  getFinancialYear,
} from '../../common/utils/invoice-number.util';

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

      if (!shop) throw new BadRequestException('Invalid shop');

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

      // 🔒 VALIDATE GST (frontend-calculated)
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

      // Calculate CGST/SGST/IGST based on shop and customer state
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (dto.customerState && shop.state) {
        if (shop.state === dto.customerState) {
          // Intra-state: CGST + SGST
          cgst = Math.round(gstAmount / 2);
          sgst = Math.round(gstAmount / 2);
        } else {
          // Inter-state: IGST
          igst = gstAmount;
        }
      } else {
        // Default to intra-state if customer state not provided
        cgst = Math.round(gstAmount / 2);
        sgst = Math.round(gstAmount / 2);
      }

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
          subTotal,
          gstAmount,
          cgst,
          sgst,
          igst,
          totalAmount: subTotal + gstAmount,
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
            amount: subTotal + gstAmount,
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
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        totalAmount: true,
        paymentMode: true,
        status: true,
        invoiceDate: true,
      },
    });

    return { invoices, empty: false };
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
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        invoiceDate: true,
        customerName: true,
        customerPhone: true,

        subTotal: true,
        gstAmount: true,
        totalAmount: true,
        paymentMode: true,

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

    return invoice;
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
}
