import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { VirtualTenantGuard } from './guards/virtual-tenant.guard';
import { ModuleScope } from '../../core/auth/decorators/module-scope.decorator';

interface CreateWhatsAppSettingDto {
  enabled: boolean;
  provider: 'META' | 'TWILIO' | 'OTHER';
  defaultLanguage?: string;
  dailyLimit?: number;
  testPhone?: string;
}

@Controller('whatsapp/settings')
@ModuleScope(ModuleType.WHATSAPP_CRM)
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, VirtualTenantGuard)
export class WhatsAppSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /whatsapp/settings/:moduleType
   * Get module-level WhatsApp settings
   * moduleType: "GYM" or "MOBILE_SHOP"
   * Accessible by: ADMIN, OWNER, STAFF (read-only for STAFF)
   */
  @Get(':moduleType')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
  async getSettings(@Param('moduleType') moduleType: string, @Req() req: any) {
    // Role validation is handled by RolesGuard
    // Tenant isolation for OWNER is handled by VirtualTenantGuard

    // Use moduleType as the tenantId for module-level settings
    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId: moduleType },
    });

    if (!setting) {
      // Return default settings if not found
      return {
        id: '',
        tenantId: moduleType,
        enabled: false,
        provider: 'META',
        defaultLanguage: 'en',
        dailyLimit: undefined,
        testPhone: undefined,
        marketingOptInRequired: true,
        createdAt: new Date(),
      };
    }

    return setting;
  }

  /**
   * POST /whatsapp/settings/:moduleType
   * Create module-level WhatsApp settings
   * Accessible by: ADMIN, OWNER only (STAFF cannot create)
   */
  @Post(':moduleType')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async createSettings(
    @Param('moduleType') moduleType: string,
    @Body() dto: CreateWhatsAppSettingDto,
    @Req() req: any,
  ) {
    const user = req.user;

    // Tenant isolation: Handled by VirtualTenantGuard + RolesGuard

    const setting = await this.prisma.whatsAppSetting.create({
      data: {
        tenantId: moduleType,
        enabled: dto.enabled,
        provider: dto.provider,
        defaultLanguage: dto.defaultLanguage || 'en',
        dailyLimit: dto.dailyLimit,
        testPhone: dto.testPhone,
      },
    });

    return setting;
  }

  /**
   * PATCH /whatsapp/settings/:moduleType
   * Update module-level WhatsApp settings
   * Accessible by: ADMIN, OWNER only (STAFF cannot update)
   */
  @Patch(':moduleType')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async updateSettings(
    @Param('moduleType') moduleType: string,
    @Body() dto: Partial<CreateWhatsAppSettingDto>,
    @Req() req: any,
  ) {
    const user = req.user;

    // Tenant isolation: Handled by VirtualTenantGuard

    // Check if setting exists
    const existing = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId: moduleType },
    });

    if (!existing) {
      // Create if doesn't exist
      return this.prisma.whatsAppSetting.create({
        data: {
          tenantId: moduleType,
          enabled: dto.enabled ?? false,
          provider: dto.provider ?? 'META',
          defaultLanguage: dto.defaultLanguage || 'en',
          dailyLimit: dto.dailyLimit,
          testPhone: dto.testPhone,
        },
      });
    }

    // Update existing
    return this.prisma.whatsAppSetting.update({
      where: { tenantId: moduleType },
      data: {
        enabled: dto.enabled ?? existing.enabled,
        provider: dto.provider ?? existing.provider,
        defaultLanguage: dto.defaultLanguage ?? existing.defaultLanguage,
        dailyLimit:
          dto.dailyLimit !== undefined ? dto.dailyLimit : existing.dailyLimit,
        testPhone:
          dto.testPhone !== undefined ? dto.testPhone : existing.testPhone,
      },
    });
  }

  /**
   * DELETE /whatsapp/settings/:moduleType
   * Delete module-level WhatsApp settings
   * Accessible by: ADMIN only (OWNER and STAFF cannot delete)
   */
  @Delete(':moduleType')
  @Roles(UserRole.ADMIN)
  async deleteSettings(
    @Param('moduleType') moduleType: string,
    @Req() req: any,
  ) {
    // Only ADMIN can delete (enforced by @Roles decorator)
    // No additional checks needed

    await this.prisma.whatsAppSetting.delete({
      where: { tenantId: moduleType },
    });

    return { success: true };
  }
}
