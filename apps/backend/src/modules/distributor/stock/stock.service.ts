import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // STOCK VISIBILITY — ERP user configures what distributor can see
  // ─────────────────────────────────────────────

  /** ERP user: get current visibility settings for a distributor link */
  async getVisibilitySettings(tenantId: string, distributorId: string) {
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId, retailerId: tenantId } },
      include: { stockVisibility: true },
    });
    if (!link) throw new NotFoundException('No active link with this distributor');

    return {
      linkId: link.id,
      stockVisibilityEnabled: link.stockVisibilityEnabled,
      settings: link.stockVisibility ?? { allowAllProducts: false, allowedCategories: [], allowedBrands: [] },
    };
  }

  /** ERP user: update stock visibility settings */
  async updateVisibilitySettings(
    tenantId: string,
    distributorId: string,
    dto: { stockVisibilityEnabled: boolean; allowAllProducts?: boolean; allowedCategories?: string[]; allowedBrands?: string[] },
  ) {
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId, retailerId: tenantId } },
    });
    if (!link || link.status !== 'ACTIVE') throw new NotFoundException('No active link with this distributor');

    await this.prisma.distDistributorRetailer.update({
      where: { id: link.id },
      data: { stockVisibilityEnabled: dto.stockVisibilityEnabled },
    });

    if (dto.stockVisibilityEnabled) {
      await this.prisma.distStockVisibility.upsert({
        where: { linkId: link.id },
        create: {
          linkId: link.id,
          allowAllProducts: dto.allowAllProducts ?? false,
          allowedCategories: dto.allowedCategories ?? [],
          allowedBrands: dto.allowedBrands ?? [],
        },
        update: {
          allowAllProducts: dto.allowAllProducts ?? false,
          allowedCategories: dto.allowedCategories ?? [],
          allowedBrands: dto.allowedBrands ?? [],
        },
      });
    }

    return { updated: true };
  }

  /** Distributor: view allowed stock data for a linked retailer */
  async getRetailerStock(distributorId: string, retailerId: string) {
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId, retailerId } },
      include: { stockVisibility: true },
    });

    if (!link || link.status !== 'ACTIVE') throw new ForbiddenException('No active link with this retailer');
    if (!link.stockVisibilityEnabled) {
      return { visible: false, reason: 'Retailer has not granted stock visibility' };
    }

    const visibility = link.stockVisibility;
    if (!visibility) return { visible: true, products: [] };

    // Query retailer's inventory (ShopProduct with stock)
    // Filter by allowed brands/categories if not allowAll
    const where: any = { tenantId: retailerId, isActive: true };
    if (!visibility.allowAllProducts) {
      const orFilters: any[] = [];
      if (visibility.allowedBrands && visibility.allowedBrands.length > 0) {
        orFilters.push(...visibility.allowedBrands.map((b: string) => ({
          brand: { equals: b, mode: 'insensitive' as const },
        })));
      }
      if (visibility.allowedCategories && visibility.allowedCategories.length > 0) {
        orFilters.push(...visibility.allowedCategories.map((c: string) => ({
          category: { equals: c, mode: 'insensitive' as const },
        })));
      }
      if (orFilters.length > 0) {
        where.OR = orFilters;
      } else {
        // Nothing allowed — return empty
        return { visible: true, allowAllProducts: false, allowedBrands: visibility.allowedBrands, allowedCategories: visibility.allowedCategories, products: [], lowStockCount: 0 };
      }
    }

    const products = await this.prisma.shopProduct.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        brand: true,
        quantity: true,
        reorderLevel: true,
      },
      orderBy: { quantity: 'asc' }, // Low stock first
      take: 100,
    });

    return {
      visible: true,
      allowAllProducts: visibility.allowAllProducts,
      allowedCategories: visibility.allowedCategories,
      allowedBrands: visibility.allowedBrands,
      products,
      lowStockCount: products.filter(p => p.reorderLevel != null && p.quantity <= p.reorderLevel).length,
    };
  }

  /** ERP user: get distinct brands and categories from their inventory */
  async getProductMeta(tenantId: string) {
    const products = await this.prisma.shopProduct.findMany({
      where: { tenantId, isActive: true },
      select: { brand: true, category: true },
    });
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort() as string[];
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort() as string[];
    return { brands, categories };
  }

  // ─────────────────────────────────────────────
  // REFILL REQUESTS — Distributor suggests restocking
  // ─────────────────────────────────────────────

  /** Distributor: create a refill suggestion for a retailer */
  async createRefillRequest(
    distributorId: string,
    retailerId: string,
    dto: { items: { catalogItemId: string; suggestedQty: number }[]; notes?: string },
  ) {
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId, retailerId } },
    });
    if (!link || link.status !== 'ACTIVE') throw new ForbiddenException('No active link with this retailer');

    if (!dto.items?.length) throw new BadRequestException('At least one item required');

    // Verify all catalogItems belong to this distributor
    const itemIds = dto.items.map(i => i.catalogItemId);
    const catalogItems = await this.prisma.distCatalogItem.findMany({
      where: { id: { in: itemIds }, distributorId, isActive: true },
      select: { id: true },
    });
    if (catalogItems.length !== itemIds.length) {
      throw new BadRequestException('One or more catalog items not found');
    }

    return this.prisma.distRefillRequest.create({
      data: {
        linkId: link.id,
        notes: dto.notes,
        items: {
          create: dto.items.map(item => ({
            catalogItemId: item.catalogItemId,
            suggestedQty: item.suggestedQty,
          })),
        },
      },
      include: {
        items: { include: { catalogItem: { select: { name: true, unitPrice: true } } } },
      },
    });
  }

  /** ERP user: list incoming refill requests from their distributor */
  async listRefillRequests(tenantId: string, distributorId?: string) {
    const links = await this.prisma.distDistributorRetailer.findMany({
      where: {
        retailerId: tenantId,
        status: 'ACTIVE',
        ...(distributorId ? { distributorId } : {}),
      },
      select: { id: true },
    });

    const linkIds = links.map(l => l.id);
    return this.prisma.distRefillRequest.findMany({
      where: { linkId: { in: linkIds } },
      include: {
        link: {
          include: { distributor: { select: { name: true, referralCode: true } } },
        },
        items: {
          include: { catalogItem: { select: { id: true, name: true, sku: true, unitPrice: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** ERP user: respond to a refill request (accept with optional qty adjustments, or reject) */
  async respondToRefillRequest(
    tenantId: string,
    requestId: string,
    dto: {
      accept: boolean;
      adjustedItems?: { itemId: string; acceptedQty: number }[];
    },
  ) {
    const request = await this.prisma.distRefillRequest.findUnique({
      where: { id: requestId },
      include: {
        link: true,
        items: { include: { catalogItem: true } },
      },
    });

    if (!request) throw new NotFoundException('Refill request not found');
    if (request.link.retailerId !== tenantId) throw new ForbiddenException('Not your request');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is no longer pending');

    if (!dto.accept) {
      return this.prisma.distRefillRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });
    }

    // Accept — apply quantity adjustments if any
    const updates = dto.adjustedItems ?? [];
    const itemUpdates = request.items.map(item => {
      const adj = updates.find(u => u.itemId === item.id);
      return { id: item.id, acceptedQty: adj?.acceptedQty ?? item.suggestedQty };
    });

    // Create a DistPurchaseOrder from this acceptance
    const total = itemUpdates.reduce((sum, item) => {
      const catalogItem = request.items.find(ri => ri.id === item.id)?.catalogItem;
      return sum + (catalogItem ? Number(catalogItem.unitPrice) * item.acceptedQty : 0);
    }, 0);

    const orderNumber = `RFR-${Date.now().toString(36).toUpperCase()}`;

    const txResults = await this.prisma.$transaction([
      // Update each item's acceptedQty
      ...itemUpdates.map(u =>
        this.prisma.distRefillRequestItem.update({
          where: { id: u.id },
          data: { acceptedQty: u.acceptedQty },
        }),
      ),
      // Create a purchase order (always last in the array)
      this.prisma.distPurchaseOrder.create({
        data: {
          distributorId: request.link.distributorId,
          retailerId: tenantId,
          orderNumber,
          totalAmount: total,
          status: 'CONFIRMED',
          notes: `Refill request ${requestId}`,
          items: {
            create: request.items.map(item => {
              const adj = itemUpdates.find(u => u.id === item.id);
              return {
                catalogItemId: item.catalogItemId,
                quantityOrdered: adj?.acceptedQty ?? item.suggestedQty,
                unitPriceAtOrder: item.catalogItem.unitPrice,
              };
            }),
          },
        },
      }),
    ]);
    const purchaseOrder = txResults[txResults.length - 1] as any;

    // Link refill request to purchase order and mark accepted
    await this.prisma.distRefillRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED', purchaseOrderId: purchaseOrder.id },
    });

    return { accepted: true, purchaseOrder };
  }

  /** Distributor: list refill requests for a specific retailer */
  async listRefillRequestsForDistributor(distributorId: string, retailerId: string) {
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: { distributorId_retailerId: { distributorId, retailerId } },
    });
    if (!link) throw new NotFoundException('No link found');

    return this.prisma.distRefillRequest.findMany({
      where: { linkId: link.id },
      include: {
        items: {
          include: { catalogItem: { select: { name: true, sku: true, unitPrice: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
