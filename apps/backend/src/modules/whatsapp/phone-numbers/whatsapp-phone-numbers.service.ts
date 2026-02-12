import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { UserRole, WhatsAppPhoneNumberPurpose, ModuleType } from '@prisma/client';
import { PlanRulesService } from '../../../core/billing/plan-rules.service';
// import { WhatsAppPhoneNumber } from '@prisma/client'; // Now WhatsAppNumber

@Injectable()
export class WhatsAppPhoneNumbersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * Get all phone numbers for a tenant
   */
  async getNumbers(tenantId: string) {
    const numbers = await this.prisma.whatsAppNumber.findMany({
      where: { tenantId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return numbers.map(num => ({
        id: num.id,
        phoneNumber: num.phoneNumber,
        displayNumber: num.displayNumber || this.maskPhoneNumber(num.phoneNumber),
        label: num.label,
        isDefault: num.isDefault,
        isEnabled: num.isEnabled,
        qualityRating: num.qualityRating,
    }));
  }

  /**
   * Mask phone number (e.g. +91 ******4321)
   */
  maskPhoneNumber(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/\s+/g, '');
    if (clean.length <= 6) return phone;
    return `${clean.substring(0, 3)} ****** ${clean.substring(clean.length - 4)}`;
  }

  /**
   * Sanitize phone number response based on user role
   */
  sanitizePhoneNumber(phone: any, role: UserRole) {
    if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
      return phone;
    }

    return {
      id: phone.id,
      maskedPhone: this.maskPhoneNumber(phone.phoneNumber),
      purpose: phone.purpose,
      isDefault: phone.isDefault,
      isEnabled: phone.isEnabled ?? phone.isActive ?? true, // Standardize on isEnabled
      isInherited: phone.isInherited || false,
      source: phone.source,
    };
  }

  /**
   * Get active phone number for tenant by purpose
   * Falls back to default if purpose-specific not found
   */
  async getPhoneNumberForPurpose(
    tenantId: string,
    purpose: WhatsAppPhoneNumberPurpose = WhatsAppPhoneNumberPurpose.DEFAULT,
    routingTrack?: 'SYSTEM_DEFAULT' | 'TENANT_OWNED',
  ) {
    // 1. Try to find specific phone number for this tenant
    let phoneNumber = await this.prisma.whatsAppNumber.findFirst({
      where: {
        tenantId,
        purpose, // Note: purpose is now legacy/mapped, but still queryable if I kept it in schema
        isEnabled: true, // was isActive
      },
    });

    if (phoneNumber) {
      return phoneNumber;
    }

    // Fallback to tenant default if no purpose-specific found
    if (!phoneNumber) {
      phoneNumber = await this.prisma.whatsAppNumber.findFirst({
        where: {
          tenantId,
          isDefault: true,
          isEnabled: true,
        },
      });
    }

    if (phoneNumber) {
      return phoneNumber;
    }

    // ─────────────────────────────────────────────────────────────
    // NEW: Fallback to Module-Level Defaults (Global Numbers)
    // ─────────────────────────────────────────────────────────────
    
    // CRITICAL: If routing track is TENANT_OWNED (CRM Add-on), we MUST NOT fallback.
    // The rule is: CRM tenants must use their own number.
    if (routingTrack === 'TENANT_OWNED') {
         throw new NotFoundException(
        `No active tenant-owned WhatsApp number found for purpose ${purpose}. CRM Add-on requires your own number.`,
      );
    }

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
            isActive: true,
            OR: [
              { isDefault: true },
              { purpose: WhatsAppPhoneNumberPurpose.DEFAULT },
            ],
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
          qualityRating: null, // Module phone might not have this in schema or we ignore it
          encryptedAccessToken: (modulePhone as any).encryptedAccessToken,
          isDefault: false, // It is a default, but treated as specific here
          isEnabled: modulePhone.isActive, // Map to isEnabled
          createdAt: modulePhone.createdAt,
          updatedAt: modulePhone.updatedAt,
        } as any; // Cast to any to match return type if needed, or matched type
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
    const tenantPhones = await this.prisma.whatsAppNumber.findMany({
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
      isEnabled: m.isActive, // Map to isEnabled
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
      await this.prisma.whatsAppNumber.updateMany({
        where: {
          tenantId: data.tenantId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 🔒 GUARDRAIL: Plan Limits
    // ─────────────────────────────────────────────────────────────
    // Resolve module type (default GYM if not found, though tenant likely exists)
    const tenant = await this.prisma.tenant.findUnique({
        where: { id: data.tenantId },
        select: { tenantType: true },
    });
    const module = (tenant?.tenantType as ModuleType) ?? ModuleType.GYM;

    const planRules = await this.planRulesService.getPlanRulesForTenant(data.tenantId, module);
    const maxNumbers = planRules?.whatsapp?.maxNumbers ?? 1; // Default to 1 if not specified

    const currentCount = await this.prisma.whatsAppNumber.count({
        where: { tenantId: data.tenantId, isEnabled: true },
    });

    if (currentCount >= maxNumbers) {
        throw new BadRequestException(
            `Plan limit reached. Your plan allows ${maxNumbers} WhatsApp number(s). Upgrade to add more.`,
        );
    }

    return this.prisma.whatsAppNumber.create({
      data: {
        tenantId: data.tenantId,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaId,
        purpose: data.purpose,
        isDefault: data.isDefault || false,
        isEnabled: true, // was isActive
        displayNumber: data.phoneNumber, // Default fill
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
    const storedTenantPhone = await this.prisma.whatsAppNumber.findUnique({
      where: { id },
    });

    if (storedTenantPhone) {
      // Found in Tenant table -> Update Tenant Phone
      if (data.isDefault) {
        await this.prisma.whatsAppNumber.updateMany({
          where: {
            tenantId: storedTenantPhone.tenantId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      return this.prisma.whatsAppNumber.update({
        where: { id },
        data: {
          purpose: data.purpose,
          isDefault: data.isDefault,
          isEnabled: data.isActive, // Map isActive input to isEnabled
          qualityRating: data.qualityRating,
          updatedAt: new Date(),
        },
      });
    }

    // 2. Try to find in Module table
    const storedModulePhone =
      await this.prisma.whatsAppPhoneNumberModule.findUnique({
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
        isEnabled: updated.isActive, // Map to isEnabled
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
    const tenantPhone = await this.prisma.whatsAppNumber.findUnique({
      where: { id },
    });

    if (tenantPhone) {
      if (tenantPhone.isDefault) {
        const count = await this.prisma.whatsAppNumber.count({
          where: { tenantId: tenantPhone.tenantId },
        });

        if (count === 1) {
          throw new BadRequestException(
            'Cannot delete the only phone number. Add another one first.',
          );
        }

        // Check if there's another active phone number to set as default
        const anotherActive = await this.prisma.whatsAppNumber.findFirst({
          where: {
            tenantId: tenantPhone.tenantId,
            id: { not: id },
            isEnabled: true,
          },
        });

        if (!anotherActive) {
          throw new BadRequestException(
            'Cannot delete default phone number. Please set another phone number as default first.',
          );
        }

        // Set the other phone as default
        await this.prisma.whatsAppNumber.update({
          where: { id: anotherActive.id },
          data: { isDefault: true },
        });
      }

      return this.prisma.whatsAppNumber.delete({
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

        const anotherActive =
          await this.prisma.whatsAppPhoneNumberModule.findFirst({
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
        isEnabled: deleted.isActive, // Map to isEnabled
      };
    }

    throw new NotFoundException('Phone number not found');
  }

  /**
   * Get a phone number by ID (checks both tenant and module tables)
   */
  async getPhoneNumberById(id: string) {
    // 1. Check Tenant Table
    const tenantPhone = await this.prisma.whatsAppNumber.findUnique({
      where: { id },
    });
    if (tenantPhone) return tenantPhone;

    // 2. Check Module Table
    const modulePhone = await this.prisma.whatsAppPhoneNumberModule.findUnique({
      where: { id },
    });
    if (modulePhone) {
      return {
        ...modulePhone,
        tenantId: modulePhone.moduleType, // Virtual tenantId
      };
    }

    return null;
  }


  /**
   * Ensure tenant has at least one default phone number
   */
  async ensureDefaultExists(tenantId: string): Promise<boolean> {
    const defaultPhone = await this.prisma.whatsAppNumber.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isEnabled: true,
      },
    });

    return !!defaultPhone;
  }
}
