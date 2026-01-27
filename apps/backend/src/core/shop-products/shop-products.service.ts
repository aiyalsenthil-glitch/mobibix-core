import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopProductLinkDto, LinkSource } from './dto/shop-product-link.dto';

@Injectable()
export class ShopProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async linkProductToShop(
    tenantId: string,
    role: string,
    dto: ShopProductLinkDto,
  ) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can link products to shops');
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
    });
    if (!shop || shop.tenantId !== tenantId) {
      throw new NotFoundException('Shop not found for tenant');
    }

    let name = '';
    if (dto.source === LinkSource.GLOBAL) {
      const prod = await this.prisma.globalProduct.findUnique({
        where: { id: dto.productId },
      });
      if (!prod || prod.isActive === false)
        throw new NotFoundException('Global product not found');
      name = prod.name;
      const duplicate = await this.prisma.shopProduct.findFirst({
        where: { shopId: dto.shopId, globalProductId: dto.productId },
      });
      if (duplicate)
        throw new BadRequestException('Product already linked to this shop');
      return await this.prisma.shopProduct.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          globalProductId: dto.productId,
          name,
          salePrice: dto.salePrice,
          costPrice: dto.costPrice,
          stockOnHand: 0,
          type: 'GOODS',
        },
      });
    } else {
      const prod = await this.prisma.tenantProduct.findUnique({
        where: { id: dto.productId },
      });
      if (!prod || prod.isActive === false || prod.tenantId !== tenantId)
        throw new NotFoundException('Tenant product not found');
      name = prod.name;
      const duplicate = await this.prisma.shopProduct.findFirst({
        where: { shopId: dto.shopId, tenantProductId: dto.productId },
      });
      if (duplicate)
        throw new BadRequestException('Product already linked to this shop');
      return await this.prisma.shopProduct.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          tenantProductId: dto.productId,
          name,
          salePrice: dto.salePrice,
          costPrice: dto.costPrice,
          stockOnHand: 0,
          type: 'GOODS',
        },
      });
    }
  }

  async listCatalog(tenantId: string, shopId: string) {
    const [linked, globalActive, tenantActive] = await Promise.all([
      this.prisma.shopProduct.findMany({
        where: { tenantId, shopId, isActive: true },
        select: {
          id: true,
          name: true,
          globalProductId: true,
          tenantProductId: true,
        },
      }),
      this.prisma.globalProduct.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.tenantProduct.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    const linkedGlobalIds = new Set(
      linked
        .filter((l) => l.globalProductId)
        .map((l) => l.globalProductId as string),
    );
    const linkedTenantIds = new Set(
      linked
        .filter((l) => l.tenantProductId)
        .map((l) => l.tenantProductId as string),
    );

    const catalog = [
      ...globalActive.map((p) => ({
        id: p.id,
        name: p.name,
        source: 'GLOBAL' as const,
        isLinked: linkedGlobalIds.has(p.id),
      })),
      ...tenantActive.map((p) => ({
        id: p.id,
        name: p.name,
        source: 'TENANT' as const,
        isLinked: linkedTenantIds.has(p.id),
      })),
    ];

    return { data: catalog };
  }
}
