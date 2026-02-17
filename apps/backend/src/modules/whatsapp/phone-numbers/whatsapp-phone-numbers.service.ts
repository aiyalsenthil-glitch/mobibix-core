import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  UserRole,
  WhatsAppPhoneNumberPurpose,
  ModuleType,
} from '@prisma/client';
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
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return numbers.map((num) => ({
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
        purpose,
        isEnabled: true,
      },
    });

    if (phoneNumber) {
      return phoneNumber;
    }

    // Fallback to tenant default if no purpose-specific found
    phoneNumber = await this.prisma.whatsAppNumber.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isEnabled: true,
      },
    });

    if (phoneNumber) {
      return phoneNumber;
    }

    // ─────────────────────────────────────────────────────────────
    // NEW: Fallback to Module-Level Defaults (Shared Numbers)
    // ─────────────────────────────────────────────────────────────

    // CRM tenants must use their own number.
    if (routingTrack === 'TENANT_OWNED') {
      throw new NotFoundException(
        `No active tenant-owned WhatsApp number found for purpose ${purpose}. CRM Add-on requires your own number.`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    const moduleType = (tenant?.tenantType as ModuleType) ?? ModuleType.GYM;

    // Try module purpose-specific (tenantId must be null for shared numbers)
    phoneNumber = await this.prisma.whatsAppNumber.findFirst({
      where: {
        tenantId: null,
        moduleType,
        purpose,
        isEnabled: true,
      },
    });

    // Try module default
    if (!phoneNumber) {
      phoneNumber = await this.prisma.whatsAppNumber.findFirst({
        where: {
          tenantId: null,
          moduleType,
          isEnabled: true,
          OR: [
            { isDefault: true },
            { purpose: WhatsAppPhoneNumberPurpose.DEFAULT },
          ],
        },
      });
    }

    if (!phoneNumber) {
      throw new NotFoundException(
        `No active WhatsApp phone number found for tenant ${tenantId} or module ${moduleType} for purpose ${purpose}`,
      );
    }

    return phoneNumber;
  }

  /**
   * List all phone numbers for a tenant
   */
  async listPhoneNumbers(tenantId: string) {
    // 1. Resolve module type
    let moduleType: ModuleType;

    const knownModules = ['GYM', 'MOBILE_SHOP'];
    if (knownModules.includes(tenantId)) {
      moduleType = tenantId as ModuleType;
    } else {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tenantType: true },
      });
      moduleType = (tenant?.tenantType as ModuleType) ?? ModuleType.GYM;
    }

    // 2. Fetch all relevant phone numbers (Tenant-specific OR Module-shared)
    // ⚠️ Do NOT filter by isEnabled - we need to show inactive numbers so they can be toggled
    const allPhones = await this.prisma.whatsAppNumber.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null, moduleType }],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // 3. Map to unified structure - map isEnabled to isActive for frontend compatibility
    return allPhones.map((p) => ({
      ...p,
      isActive: p.isEnabled, // Map for frontend compatibility
      source: p.tenantId ? ('TENANT' as const) : ('MODULE' as const),
      isInherited: !p.tenantId,
      // Ensure virtual tenantId for module numbers if requested for a specific tenant
      tenantId: p.tenantId || tenantId,
      displayNumber: p.displayNumber || this.maskPhoneNumber(p.phoneNumber),
    }));
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
    const knownModules = ['GYM', 'MOBILE_SHOP'];
    const isModule = knownModules.includes(data.tenantId);

    if (isModule) {
      // Module-Level Creation
      const moduleType = data.tenantId as ModuleType;

      if (data.isDefault) {
        await this.prisma.whatsAppNumber.updateMany({
          where: { tenantId: null, moduleType, isDefault: true },
          data: { isDefault: false },
        });
      }

      const created = await this.prisma.whatsAppNumber.create({
        data: {
          tenantId: null,
          moduleType,
          phoneNumber: data.phoneNumber,
          phoneNumberId: data.phoneNumberId,
          wabaId: data.wabaId,
          purpose: data.purpose,
          isDefault: data.isDefault || false,
          isEnabled: true,
          displayNumber: data.phoneNumber,
        },
      });

      return {
        ...created,
        tenantId: data.tenantId, // Return as requested (Virtual)
        isInherited: true,
        source: 'MODULE' as const,
      };
    }

    // Tenant-Level Creation
    if (data.isDefault) {
      await this.prisma.whatsAppNumber.updateMany({
        where: { tenantId: data.tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // 🔒 GUARDRAIL: Plan Limits
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
      select: { tenantType: true },
    });
    const module = (tenant?.tenantType as ModuleType) ?? ModuleType.GYM;

    const planRules = await this.planRulesService.getPlanRulesForTenant(
      data.tenantId,
      module,
    );
    const maxNumbers = planRules?.whatsapp?.maxNumbers ?? 1;

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
        moduleType: module,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        wabaId: data.wabaId,
        purpose: data.purpose,
        isDefault: data.isDefault || false,
        isEnabled: true,
        displayNumber: data.phoneNumber,
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
    const storedPhone = await this.prisma.whatsAppNumber.findUnique({
      where: { id },
    });

    if (!storedPhone) {
      throw new NotFoundException('Phone number not found');
    }

    if (data.isDefault) {
      await this.prisma.whatsAppNumber.updateMany({
        where: {
          tenantId: storedPhone.tenantId,
          moduleType: storedPhone.tenantId ? undefined : storedPhone.moduleType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.whatsAppNumber.update({
      where: { id },
      data: {
        purpose: data.purpose,
        isDefault: data.isDefault,
        isEnabled: data.isActive,
        qualityRating: data.qualityRating,
        updatedAt: new Date(),
      },
    });

    return {
      ...updated,
      source: updated.tenantId ? 'TENANT' : 'MODULE',
      isInherited: !updated.tenantId,
    };
  }

  /**
   * Delete phone number
   */
  /**
   * Delete phone number
   */
  async deletePhoneNumber(id: string) {
    const phone = await this.prisma.whatsAppNumber.findUnique({
      where: { id },
    });

    if (!phone) {
      throw new NotFoundException('Phone number not found');
    }

    if (phone.isDefault) {
      const count = await this.prisma.whatsAppNumber.count({
        where: {
          tenantId: phone.tenantId,
          moduleType: phone.tenantId ? undefined : phone.moduleType,
        },
      });

      if (count === 1) {
        throw new BadRequestException(
          phone.tenantId
            ? 'Cannot delete the only phone number. Add another one first.'
            : 'Cannot delete the only global number for this module.',
        );
      }

      const anotherActive = await this.prisma.whatsAppNumber.findFirst({
        where: {
          id: { not: id },
          tenantId: phone.tenantId,
          moduleType: phone.tenantId ? undefined : phone.moduleType,
          isEnabled: true,
        },
      });

      if (!anotherActive) {
        throw new BadRequestException(
          'Cannot delete default phone number. Please set another phone number as default first.',
        );
      }

      await this.prisma.whatsAppNumber.update({
        where: { id: anotherActive.id },
        data: { isDefault: true },
      });
    }

    return this.prisma.whatsAppNumber.delete({
      where: { id },
    });
  }

  async getPhoneNumberById(id: string) {
    return this.prisma.whatsAppNumber.findUnique({
      where: { id },
    });
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
