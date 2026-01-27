import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

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

      // Generate formatted invoice number: {prefix}-{DDMMYY}-{sequence}
      const today = new Date();
      const dateStr =
        String(today.getDate()).padStart(2, '0') +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getFullYear()).slice(-2);

      // Find last invoice for today's date to get sequence number
      const lastInvoiceToday = await tx.invoice.findFirst({
        where: {
          shopId: dto.shopId,
          invoiceNumber: { startsWith: `${shop.invoicePrefix}-${dateStr}` },
        },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      // Extract sequence number from last invoice or start at 1
      let sequenceNumber = 1;
      if (lastInvoiceToday) {
        const parts = lastInvoiceToday.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        sequenceNumber = lastSeq + 1;
      }

      const invoiceNumber = `${shop.invoicePrefix}-${dateStr}-${String(sequenceNumber).padStart(4, '0')}`;
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
        select: { id: true, type: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // Build product type map
      const productTypeMap = new Map(products.map((p) => [p.id, p.type]));

      // Validate IMEI for GOODS products and collect IMEIs
      const allImeis: string[] = [];
      const imeisByProduct = new Map<string, string[]>();

      for (const item of dto.items) {
        const productType = productTypeMap.get(item.shopProductId);
        if (productType === ProductType.GOODS && item.imeis?.length) {
          if (!item.imeis?.length) {
            throw new BadRequestException(
              `IMEIs required for goods product ${item.shopProductId}`,
            );
          }
          if (item.quantity !== item.imeis.length) {
            throw new BadRequestException(
              `Quantity (${item.quantity}) must match IMEI count (${item.imeis.length})`,
            );
          }
          allImeis.push(...item.imeis);
          imeisByProduct.set(item.shopProductId, item.imeis);
        }
      }

      // Validate IMEI availability (must exist and not be sold)
      if (allImeis.length > 0) {
        const imeiRecords = await tx.iMEI.findMany({
          where: {
            imei: { in: allImeis },
            tenantId,
          },
          select: { imei: true, shopProductId: true, invoiceId: true },
        });

        if (imeiRecords.length !== allImeis.length) {
          throw new BadRequestException('One or more IMEIs not found');
        }

        // Validate IMEIs belong to correct products and are not sold
        for (const record of imeiRecords) {
          const expectedProductId = Array.from(imeisByProduct.entries()).find(
            ([_, imeis]) => imeis.includes(record.imei),
          )?.[0];
          if (record.shopProductId !== expectedProductId) {
            throw new BadRequestException(
              `IMEI ${record.imei} does not belong to product ${expectedProductId}`,
            );
          }
          if (record.invoiceId) {
            throw new BadRequestException(
              `IMEI ${record.imei} already sold on invoice`,
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

      // STOCK OUT (negative allowed)
      const stockOutEntries = dto.items.map((i) => ({
        tenantId,
        shopId: dto.shopId,
        shopProductId: i.shopProductId,
        type: 'OUT' as const,
        quantity: i.quantity,
        referenceType: 'SALE' as const,
        referenceId: invoice.id,
      }));

      await tx.stockLedger.createMany({ data: stockOutEntries });

      // Link IMEIs to invoice (marks them as sold via reference)
      if (allImeis.length > 0) {
        await tx.iMEI.updateMany({
          where: { imei: { in: allImeis } },
          data: { invoiceId: invoice.id },
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

      // 3️⃣ Reverse old stock (IN)
      const oldStockInEntries = oldInvoice.items.map((item) => ({
        tenantId,
        shopId: oldInvoice.shopId,
        shopProductId: item.shopProductId,
        type: 'IN' as const,
        quantity: item.quantity,
        referenceType: 'SALE' as const,
        referenceId: oldInvoice.id,
        note: 'Invoice updated - reverse old',
      }));

      await tx.stockLedger.createMany({ data: oldStockInEntries });

      // 3️⃣.5️⃣ Revert old IMEI links (mark as available again)
      await tx.iMEI.updateMany({
        where: { invoiceId: oldInvoice.id },
        data: { invoiceId: null },
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

      // 5️⃣ Fetch new products for validation + type checking
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true, type: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // Build product type map
      const productTypeMap = new Map(products.map((p) => [p.id, p.type]));

      // Validate IMEI for MOBILE products and collect IMEIs
      const newAllImeis: string[] = [];
      const newImeisByProduct = new Map<string, string[]>();

      for (const item of dto.items) {
        const productType = productTypeMap.get(item.shopProductId);
        if (productType === ProductType.GOODS && item.imeis?.length) {
          if (!item.imeis?.length) {
            throw new BadRequestException(
              `IMEIs required for goods product ${item.shopProductId}`,
            );
          }
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

      // 🔟 Create new stock entries (OUT)
      const newStockOutEntries = dto.items.map((i) => ({
        tenantId,
        shopId: dto.shopId,
        shopProductId: i.shopProductId,
        type: 'OUT' as const,
        quantity: i.quantity,
        referenceType: 'SALE' as const,
        referenceId: updatedInvoice.id,
        note: 'Invoice updated - new stock',
      }));

      await tx.stockLedger.createMany({ data: newStockOutEntries });

      // 🔟.5️⃣ Link new IMEIs to updated invoice
      if (newAllImeis.length > 0) {
        await tx.iMEI.updateMany({
          where: { imei: { in: newAllImeis } },
          data: { invoiceId: updatedInvoice.id },
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
      await tx.iMEI.updateMany({
        where: { invoiceId: invoice.id },
        data: { invoiceId: null },
      });

      // 3️⃣ Reverse stock (IN)
      const stockInEntries = invoice.items.map((item) => ({
        tenantId,
        shopId: invoice.shopId,
        shopProductId: item.shopProductId,
        type: 'IN' as const,
        quantity: item.quantity,
        referenceType: 'SALE' as const,
        referenceId: invoice.id,
        note: 'Invoice cancelled',
      }));

      await tx.stockLedger.createMany({
        data: stockInEntries,
      });

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
}
