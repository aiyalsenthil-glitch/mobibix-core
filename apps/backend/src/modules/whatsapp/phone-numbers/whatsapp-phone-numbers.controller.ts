import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { WhatsAppPhoneNumbersService } from './whatsapp-phone-numbers.service';
import { UserRole, WhatsAppPhoneNumberPurpose } from '@prisma/client';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { VirtualTenantGuard } from '../guards/virtual-tenant.guard';

@Controller('whatsapp/phone-numbers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, VirtualTenantGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppPhoneNumbersController {
  private readonly logger = new Logger(WhatsAppPhoneNumbersController.name);

  constructor(
    private readonly phoneNumbersService: WhatsAppPhoneNumbersService,
  ) {}

  /**
   * GET /whatsapp/phone-numbers/:moduleType
   * List all phone numbers for a module (module-level defaults)
   */
  @Get(':moduleType')
  async listPhoneNumbers(
    @Param('moduleType') moduleType: string,
    @Req() req: any,
  ) {
    // Role and Tenant validation handled by Guards
    const role = (req.user?.role?.toUpperCase() as UserRole) || UserRole.USER;

    const phones = await this.phoneNumbersService.listPhoneNumbers(moduleType);
    return phones.map((p) =>
      this.phoneNumbersService.sanitizePhoneNumber(p, role),
    );
  }

  /**
   * POST /whatsapp/phone-numbers/:moduleType
   * Create a new phone number for a module (ADMIN ONLY)
   *
   * ⚠️ ADMIN-ONLY ENFORCEMENT: Only ADMIN and SUPER_ADMIN roles can create
   * shared/platform-level phone numbers. Prevents unauthorized phone number provisioning.
   */
  @Post(':moduleType')
  async createPhoneNumber(
    @Param('moduleType') moduleType: string,
    @Body()
    body: {
      phoneNumber: string;
      phoneNumberId: string;
      wabaId: string;
      purpose: WhatsAppPhoneNumberPurpose;
      isDefault?: boolean;
    },
    @Req() req: any,
  ) {
    // ✅ ENFORCE ADMIN-ONLY ACCESS
    const userRole = (req.user?.role as UserRole) || UserRole.USER;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only platform admins (ADMIN role) can create WhatsApp phone numbers',
      );
    }

    this.logger.log(
      `[ADMIN] Creating phone number for module ${moduleType} by ${userRole}`,
    );

    return this.phoneNumbersService.createPhoneNumber({
      tenantId: moduleType,
      phoneNumber: body.phoneNumber,
      phoneNumberId: body.phoneNumberId,
      wabaId: body.wabaId,
      purpose: body.purpose,
      isDefault: body.isDefault,
    });
  }

  /**
   * PATCH /whatsapp/phone-numbers/:id
   * Update phone number settings (OWNER can only set default/active)
   */
  @Patch(':id')
  async updatePhoneNumber(
    @Param('id') id: string,
    @Body()
    body: {
      purpose?: WhatsAppPhoneNumberPurpose;
      isDefault?: boolean;
      isActive?: boolean;
      qualityRating?: string;
    },
    @Req() req: any,
  ) {
    const role = (req.user?.role?.toUpperCase() as UserRole) || UserRole.USER;

    if (role === UserRole.OWNER) {
      const phoneNumber = await this.phoneNumbersService.getPhoneNumberById(id);
      if (!phoneNumber || phoneNumber.tenantId !== req.user.tenantId) {
        throw new BadRequestException(
          'Unauthorized - Can only update own tenant numbers',
        );
      }
    }

    return this.phoneNumbersService.updatePhoneNumber(id, body);
  }

  /**
   * DELETE /whatsapp/phone-numbers/:id
   * Delete a phone number (ADMIN ONLY)
   *
   * ⚠️ ADMIN-ONLY ENFORCEMENT: Only ADMIN and SUPER_ADMIN roles can delete
   * phone numbers. Prevents unauthorized removal of communication channels.
   */
  @Delete(':id')
  async deletePhoneNumber(@Param('id') id: string, @Req() req: any) {
    // ✅ ENFORCE ADMIN-ONLY ACCESS
    const userRole = (req.user?.role as UserRole) || UserRole.USER;
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only platform admins (ADMIN role) can delete WhatsApp phone numbers',
      );
    }

    this.logger.log(`[ADMIN] Deleting phone number ${id} by ${userRole}`);

    return this.phoneNumbersService.deletePhoneNumber(id);
  }
}
