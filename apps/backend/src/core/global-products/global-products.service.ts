import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGlobalProductDto } from './dto/create-global-product.dto';
import { UpdateGlobalProductDto } from './dto/update-global-product.dto';
import { SearchGlobalProductsDto } from './dto/search-global-products.dto';

@Injectable()
export class GlobalProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGlobalProductDto) {
    // Validate category and HSN exist
    const [category, hsn] = await Promise.all([
      this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      }),
      this.prisma.hSNCode.findUnique({
        where: { id: dto.hsnId },
      }),
    ]);

    if (!category) {
      throw new BadRequestException(
        `Product category with ID "${dto.categoryId}" not found`,
      );
    }

    if (!hsn) {
      throw new BadRequestException(
        `HSN code with ID "${dto.hsnId}" not found`,
      );
    }

    // Check for duplicate name in category
    const existing = await this.prisma.globalProduct.findFirst({
      where: {
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
        categoryId: dto.categoryId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Product "${dto.name}" already exists in this category`,
      );
    }

    return await this.prisma.globalProduct.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        hsnId: dto.hsnId,
        isActive: dto.isActive ?? true,
      },
      include: {
        category: true,
        hsn: true,
      },
    });
  }

  async findAll(query: SearchGlobalProductsDto) {
    const { skip = 0, take = 50, search = '', categoryId, hsnId } = query;

    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (hsnId) {
      where.hsnId = hsnId;
    }

    const [data, total] = await Promise.all([
      this.prisma.globalProduct.findMany({
        where,
        skip,
        take: Math.min(take, 100),
        include: {
          category: true,
          hsn: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.globalProduct.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    const product = await this.prisma.globalProduct.findUnique({
      where: { id },
      include: {
        category: true,
        hsn: true,
        shopProducts: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Global product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateGlobalProductDto) {
    const product = await this.prisma.globalProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Global product with ID "${id}" not found`);
    }

    // Validate category if provided
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.prisma.productCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException(
          `Product category with ID "${dto.categoryId}" not found`,
        );
      }

      // Check for duplicate in new category
      const existing = await this.prisma.globalProduct.findFirst({
        where: {
          name: {
            equals: dto.name ?? product.name,
            mode: 'insensitive',
          },
          categoryId: dto.categoryId,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Product with this name already exists in the target category`,
        );
      }
    }

    // Validate HSN if provided
    if (dto.hsnId && dto.hsnId !== product.hsnId) {
      const hsn = await this.prisma.hSNCode.findUnique({
        where: { id: dto.hsnId },
      });

      if (!hsn) {
        throw new BadRequestException(
          `HSN code with ID "${dto.hsnId}" not found`,
        );
      }
    }

    return await this.prisma.globalProduct.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.hsnId && { hsnId: dto.hsnId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: true,
        hsn: true,
      },
    });
  }

  async delete(id: string) {
    const product = await this.prisma.globalProduct.findUnique({
      where: { id },
      include: {
        _count: {
          select: { shopProducts: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Global product with ID "${id}" not found`);
    }

    if ((product._count as any).shopProducts > 0) {
      throw new BadRequestException(
        `Cannot delete product with ${(product._count as any).shopProducts} linked shop product(s)`,
      );
    }

    return await this.prisma.globalProduct.delete({
      where: { id },
    });
  }
}
