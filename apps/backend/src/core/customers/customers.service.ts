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

    const existing = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        phone: dto.phone,
      },
    });

    if (existing) {
      return existing; // 🔑 idempotent create
    }

    return this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        state: dto.state,
        businessType: dto.businessType,
        partyType: dto.partyType,
        gstNumber: dto.gstNumber,
      },
    });
  }

  async listCustomers(tenantId: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return customer;
  }

  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.customer.findFirst({
      where: {
        tenantId,
        phone,
        isActive: true,
      },
    });
  }

  async searchCustomers(tenantId: string, query: string, limit: number = 5) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        isActive: true,
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
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        isActive: true,
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

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        name: dto.name,
        email: dto.email,
        state: dto.state,
        businessType: dto.businessType,
        partyType: dto.partyType,
        gstNumber: dto.gstNumber,
      },
    });
  }
  async deleteCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        isActive: true,
      },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        isActive: false,
      },
    });
  }
}
