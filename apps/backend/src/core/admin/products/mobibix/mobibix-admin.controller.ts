import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../guards/admin-roles.guard';
import { AdminRoles, AdminProduct } from '../../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('admin/mobibix')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.PRODUCT_ADMIN, AdminRole.SUPPORT_ADMIN)
@AdminProduct(ModuleType.MOBILE_SHOP)
export class MobibixAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenants')
  async getTenants() {
    return this.prisma.tenant.findMany({
      where: {
        tenantType: 'MOBILE_SHOP',
      },
      include: {
        subscription: {
            where: { module: 'MOBILE_SHOP' },
            orderBy: { createdAt: 'desc' },
            take: 1
        }
      },
      take: 50,
      orderBy: { createdAt: 'desc' }
    });
  }
}
