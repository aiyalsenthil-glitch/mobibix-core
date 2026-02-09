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
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // @ts-ignore - Prisma might not have regenerated types yet in dev environment
    const [total, products] = await Promise.all([
      this.prisma.globalProduct.count({ where }),
      this.prisma.globalProduct.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page: pageNum,
        lastPage: Math.ceil(total / limitNum),
      },
    };
  }

  @Post('products')
  async createProduct(@Body() dto: any) {
    // Basic validation
    if (!dto.name) throw new BadRequestException('Name is required');

    // @ts-ignore
    return this.prisma.globalProduct.create({
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        hsnId: dto.hsnId,
        isActive: dto.isActive ?? true,
      },
    });
  }

  @Put('products/:id')
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    // @ts-ignore
    return this.prisma.globalProduct.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId,
        hsnId: dto.hsnId,
        isActive: dto.isActive,
      },
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
      take: 50, // Limit check
      orderBy: { code: 'asc' },
    });
  }

  @Post('hsn')
  async upsertHSN(@Body() dto: any) {
    if (!dto.code || dto.gstRate === undefined)
      throw new BadRequestException('Code and GST Rate required');

    // @ts-ignore
    return this.prisma.hSNCode.upsert({
      where: { code: dto.code },
      update: {
        description: dto.description,
        taxRate: parseFloat(dto.taxRate || dto.gstRate || '18'),
        isActive: dto.isActive ?? true,
      },
      create: {
        code: dto.code,
        description: dto.description,
        taxRate: parseFloat(dto.taxRate || dto.gstRate || '18'),
        isActive: dto.isActive ?? true,
      },
    });
  }
}
