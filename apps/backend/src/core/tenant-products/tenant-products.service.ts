import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantProductDto } from './dto/create-tenant-product.dto';
import { UpdateTenantProductDto } from './dto/update-tenant-product.dto';

@Injectable()
export class TenantProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, role: string, dto: CreateTenantProductDto) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can create tenant products');
    }

    const [category, hsn] = await Promise.all([
      this.prisma.productCategory.findUnique({ where: { id: dto.categoryId } }),
      this.prisma.hSNCode.findUnique({ where: { id: dto.hsnId } }),
    ]);
    if (!category) throw new BadRequestException(`Product category not found`);
    if (!hsn) throw new BadRequestException(`HSN code not found`);

    const existing = await this.prisma.tenantProduct.findFirst({
      where: {
        tenantId,
        name: { equals: dto.name, mode: 'insensitive' },
        categoryId: dto.categoryId,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Product with same name already exists in category',
      );
    }

    return await this.prisma.tenantProduct.create({
      data: {
        tenantId,
        name: dto.name,
        categoryId: dto.categoryId,
        hsnId: dto.hsnId,
        isActive: dto.isActive ?? true,
      },
      include: { category: true, hsn: true },
    });
  }

  async findAll(
    tenantId: string,
    params?: { search?: string; skip?: number; take?: number },
  ) {
    const where: any = { tenantId, isActive: true };
    if (params?.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }
    const skip = params?.skip ?? 0;
    const take = Math.min(params?.take ?? 50, 100);

    const [data, total] = await Promise.all([
      this.prisma.tenantProduct.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { category: true, hsn: true },
      }),
      this.prisma.tenantProduct.count({ where }),
    ]);
    return { data, total };
  }

  async update(
    tenantId: string,
    role: string,
    id: string,
    dto: UpdateTenantProductDto,
  ) {
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update tenant products');
    }

    const product = await this.prisma.tenantProduct.findUnique({
      where: { id },
    });
    if (!product || product.tenantId !== tenantId) {
      throw new NotFoundException('Tenant product not found');
    }

    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category)
        throw new BadRequestException('Product category not found');
    }
    if (dto.hsnId && dto.hsnId !== product.hsnId) {
      const hsn = await this.prisma.hSNCode.findUnique({
        where: { id: dto.hsnId },
      });
      if (!hsn) throw new BadRequestException('HSN code not found');
    }

    if (dto.name && dto.name !== product.name) {
      const dup = await this.prisma.tenantProduct.findFirst({
        where: {
          tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          categoryId: dto.categoryId ?? product.categoryId,
          id: { not: id },
        },
      });
      if (dup)
        throw new BadRequestException('Duplicate product name in category');
    }

    return await this.prisma.tenantProduct.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.hsnId && { hsnId: dto.hsnId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { category: true, hsn: true },
    });
  }

  async disable(tenantId: string, role: string, id: string) {
    if (role !== 'OWNER')
      throw new ForbiddenException('Only owner can disable tenant products');
    const product = await this.prisma.tenantProduct.findUnique({
      where: { id },
    });
    if (!product || product.tenantId !== tenantId)
      throw new NotFoundException('Tenant product not found');
    return await this.prisma.tenantProduct.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
