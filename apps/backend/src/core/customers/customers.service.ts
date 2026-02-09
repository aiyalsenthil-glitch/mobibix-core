import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { isValidIndianGSTIN } from '../../common/validators/gstin.validator';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async createCustomer(tenantId: string, dto: CreateCustomerDto) {
    // prevent duplicate phone per tenant
    // 🔒 B2B GSTIN validation
    if (dto.businessType === 'B2B') {
      if (!dto.gstNumber) {
        throw new BadRequestException('GSTIN is required for B2B customer');
      }

      if (!isValidIndianGSTIN(dto.gstNumber)) {
        throw new BadRequestException('Invalid GSTIN format');
      }
    }

    const existing = await this.prisma.party.findFirst({
      where: {
        tenantId,
        phone: dto.phone,
      },
    });

    if (existing) {
      if (existing.partyType === 'VENDOR') {
        // Upgrade to BOTH if it was only a vendor
        return this.prisma.party.update({
          where: { id: existing.id },
          data: { partyType: 'BOTH' },
        });
      }
      return existing; // 🔑 idempotent create
    }

    return this.prisma.party.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        state: dto.state,
        businessType: dto.businessType,
        partyType: 'CUSTOMER',
        gstNumber: dto.gstNumber,
      },
    });
  }

  async listCustomers(
    tenantId: string,
    options?: { skip?: number; take?: number; search?: string },
  ) {
    const where: any = {
      tenantId,
      partyType: { in: ['CUSTOMER', 'BOTH'] },
    };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.party.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          businessType: true,
          partyType: true,
          gstNumber: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.party.count({ where }),
    ]);

    return {
      data: items,
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }

  async getCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.party.findFirst({
      where: {
        id: customerId,
        tenantId,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
      },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return customer;
  }

  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.party.findFirst({
      where: {
        tenantId,
        phone,
        isActive: true,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
      },
    });
  }

  async searchCustomers(tenantId: string, query: string, limit: number = 5) {
    return this.prisma.party.findMany({
      where: {
        tenantId,
        isActive: true,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }
  async updateCustomer(
    tenantId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ) {
    const customer = await this.prisma.party.findFirst({
      where: {
        id: customerId,
        tenantId,
        isActive: true,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
      },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }
    // 🔒 B2B GSTIN validation (update)
    const businessType = dto.businessType ?? customer.businessType;
    const gstNumber = dto.gstNumber ?? customer.gstNumber;

    if (businessType === 'B2B') {
      if (!gstNumber) {
        throw new BadRequestException('GSTIN is required for B2B customer');
      }

      if (!isValidIndianGSTIN(gstNumber)) {
        throw new BadRequestException('Invalid GSTIN format');
      }
    }

    return this.prisma.party.update({
      where: { id: customerId },
      data: {
        name: dto.name,
        email: dto.email,
        state: dto.state,
        businessType: dto.businessType,
        gstNumber: dto.gstNumber,
      },
    });
  }
  async deleteCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.party.findFirst({
      where: {
        id: customerId,
        tenantId,
        isActive: true,
        partyType: { in: ['CUSTOMER', 'BOTH'] },
      },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return this.prisma.party.update({
      where: { id: customerId },
      data: {
        isActive: false,
      },
    });
  }
}
