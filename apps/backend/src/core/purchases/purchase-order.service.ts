import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { POStatus, Prisma } from '@prisma/client';
import { CreatePurchaseOrderDto } from './dto/po/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/po/update-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/po/purchase-order.response.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new purchase order
   */
  async create(
    tenantId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    // 1. Check for duplicate PO number in the same shop
    const existingPO = await this.prisma.purchaseOrder.findFirst({
      where: {
        shopId: dto.shopId,
        poNumber: dto.poNumber,
      },
    });

    if (existingPO) {
      throw new ConflictException(
        `Purchase Order "${dto.poNumber}" already exists for this shop`,
      );
    }

    // 2. Fetch Supplier Defaults if available
    let paymentDueDays = dto.paymentDueDays || 30;
    let preferredCurrency = dto.currency || 'INR';

    if (dto.globalSupplierId) {
      const supplier = await this.prisma.party.findUnique({
        where: { id: dto.globalSupplierId },
        include: { supplierProfile: true },
      });

      if (supplier?.supplierProfile) {
        paymentDueDays = dto.paymentDueDays || supplier.supplierProfile.paymentDueDays;
        preferredCurrency = dto.currency || supplier.supplierProfile.preferredCurrency;
      }
    }

    // 3. Calculate Estimated Total
    let totalEstimatedAmount = 0;
    const itemsData = dto.items.map((item) => {
      const estimatedPrice = item.estimatedPrice || 0;
      totalEstimatedAmount += estimatedPrice * item.quantity;

      return {
        globalProductId: item.globalProductId,
        description: item.description,
        quantity: item.quantity,
        estimatedPrice: estimatedPrice,
        uom: item.uom || 'pcs',
      };
    });

    // 4. Create PO with Items
    const po = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        poNumber: dto.poNumber,
        globalSupplierId: dto.globalSupplierId,
        supplierName: dto.supplierName,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
        totalEstimatedAmount,
        currency: preferredCurrency,
        exchangeRate: new Prisma.Decimal(dto.exchangeRate || 1.0),
        paymentDueDays,
        notes: dto.notes,
        status: POStatus.DRAFT,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return this.mapToResponseDto(po);
  }

  /**
   * Transition PO status with strict state machine validation
   */
  async transitionStatus(
    tenantId: string,
    id: string,
    newStatus: POStatus,
    userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found`);
    }

    const currentStatus = po.status;

    // Strict State Machine Transitions
    const allowedTransitions: Record<POStatus, POStatus[]> = {
      [POStatus.DRAFT]: [POStatus.ORDERED, POStatus.CANCELLED],
      [POStatus.ORDERED]: [POStatus.DISPATCHED, POStatus.CANCELLED],
      [POStatus.DISPATCHED]: [POStatus.PARTIALLY_RECEIVED, POStatus.RECEIVED, POStatus.CANCELLED],
      [POStatus.PARTIALLY_RECEIVED]: [POStatus.RECEIVED, POStatus.CANCELLED],
      [POStatus.RECEIVED]: [], // Terminal state (via GRN)
      [POStatus.CANCELLED]: [], // Terminal state
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid transition from ${currentStatus} to ${newStatus}`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
      include: { items: true },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Find all POs with filters
   */
  async findAll(
    tenantId: string,
    options: {
      shopId?: string;
      supplierId?: string;
      status?: POStatus;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const { shopId, supplierId, status, skip = 0, take = 50 } = options;

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      ...(shopId && { shopId }),
      ...(supplierId && { globalSupplierId: supplierId }),
      ...(status && { status }),
    };

    const [total, data] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
    ]);

    return {
      total,
      data: data.map((po) => this.mapToResponseDto(po)),
      page: Math.floor(skip / take) + 1,
      limit: take,
    };
  }

  /**
   * Find a single PO
   */
  async findOne(tenantId: string, id: string): Promise<PurchaseOrderResponseDto> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found`);
    }

    return this.mapToResponseDto(po);
  }

  /**
   * Update a PO
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with ID "${id}" not found`);
    }

    // Only allow updates if in DRAFT or ORDERED status
    if (po.status !== POStatus.DRAFT && po.status !== POStatus.ORDERED) {
      throw new BadRequestException(
        `Cannot update Purchase Order with status ${po.status}`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(dto.expectedDelivery && { expectedDelivery: new Date(dto.expectedDelivery) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.exchangeRate && { exchangeRate: new Prisma.Decimal(dto.exchangeRate) }),
        ...(dto.paymentDueDays && { paymentDueDays: dto.paymentDueDays }),
      },
      include: { items: true },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Map Prisma PO to response DTO
   */
  private mapToResponseDto(po: any): PurchaseOrderResponseDto {
    return {
      id: po.id,
      tenantId: po.tenantId,
      shopId: po.shopId,
      poNumber: po.poNumber,
      globalSupplierId: po.globalSupplierId,
      supplierName: po.supplierName,
      orderDate: po.orderDate,
      expectedDelivery: po.expectedDelivery,
      totalEstimatedAmount: po.totalEstimatedAmount, // Paisa
      currency: po.currency,
      exchangeRate: Number(po.exchangeRate),
      paymentDueDays: po.paymentDueDays,
      notes: po.notes,
      status: po.status,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      items: po.items.map((item: any) => ({
        id: item.id,
        globalProductId: item.globalProductId,
        description: item.description,
        quantity: item.quantity,
        estimatedPrice: item.estimatedPrice,
        receivedQuantity: item.receivedQuantity,
        uom: item.uom,
      })),
    };
  }
}
