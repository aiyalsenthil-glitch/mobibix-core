import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KioskAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-kiosk-token'];
    const tenantId = request.params.tenantId;

    if (!token) {
      throw new ForbiddenException('KIOSK_TOKEN_MISSING');
    }

    if (!tenantId) {
      throw new ForbiddenException('TENANT_ID_MISSING');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { kioskToken: true },
    });

    if (!tenant || !tenant.kioskToken || tenant.kioskToken !== token) {
      throw new ForbiddenException('INVALID_KIOSK_TOKEN');
    }

    return true;
  }
}
