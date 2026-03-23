import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { OrderStatusUpdateDto, ReceiveOrderDto } from './dto/orders.dto';
import { PlaceOrderDto } from './dto/retailer-orders.dto';
import { DistPaymentType } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Distributor-facing ──────────────────────────────────────────────────

  async listInboundOrders(distributorId: string) {
    return this.prisma.distPurchaseOrder.findMany({
      where: { distributorId },
      include: { items: { include: { catalogItem: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(distributorId: string, orderId: string) {
    const order = await this.prisma.distPurchaseOrder.findFirst({
      where: { id: orderId, distributorId },
      include: { items: { include: { catalogItem: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(distributorId: string, orderId: string, dto: OrderStatusUpdateDto) {
    const order = await this.prisma.distPurchaseOrder.findFirst({
      where: { id: orderId, distributorId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const data: any = { status: dto.status };
    if (dto.notes) data.notes = dto.notes;
    if (dto.status === 'SHIPPED') data.shippedAt = new Date();
    if (dto.status === 'DELIVERED') data.deliveredAt = new Date();

    return this.prisma.distPurchaseOrder.update({ where: { id: orderId }, data });
  }

  // ─── Retailer-facing ─────────────────────────────────────────────────────

  async placeOrder(retailerId: string, dto: PlaceOrderDto) {
    // Verify retailer is actively linked to the distributor
    const link = await this.prisma.distDistributorRetailer.findUnique({
      where: {
        distributorId_retailerId: {
          distributorId: dto.distributorId,
          retailerId,
        },
      },
    });
    if (!link || link.status !== 'ACTIVE') {
      throw new BadRequestException('You are not linked to this distributor');
    }

    // Fetch all catalog items in order
    const itemIds = dto.items.map((i) => i.catalogItemId);
    const catalogItems = await this.prisma.distCatalogItem.findMany({
      where: { id: { in: itemIds }, distributorId: dto.distributorId, isActive: true },
    });

    if (catalogItems.length !== itemIds.length) {
      throw new BadRequestException('One or more catalog items are invalid or inactive');
    }

    // Calculate total
    let total = 0;
    const orderItems = dto.items.map((item) => {
      const catalogItem = catalogItems.find((ci) => ci.id === item.catalogItemId)!;
      const lineTotal = Number(catalogItem.unitPrice) * item.quantity;
      total += lineTotal;
      return {
        catalogItemId: item.catalogItemId,
        quantityOrdered: item.quantity,
        quantityReceived: 0,
        unitPriceAtOrder: catalogItem.unitPrice,
      };
    });

    // Generate order number
    const count = await this.prisma.distPurchaseOrder.count();
    const orderNumber = `PO-DIST-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.distPurchaseOrder.create({
      data: {
        distributorId: dto.distributorId,
        retailerId,
        orderNumber,
        totalAmount: total,
        paymentType: dto.paymentType ?? DistPaymentType.CASH,
        notes: dto.notes,
        items: { create: orderItems },
      },
      include: { items: true },
    });
  }

  async listRetailerOrders(retailerId: string) {
    return this.prisma.distPurchaseOrder.findMany({
      where: { retailerId },
      include: {
        distributor: { select: { id: true, name: true } },
        items: { include: { catalogItem: { select: { name: true, brand: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** GRN: Mark delivered + create product mappings for sales attribution later */
  async receiveOrder(retailerId: string, orderId: string, dto: ReceiveOrderDto) {
    const order = await this.prisma.distPurchaseOrder.findFirst({
      where: { id: orderId, retailerId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Create product mappings & update received quantities in one transaction
    await this.prisma.$transaction(async (tx) => {
      for (const ri of dto.items) {
        const orderItem = order.items.find((oi) => oi.id === ri.orderItemId);
        if (!orderItem) continue;

        // Upsert product mapping (distributor catalog ↔ retailer ERP product)
        await tx.distProductMapping.upsert({
          where: {
            retailerId_catalogItemId: {
              retailerId,
              catalogItemId: orderItem.catalogItemId,
            },
          },
          create: {
            retailerId,
            catalogItemId: orderItem.catalogItemId,
            retailerProductId: ri.retailerProductId,
          },
          update: {
            retailerProductId: ri.retailerProductId,
          },
        });

        // Mark quantity received
        await tx.distPurchaseOrderItem.update({
          where: { id: ri.orderItemId },
          data: { quantityReceived: orderItem.quantityOrdered },
        });
      }

      // Mark order as DELIVERED
      await tx.distPurchaseOrder.update({
        where: { id: orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    });

    return { success: true, message: 'Order received and product mappings created' };
  }
}
