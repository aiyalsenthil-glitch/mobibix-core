import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  async stockIn(tenantId: string, dto: PurchaseStockInDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // validate shop belongs to tenant
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true },
      });

      if (!shop) {
        throw new BadRequestException('Invalid shop');
      }

      // validate products and build maps
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

      const productMap = new Map(products.map((p) => [p.id, p.type]));

      const imeisToInsert: { imei: string; shopProductId: string }[] = [];
      const ledgerEntries: {
        tenantId: string;
        shopId: string;
        shopProductId: string;
        type: 'IN';
        quantity: number;
        referenceType: 'PURCHASE';
        referenceId: string | null;
        note: string | null;
      }[] = [];

      for (const item of dto.items) {
        const productType = productMap.get(item.shopProductId);
        if (!productType) {
          throw new BadRequestException('Invalid product in items');
        }

        // Normalize quantity and IMEIs
        if (productType === ProductType.MOBILE) {
          const imeis = item.imeis ?? [];
          if (!imeis.length) {
            throw new BadRequestException('IMEIs required for mobile stock-in');
          }
          if (item.quantity !== undefined && item.quantity !== imeis.length) {
            throw new BadRequestException('Quantity must match IMEI count');
          }
          // Check for duplicate IMEIs in the request for this item
          const uniq = new Set(imeis);
          if (uniq.size !== imeis.length) {
            throw new BadRequestException('Duplicate IMEI in request');
          }
          imeisToInsert.push(
            ...imeis.map((imei) => ({
              imei,
              shopProductId: item.shopProductId,
            })),
          );

          ledgerEntries.push({
            tenantId,
            shopId: dto.shopId,
            shopProductId: item.shopProductId,
            type: 'IN',
            quantity: imeis.length,
            referenceType: 'PURCHASE',
            referenceId: dto.purchaseRef ?? null,
            note: dto.note ?? null,
          });
        } else {
          if (!item.quantity || item.quantity < 1) {
            throw new BadRequestException('Quantity must be provided');
          }

          ledgerEntries.push({
            tenantId,
            shopId: dto.shopId,
            shopProductId: item.shopProductId,
            type: 'IN',
            quantity: item.quantity,
            referenceType: 'PURCHASE',
            referenceId: dto.purchaseRef ?? null,
            note: dto.note ?? null,
          });
        }
      }

      // Validate IMEIs globally
      if (imeisToInsert.length) {
        const allImeis = imeisToInsert.map((i) => i.imei);
        const uniq = new Set(allImeis);
        if (uniq.size !== allImeis.length) {
          throw new BadRequestException('Duplicate IMEI across items');
        }

        const existing = await tx.iMEI.findFirst({
          where: { imei: { in: allImeis } },
          select: { imei: true },
        });

        if (existing) {
          throw new ConflictException('One or more IMEIs already exist');
        }
      }

      await tx.stockLedger.createMany({ data: ledgerEntries });

      if (imeisToInsert.length) {
        await tx.iMEI.createMany({
          data: imeisToInsert.map((i) => ({
            tenantId,
            shopProductId: i.shopProductId,
            imei: i.imei,
          })),
          skipDuplicates: true,
        });
      }

      // OPTIONAL: update last cost price (safe)
      for (const i of dto.items) {
        if (i.costPrice !== undefined) {
          await tx.shopProduct.update({
            where: { id: i.shopProductId },
            data: { costPrice: i.costPrice },
          });
        }
      }

      return { success: true, entries: ledgerEntries.length };
    });
  }
}
