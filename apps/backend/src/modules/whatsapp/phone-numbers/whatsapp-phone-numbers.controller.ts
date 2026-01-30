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
   * GET /whatsapp/phone-numbers/:tenantId
   * List all phone numbers for a tenant
   */
  @Get(':tenantId')
  async listPhoneNumbers(@Param('tenantId') tenantId: string, @Req() req: any) {
    this.validateAccess(req, tenantId);
    return this.phoneNumbersService.listPhoneNumbers(tenantId);
  }

  /**
   * POST /whatsapp/phone-numbers/:tenantId
   * Create a new phone number
   */
  @Post(':tenantId')
  async createPhoneNumber(
    @Param('tenantId') tenantId: string,
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
    this.validateAccess(req, tenantId);

    return this.phoneNumbersService.createPhoneNumber({
      tenantId,
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
   * Validate user has access to tenant
   */
  private validateAccess(req: any, tenantId: string) {
    const user = req.user as any;
    if (user?.role !== 'admin' && (user?.tenantId as string) !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }
  }
}
