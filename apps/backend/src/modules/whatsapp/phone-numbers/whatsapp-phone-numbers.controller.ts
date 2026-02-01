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
import { WhatsAppPhoneNumberPurpose } from '@prisma/client';

@Controller('whatsapp/phone-numbers')
@UseGuards(JwtAuthGuard)
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
    this.validateAccess(req);
    return this.phoneNumbersService.listPhoneNumbers(moduleType);
  }

  /**
   * POST /whatsapp/phone-numbers/:moduleType
   * Create a new phone number for a module
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
    this.validateAccess(req);

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
   * Update phone number settings
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
    // TODO: Add tenant validation based on phone number's tenantId
    return this.phoneNumbersService.updatePhoneNumber(id, body);
  }

  /**
   * DELETE /whatsapp/phone-numbers/:id
   * Delete a phone number
   */
  @Delete(':id')
  async deletePhoneNumber(@Param('id') id: string, @Req() req: any) {
    // TODO: Add tenant validation based on phone number's tenantId
    return this.phoneNumbersService.deletePhoneNumber(id);
  }

  /**
   * Validate user has admin access
   */
  private validateAccess(req: any) {
    const user = req.user as any;
    const userRole = user?.role as string;

    // Role is uppercase from UserTenant (ADMIN, STAFF, etc.)
    if (!userRole || userRole.toUpperCase() !== 'ADMIN') {
      throw new BadRequestException('Unauthorized - Admin access required');
    }
  }
}
