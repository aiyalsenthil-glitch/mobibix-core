import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/mdm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMdmController {
  constructor(private readonly prisma: PrismaService) {}

  // ===============================
  // GLOBAL PRODUCTS
  // ===============================

  @Get('products')
  async listProducts(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // @ts-ignore
    const [total, products] = await Promise.all([
      this.prisma.globalProduct.count({ where }),
      this.prisma.globalProduct.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          hsn: true,
        },
      }),
    ]);

    return {
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category.name,
        categoryId: p.categoryId,
        hsnCode: p.hsn.code,
        taxRate: p.hsn.taxRate,
        isActive: p.isActive,
      })),
      meta: {
        total,
        page: pageNum,
        lastPage: Math.ceil(total / limitNum),
      },
    };
  }

  @Post('products')
  async createProduct(@Body() dto: any) {
    if (!dto.name) throw new BadRequestException('Name is required');
    if (!dto.hsnCode) throw new BadRequestException('HSN Code is required');
    if (!dto.category) throw new BadRequestException('Category is required');

    // 1. Find/Create Category
    // @ts-ignore
    const category = await this.prisma.productCategory.upsert({
      where: { name: dto.category },
      update: {},
      create: { name: dto.category },
    });

    // 2. Find HSN
    // @ts-ignore
    const hsn = await this.prisma.hSNCode.findUnique({
      where: { code: dto.hsnCode },
    });
    if (!hsn)
      throw new NotFoundException(
        `HSN Code ${dto.hsnCode} not found. Please create it first.`,
      );

    // 3. Upsert Product
    // @ts-ignore
    return this.prisma.globalProduct.upsert({
      where: {
        name_categoryId: {
          name: dto.name,
          categoryId: category.id,
        },
      },
      update: {
        hsnId: hsn.id,
        isActive: dto.isActive ?? true,
      },
      create: {
        name: dto.name,
        categoryId: category.id,
        hsnId: hsn.id,
        isActive: dto.isActive ?? true,
      },
      include: { category: true, hsn: true },
    });
  }

  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    const data: any = {
      name: dto.name,
      isActive: dto.isActive,
    };

    if (dto.category) {
      // @ts-ignore
      const category = await this.prisma.productCategory.upsert({
        where: { name: dto.category },
        update: {},
        create: { name: dto.category },
      });
      data.categoryId = category.id;
    }

    if (dto.hsnCode) {
      // @ts-ignore
      const hsn = await this.prisma.hSNCode.findUnique({
        where: { code: dto.hsnCode },
      });
      if (!hsn)
        throw new NotFoundException(`HSN Code ${dto.hsnCode} not found`);
      data.hsnId = hsn.id;
    }

    // @ts-ignore
    return this.prisma.globalProduct.update({
      where: { id },
      data,
      include: { category: true, hsn: true },
    });
  }

  // ===============================
  // HSN CODES
  // ===============================

  @Get('hsn')
  async listHSN(@Query('search') search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // @ts-ignore
    return this.prisma.hSNCode.findMany({
      where,
      take: 50,
      orderBy: { code: 'asc' },
    });
  }

  @Post('hsn')
  async upsertHSN(@Body() dto: any) {
    if (!dto.code || dto.taxRate === undefined)
      throw new BadRequestException('Code and Tax Rate required');

    // @ts-ignore
    return this.prisma.hSNCode.upsert({
      where: { code: dto.code },
      update: {
        description: dto.description,
        taxRate: parseFloat(dto.taxRate),
        isActive: dto.isActive ?? true,
      },
      create: {
        code: dto.code,
        description: dto.description,
        taxRate: parseFloat(dto.taxRate),
        isActive: dto.isActive ?? true,
      },
    });
  }
}
