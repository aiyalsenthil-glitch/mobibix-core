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
    const existingSupplier = await this.prisma.party.findFirst({
      where: {
        tenantId,
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existingSupplier) {
      if (existingSupplier.partyType === 'CUSTOMER') {
        const upgraded = await this.prisma.party.update({
          where: { id: existingSupplier.id },
          data: {
            partyType: 'BOTH',
            gstNumber: dto.gstin ?? existingSupplier.gstNumber,
            address: dto.address ?? existingSupplier.address,
            state: dto.state ?? existingSupplier.state,
          },
        });
        return this.mapToResponseDto(upgraded);
      }
      throw new ConflictException(
        `Supplier "${dto.name}" or phone already exists for this tenant`,
      );
    }

    const supplier = await this.prisma.party.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone || `VENDOR_${Date.now()}`,
        altPhone: dto.alternatePhone,
        email: dto.email,
        gstNumber: dto.gstin,
        address: dto.address,
        state: dto.state,
        defaultPaymentTerms: dto.paymentTerms,
        tags: dto.tags || [],
        isActive: true,
        partyType: 'VENDOR',
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

    const whereClause: any = {
      tenantId,
      partyType: { in: ['VENDOR', 'BOTH'] },
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'ACTIVE') {
      whereClause.isActive = true;
    } else if (status === 'INACTIVE') {
      whereClause.isActive = false;
    }

    const total = await this.prisma.party.count({ where: whereClause });

    const suppliers = await this.prisma.party.findMany({
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
    const supplier = await this.prisma.party.findFirst({
      where: {
        id,
        tenantId,
        partyType: { in: ['VENDOR', 'BOTH'] },
      },
    });

    if (!supplier) {
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
    const supplier = await this.prisma.party.findFirst({
      where: {
        id,
        tenantId,
        partyType: { in: ['VENDOR', 'BOTH'] },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    if (dto.name && dto.name !== supplier.name) {
      const existingSupplier = await this.prisma.party.findFirst({
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

    const updated = await this.prisma.party.update({
      where: { id },
      data: {
        ...(dto.name && {
          name: dto.name,
        }),
        ...(dto.gstin !== undefined && { gstNumber: dto.gstin }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
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
    const supplier = await this.prisma.party.findFirst({
      where: {
        id,
        tenantId,
        partyType: { in: ['VENDOR', 'BOTH'] },
      },
    });

    if (!supplier) {
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

    const deleted = await this.prisma.party.update({
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
    const supplier = await this.prisma.party.findFirst({
      where: {
        id: supplierId,
        tenantId,
        partyType: { in: ['VENDOR', 'BOTH'] },
      },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${supplierId}" not found`);
    }

    // TODO: Implement actual outstanding calculation from Purchase/Payments
    // For now returning 0 as ShopSupplier is removed
    return 0;
  }

  /**
   * Map Prisma supplier to response DTO
   */
  private mapToResponseDto(supplier: any): SupplierResponseDto {
    return {
      id: supplier.id,
      tenantId: supplier.tenantId,
      name: supplier.name,
      gstin: supplier.gstNumber,
      email: supplier.email,
      phone: supplier.phone,
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
