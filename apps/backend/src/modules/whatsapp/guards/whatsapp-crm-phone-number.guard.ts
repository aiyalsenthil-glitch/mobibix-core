import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class WhatsAppCrmPhoneNumberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }

    // ── FIX: Query WhatsAppPhoneNumber table directly ──────────
    // Previously checked deprecated Tenant.whatsappPhoneNumberId field.
    // Now checks for any active phone number in the WhatsAppPhoneNumber table.
    const activeNumber = await this.prisma.whatsAppPhoneNumber.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!activeNumber) {
      throw new ForbiddenException('WHATSAPP_CRM_PHONE_NUMBER_REQUIRED');
    }

    return true;
  }
}
