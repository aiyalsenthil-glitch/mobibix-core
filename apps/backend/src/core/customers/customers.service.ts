import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { isValidIndianGSTIN } from '../../common/validators/gstin.validator';
import { PhoneService } from '../../common/services/phone.service';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private phoneService: PhoneService,
  ) {}

  async createCustomer(tenantId: string, dto: CreateCustomerDto) {
    const normalizedPhone = this.phoneService.normalize(
      dto.phone,
      dto.countryCode || 'IN',
    );

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
        OR: [{ phone: dto.phone }, { normalizedPhone }],
      },
    });

    if (existing) {
      if (existing.partyType === 'VENDOR') {
        // Upgrade to BOTH if it was only a vendor
        return this.prisma.party.update({
          where: { id: existing.id },
          data: {
            partyType: 'BOTH',
            normalizedPhone,
            countryCode: dto.countryCode || 'IN',
            isoStateCode: dto.isoStateCode,
          },
        });
      }
      return existing; // 🔑 idempotent create
    }

    return this.prisma.party.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        normalizedPhone,
        countryCode: dto.countryCode || 'IN',
        isoStateCode: dto.isoStateCode,
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

    let normalizedPhone: string | null | undefined;
    if (dto.phone) {
      normalizedPhone = this.phoneService.normalize(
        dto.phone,
        dto.countryCode || customer.countryCode || 'IN',
      );

      // Check for uniqueness if phone changed
      if (normalizedPhone !== customer.normalizedPhone) {
        const dup = await this.prisma.party.findFirst({
          where: {
            tenantId,
            id: { not: customerId },
            OR: [{ phone: dto.phone }, { normalizedPhone }],
          },
        });
        if (dup) {
          throw new BadRequestException('Phone number already exists');
        }
      }
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
        phone: dto.phone,
        normalizedPhone,
        countryCode: dto.countryCode,
        isoStateCode: dto.isoStateCode,
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

  async mergeCustomers(tenantId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge customer into itself');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch & Verify
      const [source, target] = await Promise.all([
        tx.party.findFirst({ where: { id: sourceId, tenantId } }),
        tx.party.findFirst({ where: { id: targetId, tenantId } }),
      ]);

      if (!source || !target) {
        throw new BadRequestException('Source or target customer not found');
      }

      if (!source.isActive) {
        throw new BadRequestException(
          'Source customer is already inactive or merged',
        );
      }

      // 2. Prevent circular merge
      if (target.mergedIntoId === sourceId) {
        throw new BadRequestException('Circular merge detected');
      }

      // 3. Transfer all associated records (FK Updates)
      const modelsToUpdate = [
        { name: 'invoice', field: 'customerId' },
        { name: 'jobCard', field: 'customerId' },
        { name: 'member', field: 'customerId' },
        { name: 'loyaltyTransaction', field: 'customerId' },
        { name: 'customerAlert', field: 'customerId' },
        { name: 'customerFollowUp', field: 'customerId' },
        { name: 'customerReminder', field: 'customerId' },
        { name: 'receipt', field: 'customerId' },
        { name: 'quotation', field: 'customerId' },
        { name: 'purchaseOrder', field: 'customerId' },
        { name: 'paymentVoucher', field: 'customerId' },
        { name: 'whatsAppLog', field: 'customerId' },
        { name: 'emailLog', field: 'customerId' },
        { name: 'loyaltyAdjustment', field: 'partyId' },
        { name: 'supplierPayment', field: 'partyId' },
      ];

      for (const model of modelsToUpdate) {
        if ((tx as any)[model.name]) {
          await (tx as any)[model.name].updateMany({
            where: { [model.field]: sourceId, tenantId },
            data: { [model.field]: targetId },
          });
        }
      }

      // Special handling for Purchase (PartyToPurchases relation)
      await tx.purchase.updateMany({
        where: { globalSupplierId: sourceId, tenantId },
        data: { globalSupplierId: targetId },
      });

      // 4. Consolidate financial & loyalty points
      await tx.party.update({
        where: { id: targetId },
        data: {
          currentOutstanding: { increment: source.currentOutstanding },
          loyaltyPoints: { increment: source.loyaltyPoints },
        },
      });

      // 5. Deactivate source and mark as merged
      await tx.party.update({
        where: { id: sourceId },
        data: {
          isActive: false,
          mergedIntoId: targetId,
          // Append audit note to name
          name: `${source.name} (MERGED into ${target.id.substring(0, 8)})`,
        },
      });

      return {
        success: true,
        sourceId,
        targetId,
        mergedRecordsCount: 'ALL_LINKED_DATA_TRANSFERRED',
      };
    });
  }
}
