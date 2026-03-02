import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GRNStatus, POStatus, UserRole, Prisma } from '@prisma/client';
import { CreateGRNDto } from './dto/grn/create-grn.dto';
import { GRNResponseDto } from './dto/grn/grn.response.dto';
import { StockService } from '../stock/stock.service';

@Injectable()
export class GRNService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  /**
   * Create a DRAFT GRN
   */
  async create(tenantId: string, dto: CreateGRNDto): Promise<GRNResponseDto> {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: dto.poId },
      include: { items: true },
    });

    if (!po || po.tenantId !== tenantId) {
      throw new NotFoundException(`Purchase Order "${dto.poId}" not found`);
    }

    // Check for duplicate GRN number in the shop
    const existingGRN = await this.prisma.gRN.findFirst({
      where: { shopId: dto.shopId, grnNumber: dto.grnNumber },
    });

    if (existingGRN) {
      throw new ConflictException(`GRN "${dto.grnNumber}" already exists`);
    }

    const grn = await this.prisma.gRN.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        poId: dto.poId,
        grnNumber: dto.grnNumber,
        receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : new Date(),
        status: GRNStatus.DRAFT,
        isVarianceOverridden: dto.isVarianceOverridden || false,
        overrideNote: dto.overrideNote,
        items: {
          create: dto.items.map((item) => ({
            poItemId: item.poItemId,
            shopProductId: item.shopProductId,
            receivedQuantity: item.receivedQuantity,
            confirmedPrice: item.confirmedPrice,
            uom: item.uom || 'pcs',
          })),
        },
      },
      include: { items: true },
    });

    return this.mapToResponseDto(grn);
  }

  /**
   * CRITICAL HARDENING: Confirm GRN (Stock-Driving)
   */
  async confirm(
    tenantId: string,
    id: string,
    user: { id: string; role: string },
  ): Promise<GRNResponseDto> {
    const grn = await this.prisma.gRN.findUnique({
      where: { id },
      include: { items: true, po: { include: { items: true } } },
    });

    if (!grn || grn.tenantId !== tenantId) {
      throw new NotFoundException('GRN not found');
    }

    if (grn.status !== GRNStatus.DRAFT) {
      throw new BadRequestException(`GRN already ${grn.status}`);
    }

    // Sort items by shopProductId to prevent deadlocks during row locking
    const sortedItems = [...grn.items].sort((a, b) =>
      a.shopProductId.localeCompare(b.shopProductId),
    );

    return await this.prisma.$transaction(async (tx) => {
      // 1. Double check GRN status inside transaction
      const currentGrn = await tx.gRN.findUnique({ where: { id } });
      if (currentGrn?.status !== GRNStatus.DRAFT) {
        throw new ConflictException('GRN already processed');
      }

      for (const item of sortedItems) {
        // 2. Row Lock ShopProduct (Explicit FOR UPDATE)
        // Using raw SQL for the lock
        const products = await tx.$queryRaw<any[]>`
          SELECT id, quantity, "totalValue", "lastPurchasePrice"
          FROM mb_shop_product
          WHERE id = ${item.shopProductId}
          FOR UPDATE
        `;

        if (products.length === 0) {
          throw new NotFoundException(`Product ${item.shopProductId} not found`);
        }

        const product = products[0];
        const confirmedPrice = item.confirmedPrice || 0;

        // 3. Variance Check (20% Threshold)
        if (confirmedPrice > 1.2 * (product.lastPurchasePrice || 0)) {
          if (!grn.isVarianceOverridden) {
            throw new BadRequestException(
              `Significant price variance detected for product ${product.id}. Owner override required.`,
            );
          }
          if (user.role !== 'OWNER') {
            throw new ForbiddenException(
              'Only OWNER can confirm GRN with high price variance.',
            );
          }
        }

        // 4. Recalculate WAC & Update Stock
        const currentQuantity = Number(product.quantity);
        const currentTotalValue = BigInt(product.totalValue);
        
        const newTotalQuantity = currentQuantity + item.receivedQuantity;
        const addedValue = BigInt(confirmedPrice) * BigInt(item.receivedQuantity);
        const newTotalValue = currentTotalValue + addedValue;

        // WAC (weighted average cost) for avgCost field
        let newAvgCost = 0;
        if (newTotalQuantity > 0) {
          newAvgCost = Math.round(Number(newTotalValue / BigInt(newTotalQuantity)));
        }

        // 5. Update ShopProduct
        await tx.shopProduct.update({
          where: { id: item.shopProductId },
          data: {
            quantity: newTotalQuantity,
            totalValue: newTotalValue,
            lastPurchasePrice: confirmedPrice,
            avgCost: newAvgCost,
          },
        });

        // 6. Record Stock Ledger
        await tx.stockLedger.create({
          data: {
            tenantId,
            shopId: grn.shopId,
            shopProductId: item.shopProductId,
            type: 'IN',
            quantity: item.receivedQuantity,
            referenceType: 'PURCHASE', // Or add 'GRN' to StockRefType
            referenceId: grn.id,
            costPerUnit: confirmedPrice,
            note: `GRN: ${grn.grnNumber}`,
          },
        });

        // 7. Update PO Item received quantity
        await tx.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: {
            receivedQuantity: { increment: item.receivedQuantity },
          },
        });
      }

      // 8. Update PO Status
      const poItems = await tx.purchaseOrderItem.findMany({
        where: { poId: grn.poId },
      });

      const allItemsReceived = poItems.every(
        (pi) => pi.receivedQuantity >= pi.quantity,
      );

      await tx.purchaseOrder.update({
        where: { id: grn.poId },
        data: {
          status: allItemsReceived ? POStatus.RECEIVED : POStatus.PARTIALLY_RECEIVED,
        },
      });

      // 9. Finalize GRN
      const updatedGrn = await tx.gRN.update({
        where: { id },
        data: {
          status: GRNStatus.CONFIRMED,
          overriddenBy: grn.isVarianceOverridden ? user.id : null,
        },
        include: { items: true },
      });

      return this.mapToResponseDto(updatedGrn);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000,
    });
  }

  /**
   * Find GRNs
   */
  async findAll(tenantId: string, shopId?: string) {
    return this.prisma.gRN.findMany({
      where: { tenantId, ...(shopId && { shopId }) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find single GRN
   */
  async findOne(tenantId: string, id: string) {
    const grn = await this.prisma.gRN.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!grn) throw new NotFoundException('GRN not found');
    return this.mapToResponseDto(grn);
  }

  /**
   * Map to DTO
   */
  private mapToResponseDto(grn: any): GRNResponseDto {
    return {
      id: grn.id,
      tenantId: grn.tenantId,
      shopId: grn.shopId,
      poId: grn.poId,
      grnNumber: grn.grnNumber,
      receivedDate: grn.receivedDate,
      status: grn.status,
      isVarianceOverridden: grn.isVarianceOverridden,
      overrideNote: grn.overrideNote,
      overriddenBy: grn.overriddenBy,
      createdAt: grn.createdAt,
      updatedAt: grn.updatedAt,
      items: grn.items.map((item: any) => ({
        id: item.id,
        poItemId: item.poItemId,
        shopProductId: item.shopProductId,
        receivedQuantity: item.receivedQuantity,
        confirmedPrice: item.confirmedPrice,
        uom: item.uom,
      })),
    };
  }
}
