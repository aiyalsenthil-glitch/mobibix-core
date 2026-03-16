import { Controller, Get, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PriceAlertStatus } from '@prisma/client';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';

@Controller('price-alerts')
@UseGuards(JwtAuthGuard)
export class PriceAlertController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Permissions(Permission.INVENTORY_VIEW)
  async list(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('status') status?: PriceAlertStatus,
  ) {
    const alerts = await this.prisma.supplierPriceAlert.findMany({
      where: {
        tenantId: req.user.tenantId,
        shopId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
      },
    });
    return alerts.map((a) => ({
      ...a,
      previousPrice: a.previousPrice / 100,
      newPrice: a.newPrice / 100,
      priceDrop: a.priceDrop / 100,
      potentialCredit: a.potentialCredit / 100,
    }));
  }

  @Patch(':id/dismiss')
  @Permissions(Permission.INVENTORY_MANAGE)
  async dismiss(@Req() req, @Param('id') id: string) {
    const alert = await this.prisma.supplierPriceAlert.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });
    if (!alert) return { error: 'Not found' };
    return this.prisma.supplierPriceAlert.update({
      where: { id },
      data: { status: PriceAlertStatus.DISMISSED, dismissedAt: new Date() },
    });
  }

  @Patch(':id/claim')
  @Permissions(Permission.INVENTORY_MANAGE)
  async claim(@Req() req, @Param('id') id: string) {
    const alert = await this.prisma.supplierPriceAlert.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });
    if (!alert) return { error: 'Not found' };
    return this.prisma.supplierPriceAlert.update({
      where: { id },
      data: { status: PriceAlertStatus.CLAIMED },
    });
  }
}
