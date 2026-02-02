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

interface CreateWhatsAppSettingDto {
  enabled: boolean;
  provider: 'META' | 'TWILIO' | 'OTHER';
  defaultLanguage?: string;
  dailyLimit?: number;
  testPhone?: string;
}

@Controller('whatsapp/settings')
@UseGuards(JwtAuthGuard)
export class WhatsAppSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /whatsapp/settings/:moduleType
   * Get module-level WhatsApp settings
   * moduleType: "GYM" or "MOBILE_SHOP"
   */
  @Get(':moduleType')
  async getSettings(@Param('moduleType') moduleType: string, @Req() req: any) {
    const user = req.user as any;
    const userRole = (user?.role?.toUpperCase() as string) || 'USER';

    // Owners can only access their own tenant settings
    if (userRole === 'OWNER' && moduleType !== user.tenantId) {
      throw new BadRequestException('Unauthorized - Can only access own tenant settings');
    }

    // Role is uppercase from UserTenant (ADMIN, STAFF, etc.)
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'OWNER') {
      throw new BadRequestException('Unauthorized - Insufficient permissions');
    }

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
   */
  @Post(':moduleType')
  async createSettings(
    @Param('moduleType') moduleType: string,
    @Body() dto: CreateWhatsAppSettingDto,
    @Req() req: any,
  ) {
    const user = req.user as any;
    const userRole = (user?.role?.toUpperCase() as string) || 'USER';

    // Owners can only access their own tenant settings
    if (userRole === 'OWNER' && moduleType !== user.tenantId) {
      throw new BadRequestException('Unauthorized - Can only create own tenant settings');
    }

    // Role is uppercase from UserTenant (ADMIN, STAFF, etc.)
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'OWNER') {
      throw new BadRequestException('Unauthorized - Insufficient permissions');
    }

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
   */
  @Patch(':moduleType')
  async updateSettings(
    @Param('moduleType') moduleType: string,
    @Body() dto: Partial<CreateWhatsAppSettingDto>,
    @Req() req: any,
  ) {
    const user = req.user as any;
    const userRole = (user?.role?.toUpperCase() as string) || 'USER';

    // Owners can only access their own tenant settings
    if (userRole === 'OWNER' && moduleType !== user.tenantId) {
      throw new BadRequestException('Unauthorized - Can only update own tenant settings');
    }

    // Role is uppercase from UserTenant (ADMIN, STAFF, etc.)
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'OWNER') {
      throw new BadRequestException('Unauthorized - Insufficient permissions');
    }

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
   */
  @Delete(':moduleType')
  async deleteSettings(
    @Param('moduleType') moduleType: string,
    @Req() req: any,
  ) {
    const user = req.user as any;
    const userRole = (user?.role?.toUpperCase() as string) || 'USER';

    // Restricted for OWNER
    if (userRole === 'OWNER') {
      throw new BadRequestException('Unauthorized - Owners cannot delete WhatsApp settings');
    }

    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new BadRequestException('Unauthorized - Admin access required');
    }

    await this.prisma.whatsAppSetting.delete({
      where: { tenantId: moduleType },
    });

    return { success: true };
  }
}
