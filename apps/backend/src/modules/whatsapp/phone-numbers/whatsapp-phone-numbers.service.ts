import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { WhatsAppPhoneNumberPurpose } from '@prisma/client';

@Injectable()
export class WhatsAppPhoneNumbersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get active phone number for tenant by purpose
   * Falls back to default if purpose-specific not found
   */
  async getPhoneNumberForPurpose(
    tenantId: string,
    purpose: WhatsAppPhoneNumberPurpose,
  ) {
    // Try to find active phone number for specific purpose
    let phoneNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: {
        tenantId,
        purpose,
        isActive: true,
      },
    });

    // Fallback to default if no purpose-specific found
    if (!phoneNumber) {
      phoneNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
        where: {
          tenantId,
          isDefault: true,
          isActive: true,
        },
      });
    }

    if (!phoneNumber) {
      throw new NotFoundException(
        `No active WhatsApp phone number found for tenant ${tenantId} and purpose ${purpose}`,
      );
    }

    return phoneNumber;
  }

  /**
   * List all phone numbers for a tenant
   */
  async listPhoneNumbers(tenantId: string) {
    // First, fetch tenant-scoped phone numbers
    const tenantPhones = await this.prisma.whatsAppPhoneNumber.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (tenantPhones && tenantPhones.length > 0) {
      return tenantPhones;
    }

    // If none exist, fall back to module-scoped defaults based on tenant type
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    const moduleType = tenant?.tenantType ?? 'GYM';

    const modulePhones = await this.prisma.whatsAppPhoneNumberModule.findMany({
      where: { moduleType, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // Map module-scoped records to the tenant-scoped shape so frontend can render them
    const mapped = modulePhones.map((m) => ({
      id: m.id,
      tenantId: tenantId,
      phoneNumber: m.phoneNumber,
      phoneNumberId: m.phoneNumberId,
      wabaId: m.wabaId,
      purpose: m.purpose,
      qualityRating: m.qualityRating ?? null,
      isDefault: m.isDefault,
      isActive: m.isActive,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return mapped;
  }

  /**
   * Create a new phone number
   */
  async createPhoneNumber(data: {
    tenantId: string;
    phoneNumber: string;
    phoneNumberId: string;
    wabaId: string;
    purpose: WhatsAppPhoneNumberPurpose;
    isDefault?: boolean;
  }) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.whatsAppPhoneNumber.updateMany({
        where: {
          tenantId: data.tenantId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.whatsAppPhoneNumber.create({
      data: {
        tenantId: data.tenantId,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaId,
        purpose: data.purpose,
        isDefault: data.isDefault || false,
        isActive: true,
      },
    });
  }

  /**
   * Update phone number
   */
  async updatePhoneNumber(
    id: string,
    data: {
      purpose?: WhatsAppPhoneNumberPurpose;
      isDefault?: boolean;
      isActive?: boolean;
      qualityRating?: string;
    },
  ) {
    const phoneNumber = await this.prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      throw new NotFoundException('Phone number not found');
    }

    // If setting as default, unset other defaults for this tenant
    if (data.isDefault) {
      await this.prisma.whatsAppPhoneNumber.updateMany({
        where: {
          tenantId: phoneNumber.tenantId,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.whatsAppPhoneNumber.update({
      where: { id },
      data: {
        purpose: data.purpose,
        isDefault: data.isDefault,
        isActive: data.isActive,
        qualityRating: data.qualityRating,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete phone number
   */
  async deletePhoneNumber(id: string) {
    const phoneNumber = await this.prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (!phoneNumber) {
      throw new NotFoundException('Phone number not found');
    }

    // Prevent deleting default phone number if it's the only one
    if (phoneNumber.isDefault) {
      const count = await this.prisma.whatsAppPhoneNumber.count({
        where: {
          tenantId: phoneNumber.tenantId,
        },
      });

      if (count === 1) {
        throw new BadRequestException(
          'Cannot delete the only phone number. Add another one first.',
        );
      }

      // Check if there's another active phone number to set as default
      const anotherActive = await this.prisma.whatsAppPhoneNumber.findFirst({
        where: {
          tenantId: phoneNumber.tenantId,
          id: { not: id },
          isActive: true,
        },
      });

      if (!anotherActive) {
        throw new BadRequestException(
          'Cannot delete default phone number. Please set another phone number as default first.',
        );
      }

      // Set the other phone as default
      await this.prisma.whatsAppPhoneNumber.update({
        where: { id: anotherActive.id },
        data: { isDefault: true },
      });
    }

    return this.prisma.whatsAppPhoneNumber.delete({
      where: { id },
    });
  }

  /**
   * Ensure tenant has at least one default phone number
   */
  async ensureDefaultExists(tenantId: string): Promise<boolean> {
    const defaultPhone = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
    });

    return !!defaultPhone;
  }
}
