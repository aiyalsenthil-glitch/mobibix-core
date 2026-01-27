import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGlobalSupplierDto } from './dto/create-global-supplier.dto';
import { LinkGlobalSupplierDto } from './dto/link-global-supplier.dto';
import { SearchGlobalSuppliersDto } from './dto/search-global-suppliers.dto';

@Injectable()
export class GlobalSuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGlobalSupplierDto, userId?: string) {
    const namelowercase = dto.name.toLowerCase().trim();

    // Check if already exists
    const existing = await this.prisma.globalSupplier.findUnique({
      where: { namelowercase },
    });

    if (existing) {
      throw new BadRequestException(
        'Global supplier with this name already exists',
      );
    }

    return this.prisma.globalSupplier.create({
      data: {
        name: dto.name,
        namelowercase,
        primaryPhone: dto.primaryPhone,
        altPhone: dto.altPhone,
        email: dto.email,
        gstin: dto.gstin,
        address: dto.address,
        state: dto.state,
        country: dto.country || 'India',
        defaultPaymentTerms: dto.defaultPaymentTerms,
        defaultCreditLimit: dto.defaultCreditLimit,
        defaultCurrency: dto.defaultCurrency || 'INR',
        tags: dto.tags || [],
        isVerified: dto.isVerified || false,
        isActive: dto.isActive !== false,
        createdBy: userId,
      },
    });
  }

  async findAll(query: SearchGlobalSuppliersDto) {
    const skip = query.skip || 0;
    const take = Math.min(query.take || 50, 100);
    const search = query.search?.toLowerCase() || '';

    const where: any = { isActive: true };

    if (search) {
      where.namelowercase = { contains: search };
    }

    const [data, total] = await Promise.all([
      this.prisma.globalSupplier.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.globalSupplier.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.globalSupplier.findUnique({
      where: { id },
      include: {
        tenants: {
          select: {
            tenantId: true,
            linkedAt: true,
            localName: true,
            localPhone: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Global supplier not found');
    }

    return supplier;
  }

  async update(
    id: string,
    dto: Partial<CreateGlobalSupplierDto>,
    userId?: string,
  ) {
    const supplier = await this.findOne(id);

    const data: any = {
      updatedAt: new Date(),
    };

    if (dto.name && dto.name !== supplier.name) {
      data.name = dto.name;
      data.namelowercase = dto.name.toLowerCase().trim();
    }

    if (dto.primaryPhone !== undefined) data.primaryPhone = dto.primaryPhone;
    if (dto.altPhone !== undefined) data.altPhone = dto.altPhone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.gstin !== undefined) data.gstin = dto.gstin;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.country !== undefined) data.country = dto.country;
    if (dto.defaultPaymentTerms !== undefined)
      data.defaultPaymentTerms = dto.defaultPaymentTerms;
    if (dto.defaultCreditLimit !== undefined)
      data.defaultCreditLimit = dto.defaultCreditLimit;
    if (dto.defaultCurrency !== undefined)
      data.defaultCurrency = dto.defaultCurrency;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.isVerified !== undefined) data.isVerified = dto.isVerified;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.globalSupplier.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.globalSupplier.delete({ where: { id } });
  }

  async linkToTenant(
    tenantId: string,
    globalSupplierId: string,
    dto: LinkGlobalSupplierDto,
    userId?: string,
  ) {
    // Verify global supplier exists
    await this.findOne(globalSupplierId);

    // Check if already linked
    const existing = await this.prisma.tenantGlobalSupplier.findUnique({
      where: {
        tenantId_globalSupplierId: { tenantId, globalSupplierId },
      },
    });

    if (existing) {
      throw new BadRequestException('Supplier already linked to this tenant');
    }

    return this.prisma.tenantGlobalSupplier.create({
      data: {
        tenantId,
        globalSupplierId,
        localName: dto.localName,
        localPhone: dto.localPhone,
        localNotes: dto.localNotes,
      },
      include: {
        globalSupplier: true,
      },
    });
  }

  async getLinkedSuppliers(tenantId: string, skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.tenantGlobalSupplier.findMany({
        where: { tenantId },
        include: { globalSupplier: true },
        skip,
        take,
        orderBy: { linkedAt: 'desc' },
      }),
      this.prisma.tenantGlobalSupplier.count({ where: { tenantId } }),
    ]);

    return { data, total };
  }

  async unlinkFromTenant(tenantId: string, globalSupplierId: string) {
    const link = await this.prisma.tenantGlobalSupplier.findUnique({
      where: {
        tenantId_globalSupplierId: { tenantId, globalSupplierId },
      },
    });

    if (!link) {
      throw new NotFoundException('Supplier link not found');
    }

    return this.prisma.tenantGlobalSupplier.delete({
      where: { id: link.id },
    });
  }
}
