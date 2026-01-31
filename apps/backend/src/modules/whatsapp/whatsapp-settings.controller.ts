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
   * GET /whatsapp/settings/:tenantId
   * Get WhatsApp settings for a tenant
   */
  @Get(':tenantId')
  async getSettings(@Param('tenantId') tenantId: string, @Req() req: any) {
    // ✅ Allow admins to access any tenant
    // ✅ Allow users to access their own tenant
    const user = req.user as any;
    if (user?.role !== 'admin' && (user?.tenantId as string) !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }

    const setting = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
    });

    if (!setting) {
      // Return default settings if not found
      // Fallback to Tenant setting
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { whatsappEnabled: true },
      });
      
      return {
        id: '',
        tenantId,
        enabled: tenant?.whatsappEnabled ?? false,
        provider: 'META',
        defaultLanguage: 'en',
        dailyLimit: undefined,
        testPhone: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return setting;
  }

  /**
   * POST /whatsapp/settings/:tenantId
   * Create WhatsApp settings for a tenant
   */
  @Post(':tenantId')
  async createSettings(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateWhatsAppSettingDto,
    @Req() req: any,
  ) {
    // ✅ Only admins or tenant owners can create settings
    const user = req.user as any;
    if (user?.role !== 'admin' && (user?.tenantId as string) !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }

    const setting = await this.prisma.whatsAppSetting.create({
      data: {
        tenantId,
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
   * PATCH /whatsapp/settings/:tenantId
   * Update WhatsApp settings
   */
  @Patch(':tenantId')
  async updateSettings(
    @Param('tenantId') tenantId: string,
    @Body() dto: Partial<CreateWhatsAppSettingDto>,
    @Req() req: any,
  ) {
    // ✅ Only admins or tenant owners can update settings
    const user = req.user as any;
    if (user?.role !== 'admin' && (user?.tenantId as string) !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }

    // Check if setting exists
    const existing = await this.prisma.whatsAppSetting.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      // Create if doesn't exist
      return this.prisma.whatsAppSetting.create({
        data: {
          tenantId,
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
      where: { tenantId },
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
   * DELETE /whatsapp/settings/:tenantId
   * Delete WhatsApp settings
   */
  @Delete(':tenantId')
  async deleteSettings(@Param('tenantId') tenantId: string, @Req() req: any) {
    // ✅ Only admins or tenant owners can delete settings
    const user = req.user as any;
    if (user?.role !== 'admin' && (user?.tenantId as string) !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }

    await this.prisma.whatsAppSetting.delete({
      where: { tenantId },
    });

    return { success: true };
  }
}
