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

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappPhoneNumberId: true },
    });

    if (!tenant?.whatsappPhoneNumberId) {
      throw new ForbiddenException('WHATSAPP_CRM_PHONE_NUMBER_REQUIRED');
    }

    return true;
  }
}
