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

    // Fallback to tenant default if no purpose-specific found
    if (!phoneNumber) {
      phoneNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
        where: {
          tenantId,
          isDefault: true,
          isActive: true,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // NEW: Fallback to Module-Level Defaults (Global Numbers)
    // ─────────────────────────────────────────────────────────────
    if (!phoneNumber) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });

      const moduleType = tenant?.tenantType ?? 'GYM';

      // Try module purpose-specific
      let modulePhone = await this.prisma.whatsAppPhoneNumberModule.findFirst({
        where: {
          moduleType,
          purpose,
          isActive: true,
        },
      });

      // Try module default
      if (!modulePhone) {
        modulePhone = await this.prisma.whatsAppPhoneNumberModule.findFirst({
          where: {
            moduleType,
            isDefault: true,
            isActive: true,
          },
        });
      }

      // Map module phone to match return type
      if (modulePhone) {
        return {
          id: modulePhone.id,
          tenantId, // Virtual match
          phoneNumber: modulePhone.phoneNumber,
          phoneNumberId: modulePhone.phoneNumberId,
          wabaId: modulePhone.wabaId,
          purpose: modulePhone.purpose,
          qualityRating: modulePhone.qualityRating,
          isDefault: modulePhone.isDefault,
          isActive: modulePhone.isActive,
          createdAt: modulePhone.createdAt,
          updatedAt: modulePhone.updatedAt,
        };
      }
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
    // 1. Fetch tenant-scoped phone numbers
    const tenantPhones = await this.prisma.whatsAppPhoneNumber.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // 2. Fetch module-scoped defaults
    let moduleType = 'GYM';

    // Check if tenantId is actually a known Module Type (Virtual Tenant)
    const knownModules = ['GYM', 'MOBILE_SHOP'];
    if (knownModules.includes(tenantId)) {
      moduleType = tenantId;
    } else {
      // It's a real tenant ID
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      moduleType = tenant?.tenantType ?? 'GYM';
    }

    const modulePhones = await this.prisma.whatsAppPhoneNumberModule.findMany({
      where: { moduleType, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // 3. Map both to a unified structure
    const mappedTenantPhones = tenantPhones.map((p) => ({
      ...p,
      source: 'TENANT' as const,
      isInherited: false,
    }));

    const mappedModulePhones = modulePhones.map((m) => ({
      id: m.id, // Keep original ID, frontend should handle this carefully or we prefix it
      tenantId: tenantId, // Virtual match
      phoneNumber: m.phoneNumber,
      phoneNumberId: m.phoneNumberId,
      wabaId: m.wabaId,
      purpose: m.purpose,
      qualityRating: m.qualityRating ?? null,
      isDefault: m.isDefault,
      isActive: m.isActive,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      source: 'MODULE' as const,
      isInherited: true,
    }));

    // 4. Merge: Tenant phones override Module phones of the same purpose?
    // Actually, user wants to see ALL options.
    // But logically, if I have a "Billing" number defined for Tenant, the "Billing" number for Module is shadowed.
    // However, for the UI "Manager", it's helpful to see what is being overridden.
    // Let's return ALL, but the frontend can visually distinguish.
    
    // We will concat them.
    return [...mappedTenantPhones, ...mappedModulePhones];
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
    // Check if tenantId is a Module Type (Virtual Tenant)
    const knownModules = ['GYM', 'MOBILE_SHOP'];
    const isModule = knownModules.includes(data.tenantId);

    if (isModule) {
      // ─────────────────────────────────────────────────────────────
      // Handle Module-Level Creation
      // ─────────────────────────────────────────────────────────────
      const moduleType = data.tenantId as 'GYM' | 'MOBILE_SHOP'; // Enforced by check

      // If setting as default, unset other defaults for this module
      if (data.isDefault) {
        await this.prisma.whatsAppPhoneNumberModule.updateMany({
          where: {
            moduleType,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const created = await this.prisma.whatsAppPhoneNumberModule.create({
        data: {
          moduleType,
          phoneNumber: data.phoneNumber,
          phoneNumberId: data.phoneNumberId,
          wabaId: data.wabaId,
          purpose: data.purpose,
          isDefault: data.isDefault || false,
          isActive: true,
        },
      });

      // Remap to common shape
      return {
        ...created,
        tenantId: data.tenantId, // Virtual
        isInherited: true, // It is a module number
        source: 'MODULE',
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Handle Tenant-Level Creation (Original Logic)
    // ─────────────────────────────────────────────────────────────

    // If setting as default, unset other defaults for this tenant
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
    // 1. Try to find in Tenant table
    const storedTenantPhone = await this.prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (storedTenantPhone) {
      // Found in Tenant table -> Update Tenant Phone
      if (data.isDefault) {
        await this.prisma.whatsAppPhoneNumber.updateMany({
          where: {
            tenantId: storedTenantPhone.tenantId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
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

    // 2. Try to find in Module table
    const storedModulePhone = await this.prisma.whatsAppPhoneNumberModule.findUnique({
      where: { id },
    });

    if (storedModulePhone) {
      // Found in Module table -> Update Module Phone
      if (data.isDefault) {
        await this.prisma.whatsAppPhoneNumberModule.updateMany({
          where: {
            moduleType: storedModulePhone.moduleType,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      const updated = await this.prisma.whatsAppPhoneNumberModule.update({
        where: { id },
        data: {
          purpose: data.purpose,
          isDefault: data.isDefault,
          isActive: data.isActive,
          qualityRating: data.qualityRating,
          updatedAt: new Date(),
        },
      });

      return {
        ...updated,
        tenantId: updated.moduleType,
        source: 'MODULE',
      };
    }

    throw new NotFoundException('Phone number not found');
  }

  /**
   * Delete phone number
   */
  /**
   * Delete phone number
   */
  async deletePhoneNumber(id: string) {
    // 1. Try to find in Tenant table
    const tenantPhone = await this.prisma.whatsAppPhoneNumber.findUnique({
      where: { id },
    });

    if (tenantPhone) {
      if (tenantPhone.isDefault) {
        const count = await this.prisma.whatsAppPhoneNumber.count({
          where: { tenantId: tenantPhone.tenantId },
        });

        if (count === 1) {
          throw new BadRequestException(
            'Cannot delete the only phone number. Add another one first.',
          );
        }

        // Check if there's another active phone number to set as default
        const anotherActive = await this.prisma.whatsAppPhoneNumber.findFirst({
          where: {
            tenantId: tenantPhone.tenantId,
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

    // 2. Try to find in Module table
    const modulePhone = await this.prisma.whatsAppPhoneNumberModule.findUnique({
      where: { id },
    });

    if (modulePhone) {
      if (modulePhone.isDefault) {
        const count = await this.prisma.whatsAppPhoneNumberModule.count({
          where: { moduleType: modulePhone.moduleType },
        });

        if (count === 1) {
          throw new BadRequestException(
            'Cannot delete the only global number for this module.',
          );
        }

        const anotherActive = await this.prisma.whatsAppPhoneNumberModule.findFirst({
          where: {
            moduleType: modulePhone.moduleType,
            id: { not: id },
            isActive: true,
          },
        });

        if (!anotherActive) {
          throw new BadRequestException(
            'Cannot delete default global number. Please set another as default first.',
          );
        }

        await this.prisma.whatsAppPhoneNumberModule.update({
          where: { id: anotherActive.id },
          data: { isDefault: true },
        });
      }

      const deleted = await this.prisma.whatsAppPhoneNumberModule.delete({
        where: { id },
      });
      
      return {
        ...deleted,
        tenantId: deleted.moduleType,
        source: 'MODULE',
      };
    }

    throw new NotFoundException('Phone number not found');
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
