import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier.response.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new supplier
   */
  async create(
    tenantId: string,
    dto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    // Check if supplier with same name already exists in this tenant
    const existingSupplier = await this.prisma.supplier.findFirst({
      where: {
        tenantId,
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingSupplier) {
      throw new ConflictException(
        `Supplier "${dto.name}" already exists for this tenant`,
      );
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name,
        namelowercase: dto.name.toLowerCase(),
        primaryPhone: dto.phone || '',
        altPhone: dto.alternatePhone,
        email: dto.email,
        gstin: dto.gstin,
        address: dto.address,
        state: dto.state,
        defaultPaymentTerms: dto.paymentTerms,
        tags: dto.tags || [],
        isActive: true,
        createdBy: 'system',
      },
    });

    return this.mapToResponseDto(supplier);
  }

  /**
   * Get all suppliers for a tenant
   */
  async findAll(
    tenantId: string,
    options: {
      skip?: number;
      take?: number;
      search?: string;
      status?: string;
    } = {},
  ): Promise<{
    data: SupplierResponseDto[];
    total: number;
    page?: number;
    limit?: number;
  }> {
    const { skip = 0, take = 50, search = '', status } = options;

    const whereClause: any = { tenantId };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { primaryPhone: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'ACTIVE') {
      whereClause.isActive = true;
    } else if (status === 'INACTIVE') {
      whereClause.isActive = false;
    }

    const total = await this.prisma.supplier.count({ where: whereClause });

    const suppliers = await this.prisma.supplier.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: suppliers.map((s) => this.mapToResponseDto(s)),
      total,
      page: Math.floor(skip / take) + 1,
      limit: take,
    };
  }

  /**
   * Get a single supplier by ID
   */
  async findOne(tenantId: string, id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier || supplier.tenantId !== tenantId) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    return this.mapToResponseDto(supplier);
  }

  /**
   * Update a supplier
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier || supplier.tenantId !== tenantId) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    if (dto.name && dto.name !== supplier.name) {
      const existingSupplier = await this.prisma.supplier.findFirst({
        where: {
          tenantId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existingSupplier) {
        throw new ConflictException(
          `Supplier "${dto.name}" already exists for this tenant`,
        );
      }
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name && {
          name: dto.name,
          namelowercase: dto.name.toLowerCase(),
        }),
        ...(dto.gstin !== undefined && { gstin: dto.gstin }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { primaryPhone: dto.phone }),
        ...(dto.alternatePhone !== undefined && {
          altPhone: dto.alternatePhone,
        }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.paymentTerms !== undefined && {
          defaultPaymentTerms: dto.paymentTerms,
        }),
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Soft delete a supplier
   */
  async remove(tenantId: string, id: string): Promise<SupplierResponseDto> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier || supplier.tenantId !== tenantId) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    const activePurchases = await this.prisma.purchase.count({
      where: {
        globalSupplierId: id,
        status: { in: ['DRAFT', 'SUBMITTED', 'PARTIALLY_PAID'] },
      },
    });

    if (activePurchases > 0) {
      throw new BadRequestException(
        `Cannot delete supplier with ${activePurchases} active purchase(es)`,
      );
    }

    const deleted = await this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    return this.mapToResponseDto(deleted);
  }

  /**
   * Get supplier outstanding balance
   */
  async getOutstandingBalance(
    tenantId: string,
    supplierId: string,
  ): Promise<number> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier || supplier.tenantId !== tenantId) {
      throw new NotFoundException(`Supplier with ID "${supplierId}" not found`);
    }

    const shopSuppliers = await this.prisma.shopSupplier.findMany({
      where: { globalSupplierId: supplierId },
    });

    return shopSuppliers.reduce(
      (total, ss) => total + (ss.outstandingAmount || 0),
      0,
    );
  }

  /**
   * Map Prisma supplier to response DTO
   */
  private mapToResponseDto(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      tenantId: supplier.tenantId,
      name: supplier.name,
      gstin: supplier.gstin,
      email: supplier.email,
      phone: supplier.primaryPhone,
      alternatePhone: supplier.altPhone,
      address: supplier.address,
      city: '',
      state: supplier.state,
      pinCode: '',
      contactPerson: '',
      bankAccountNumber: '',
      bankIfsc: '',
      bankName: '',
      status: supplier.isActive ? 'ACTIVE' : 'INACTIVE',
      tags: supplier.tags,
      paymentTerms: supplier.defaultPaymentTerms,
      notes: '',
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }
}
