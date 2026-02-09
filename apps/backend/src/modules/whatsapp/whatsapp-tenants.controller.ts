import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('whatsapp/modules')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF)
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
