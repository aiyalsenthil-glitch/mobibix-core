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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { WhatsAppPhoneNumbersService } from './whatsapp-phone-numbers.service';
import { UserRole, WhatsAppPhoneNumberPurpose } from '@prisma/client';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { VirtualTenantGuard } from '../guards/virtual-tenant.guard';

@Controller('whatsapp/phone-numbers')
@UseGuards(JwtAuthGuard, RolesGuard, VirtualTenantGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
export class WhatsAppPhoneNumbersController {
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
    const user = req.user;
    const role = (user?.role?.toUpperCase() as UserRole) || UserRole.USER;

    // Owners can only view numbers for their own tenant
    if (role === UserRole.OWNER && moduleType !== user.tenantId) {
      throw new BadRequestException(
        'Unauthorized - Can only view own tenant numbers',
      );
    }

    this.validateAccess(req, [
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
    ]);

    const phones = await this.phoneNumbersService.listPhoneNumbers(moduleType);
    return phones.map((p) =>
      this.phoneNumbersService.sanitizePhoneNumber(p, role),
    );
  }

  /**
   * POST /whatsapp/phone-numbers/:moduleType
   * Create a new phone number for a module (ADMIN ONLY)
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
    this.validateAccess(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

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
    this.validateAccess(req, [
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
    ]);

    // Validate ownership for OWNER role
    const user = req.user;
    const role = (user?.role?.toUpperCase() as UserRole) || UserRole.USER;

    if (role === UserRole.OWNER) {
      const phoneNumber = await this.phoneNumbersService.getPhoneNumberById(id);
      if (!phoneNumber || phoneNumber.tenantId !== user.tenantId) {
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
   */
  @Delete(':id')
  async deletePhoneNumber(@Param('id') id: string, @Req() req: any) {
    this.validateAccess(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
    return this.phoneNumbersService.deletePhoneNumber(id);
  }

  /**
   * Validate user has access
   */
  private validateAccess(req: any, allowedRoles: UserRole[]) {
    const user = req.user;
    const userRole = (user?.role?.toUpperCase() as UserRole) || UserRole.USER;

    if (!allowedRoles.includes(userRole)) {
      throw new BadRequestException(
        `Unauthorized - Required roles: ${allowedRoles.join(', ')}`,
      );
    }
  }
}
