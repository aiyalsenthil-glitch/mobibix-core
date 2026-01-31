import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@Controller('whatsapp/modules')
@UseGuards(JwtAuthGuard)
export class WhatsAppTenantsController {
  private readonly logger = new Logger(WhatsAppTenantsController.name);

  @Get()
  getTenants() {
    this.logger.log('GET /tenants called - Returning module types');
    // Return module types as "tenants" for the WhatsApp Master UI
    return [
      { id: 'GYM', name: 'Gym Management' },
      { id: 'MOBILE_SHOP', name: 'Mobile Shop' },
    ];
  }
}
