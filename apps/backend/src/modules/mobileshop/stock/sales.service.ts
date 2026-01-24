import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(tenantId: string, dto: SalesInvoiceDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      const lastInvoice = await tx.invoice.findFirst({
        where: { shopId: dto.shopId },
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true },
      });

      const nextNumber = lastInvoice
        ? Number(lastInvoice.invoiceNumber) + 1
        : 1;

      const invoiceNumber = nextNumber.toString().padStart(5, '0');
      dto.invoiceNumber = invoiceNumber;
      // validate shop
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true, gstEnabled: true },
      });

      if (!shop) throw new BadRequestException('Invalid shop');

      // fetch products for validation (no longer need HSN for GST calc)
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
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
        const expectedGst = Math.round((lineSubtotal * i.gstRate) / 100);
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

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          invoiceNumber: invoiceNumber,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          subTotal,
          gstAmount,
          totalAmount: subTotal + gstAmount,
          paymentMode: dto.paymentMode,
          items: { create: invoiceItemsData },
        },
      });
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          type: 'IN',
          amount: subTotal + gstAmount,
          mode: dto.paymentMode,
          referenceType: 'INVOICE',
          referenceId: invoice.id,
        },
      });

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
      throw new BadRequestException('Invalid shop');
    }

    return this.prisma.invoice.findMany({
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
        totalAmount: true,
        paymentMode: true,
        status: true,
        invoiceDate: true,
      },
    });
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

      // 5️⃣ Fetch new products for validation (no longer need HSN for GST calc)
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
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
        const expectedGst = Math.round((lineSubtotal * i.gstRate) / 100);
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
          paymentMode: dto.paymentMode,
          items: { create: invoiceItemsData },
        },
        include: { items: true },
      });

      // 9️⃣ Create new financial entry (IN)
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          type: 'IN',
          amount: subTotal + gstAmount,
          mode: dto.paymentMode,
          referenceType: 'INVOICE',
          referenceId: updatedInvoice.id,
          note: 'Invoice updated - new entry',
        },
      });

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
