import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto, UpdateStockDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(distributorId: string) {
    return this.prisma.distCatalogItem.findMany({
      where: { distributorId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(distributorId: string, dto: CreateCatalogItemDto) {
    return this.prisma.distCatalogItem.create({
      data: {
        distributorId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        brand: dto.brand,
        category: dto.category,
        unitPrice: dto.unitPrice,
        stockQuantity: dto.stockQuantity ?? 0,
        images: dto.images ?? [],
        compatibility: dto.compatibility,
      },
    });
  }

  async update(distributorId: string, itemId: string, dto: UpdateCatalogItemDto) {
    await this.assertOwnership(distributorId, itemId);
    return this.prisma.distCatalogItem.update({
      where: { id: itemId },
      data: {
        ...(dto.sku !== undefined && { sku: dto.sku }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.stockQuantity !== undefined && { stockQuantity: dto.stockQuantity }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.compatibility !== undefined && { compatibility: dto.compatibility }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deactivate(distributorId: string, itemId: string) {
    await this.assertOwnership(distributorId, itemId);
    return this.prisma.distCatalogItem.update({
      where: { id: itemId },
      data: { isActive: false },
    });
  }

  async adjustStock(distributorId: string, itemId: string, dto: UpdateStockDto) {
    await this.assertOwnership(distributorId, itemId);
    const item = await this.prisma.distCatalogItem.findUnique({ where: { id: itemId } });
    const newQty = item!.stockQuantity + dto.adjustment;
    if (newQty < 0) throw new BadRequestException('Stock cannot go below zero');
    return this.prisma.distCatalogItem.update({
      where: { id: itemId },
      data: { stockQuantity: newQty },
    });
  }

  private async assertOwnership(distributorId: string, itemId: string) {
    const item = await this.prisma.distCatalogItem.findFirst({
      where: { id: itemId, distributorId },
    });
    if (!item) throw new NotFoundException('Catalog item not found');
  }

  /** Retailer-facing: browse a distributor's active catalog (requires active link) */
  async browseForRetailer(distributorId: string) {
    return this.prisma.distCatalogItem.findMany({
      where: { distributorId, isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        brand: true,
        category: true,
        unitPrice: true,
        stockQuantity: true,
        images: true,
        compatibility: true,
      },
      orderBy: { brand: 'asc' },
    });
  }
}
