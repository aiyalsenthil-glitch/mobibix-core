import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto';
import { isValidIndianGSTIN } from '../../../common/validators/gstin.validator';
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
  async getShopById(tenantId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    return shop;
  }
  async updateShop(
    tenantId: string,
    role: string,
    shopId: string,
    dto: UpdateShopDto,
  ) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update shop');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        gstNumber: dto.gstNumber,
        website: dto.website,
        logoUrl: dto.logoUrl,
        invoiceFooter: dto.invoiceFooter,
        terms: dto.terms,
      },
    });
  }
  async getShopSettings(tenantId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        website: true,

        gstEnabled: true,
        gstNumber: true,

        invoicePrefix: true,
        invoiceFooter: true,
        terms: true,
        logoUrl: true,
      },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }

    return shop;
  }
  async updateShopSettings(
    tenantId: string,
    role: string,
    shopId: string,
    dto: UpdateShopSettingsDto,
  ) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update shop settings');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
    });

    if (!shop) {
      throw new ForbiddenException('Shop not found');
    }
    // GST business rules

    if (dto.gstEnabled === true) {
      if (!dto.gstNumber) {
        throw new ForbiddenException('GST number required when GST is enabled');
      }

      if (!isValidIndianGSTIN(dto.gstNumber)) {
        throw new ForbiddenException('Invalid GSTIN format');
      }
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        name: dto.name,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        website: dto.website,

        gstEnabled: dto.gstEnabled,
        gstNumber: dto.gstNumber,

        invoiceFooter: dto.invoiceFooter,
        terms: dto.terms,
        logoUrl: dto.logoUrl,
      },
    });
  }
}
