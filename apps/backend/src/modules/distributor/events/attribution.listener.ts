import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SaleCompletedEvent } from '../events/sale-completed.event';

@Injectable()
export class DistributorAttributionListener {
  private readonly logger = new Logger(DistributorAttributionListener.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listen to 'sale.completed' events from the ERP invoice module.
   * For each sale item, check if it came from a distributor via DistProductMapping.
   * If matched, write a DistSaleAttributionLog entry.
   *
   * This is FULLY ASYNC — sale creation never waits for this.
   */
  @OnEvent('sale.completed', { async: true })
  async handleSaleCompleted(event: SaleCompletedEvent) {
    const { tenantId, invoiceId, items } = event;

    for (const item of items) {
      try {
        // Look up if this shopProduct is mapped to any distributor catalog item
        const mapping = await this.prisma.distProductMapping.findFirst({
          where: {
            retailerId: tenantId,
            retailerProductId: item.shopProductId,
          },
          include: {
            catalogItem: {
              select: { id: true, distributorId: true },
            },
          },
        });

        if (!mapping) continue; // Not a distributor-sourced product — skip

        const saleDate = item.invoiceDate ?? new Date();
        const year = saleDate.getFullYear();
        const month = String(saleDate.getMonth() + 1).padStart(2, '0');
        const week = this.getISOWeek(saleDate);

        await this.prisma.distSaleAttributionLog.create({
          data: {
            distributorId: mapping.catalogItem.distributorId,
            retailerId: tenantId,
            catalogItemId: mapping.catalogItem.id,
            saleItemRef: item.invoiceItemId,    // opaque reference, NOT a FK
            quantitySold: item.quantity,
            revenueAmount: (item.lineTotal / 100).toFixed(2), // paise → rupees
            saleDate: saleDate,
            weekBucket: `${year}-W${String(week).padStart(2, '0')}`,
            monthBucket: `${year}-${month}`,
          },
        });

        this.logger.log(
          `✅ Sale attributed: Dist=${mapping.catalogItem.distributorId} Retailer=${tenantId} Item=${item.shopProductId} Qty=${item.quantity}`,
        );
      } catch (err: any) {
        // Never propagate — log and continue to next item
        this.logger.error(
          `Attribution failed for item ${item.shopProductId} in invoice ${invoiceId}: ${err.message}`,
        );
      }
    }
  }

  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
