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
      // validate shop
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true },
      });
      if (!shop) throw new BadRequestException('Invalid shop');

      // fetch products with HSN
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
          global: {
            select: {
              hsn: { select: { code: true, taxRate: true } },
            },
          },
        },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // calculate totals
      let subTotal = 0;
      let gstAmount = 0;

      const itemMap = new Map(products.map((p) => [p.id, p]));

      const invoiceItemsData = dto.items.map((i) => {
        const prod = itemMap.get(i.shopProductId);
        const gstRate = prod?.global?.hsn?.taxRate ?? 0;
        const lineTotal = i.rate * i.quantity;
        const gst = Math.round((lineTotal * gstRate) / 100);

        subTotal += lineTotal;
        gstAmount += gst;

        return {
          shopProductId: i.shopProductId,
          quantity: i.quantity,
          rate: i.rate,
          hsnCode: prod?.global?.hsn?.code ?? '',
          gstRate,
          gstAmount: gst,
          lineTotal: lineTotal + gst,
        };
      });

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          invoiceNumber: dto.invoiceNumber,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          subTotal,
          gstAmount,
          totalAmount: subTotal + gstAmount,
          paymentMode: dto.paymentMode,
          items: { create: invoiceItemsData },
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
}
