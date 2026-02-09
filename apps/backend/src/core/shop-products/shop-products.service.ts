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

  private toPaisa(
    amount: number | undefined | null,
  ): number | undefined | null {
    if (amount === undefined || amount === null) return amount;
    return Math.round(amount * 100);
  }

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

    // Only support linking from GlobalProduct now
    if (dto.source !== LinkSource.GLOBAL) {
      throw new BadRequestException('Only global products can be linked');
    }

    const prod = await this.prisma.globalProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!prod || prod.isActive === false) {
      throw new NotFoundException('Global product not found');
    }

    const duplicate = await this.prisma.shopProduct.findFirst({
      where: { shopId: dto.shopId, globalProductId: dto.productId },
    });
    if (duplicate) {
      throw new BadRequestException('Product already linked to this shop');
    }

    return await this.prisma.shopProduct.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        globalProductId: dto.productId,
        name: prod.name,
        salePrice: this.toPaisa(dto.salePrice),
        costPrice: this.toPaisa(dto.costPrice),
        type: 'GOODS',
      },
    });
  }

  async listCatalog(tenantId: string, shopId: string) {
    const [linked, globalActive] = await Promise.all([
      this.prisma.shopProduct.findMany({
        where: { tenantId, shopId, isActive: true },
        select: {
          id: true,
          name: true,
          globalProductId: true,
        },
      }),
      this.prisma.globalProduct.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    const linkedGlobalIds = new Set(
      linked
        .filter((l) => l.globalProductId)
        .map((l) => l.globalProductId as string),
    );

    const catalog = globalActive.map((p) => ({
      id: p.id,
      name: p.name,
      source: 'GLOBAL' as const,
      isLinked: linkedGlobalIds.has(p.id),
    }));

    return { data: catalog };
  }
}
