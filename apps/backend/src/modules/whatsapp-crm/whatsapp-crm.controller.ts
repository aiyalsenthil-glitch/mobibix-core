import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { WhatsAppCrmService } from './whatsapp-crm.service';

@Controller('user/whatsapp-crm')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class WhatsAppCrmController {
  constructor(private readonly whatsappCrmService: WhatsAppCrmService) {}

  @Get('status')
  async getStatus(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.whatsappCrmService.getStatus(tenantId);
  }
}
