import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async listShops(tenantId: string) {
    return this.prisma.shop.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createShop(tenantId: string, role: string, dto: CreateShopDto) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can create shops');
    }

    return this.prisma.shop.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        invoicePrefix: dto.invoicePrefix,
        gstNumber: dto.gstNumber,
        website: dto.website,
        logoUrl: dto.logoUrl,
        invoiceFooter: dto.invoiceFooter,
      },
    });
  }
}
