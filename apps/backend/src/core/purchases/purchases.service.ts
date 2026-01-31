import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto, PurchaseStatus } from './dto/update-purchase.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PurchaseResponseDto } from './dto/purchase.response.dto';
import { StockService } from '../../core/stock/stock.service';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  /**
   * Create a new purchase invoice
   */
  async create(
    tenantId: string,
    dto: CreatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      // Check if invoice number already exists for this shop
      const existingPurchase = await tx.purchase.findFirst({
        where: {
          shopId: dto.shopId,
          invoiceNumber: dto.invoiceNumber,
        },
      });

      if (existingPurchase) {
        throw new ConflictException(
          `Purchase invoice "${dto.invoiceNumber}" already exists for this shop`,
        );
      }

      // Calculate totals from items
      let subTotal = 0;
      let totalGst = 0;

      const itemsData = dto.items.map((item) => {
        const itemSubTotal = item.purchasePrice * item.quantity;
        const gstRate = item.gstRate || 0;
        const taxAmount = Math.round((itemSubTotal * gstRate) / 100);
        const totalAmount = itemSubTotal + taxAmount;

        subTotal += itemSubTotal;
        totalGst += taxAmount;

        return {
          shopProductId: item.shopProductId,
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          gstRate,
          taxAmount,
          totalAmount,
        };
      });

      const grandTotal = subTotal + totalGst;

      // Create purchase with items
      const purchase = await tx.purchase.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          globalSupplierId: dto.globalSupplierId,
          supplierName: dto.supplierName,
          invoiceNumber: dto.invoiceNumber,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          subTotal,
          totalGst,
          grandTotal,
          paidAmount: 0,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
          cashAmount: dto.cashAmount,
          upiAmount: dto.upiAmount,
          purchaseType: dto.purchaseType || 'Goods',
          taxInclusive: dto.taxInclusive || false,
          status: 'DRAFT',
          notes: dto.notes,
          createdBy: 'system',
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      // 🛡️ STOCK IN ENFORCEMENT
      // Iterate created items to ensure we have the correct IDs and data
      for (const item of purchase.items) {
        await this.stockService.recordStockIn(
          tenantId,
          dto.shopId,
          item.shopProductId!,
          item.quantity,
          'PURCHASE',
          purchase.id, // Reference the Purchase ID
          item.purchasePrice, // Cost per unit (Paisa)
          undefined, // imeis
          tx, // Pass transaction
        );

        // 🛡️ COST PRICE UPDATE (Option A: Last Purchase Price)
        // Always update cost, even if 0 (Replenishment Cost Truth)
        if (item.shopProductId) {
          await tx.shopProduct.update({
            where: { id: item.shopProductId },
            data: { costPrice: item.purchasePrice },
          });
        }
      }

      return this.mapToResponseDto(purchase);
    });
  }

  /**
   * Get all purchases for a tenant/shop
   */
  async findAll(
    tenantId: string,
    options: {
      shopId?: string;
      skip?: number;
      take?: number;
      status?: PurchaseStatus;
      supplierId?: string;
    } = {},
  ): Promise<{
    data: PurchaseResponseDto[];
    total: number;
    page?: number;
    limit?: number;
  }> {
    const { shopId, skip = 0, take = 50, status, supplierId } = options;

    const whereClause: any = { tenantId };

    if (shopId) {
      whereClause.shopId = shopId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (supplierId) {
      whereClause.globalSupplierId = supplierId;
    }

    const total = await this.prisma.purchase.count({ where: whereClause });

    const purchases = await this.prisma.purchase.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: true,
      },
    });

    return {
      data: purchases.map((p) => this.mapToResponseDto(p)),
      total,
      page: Math.floor(skip / take) + 1,
      limit: take,
    };
  }

  /**
   * Get a single purchase by ID
   */
  async findOne(tenantId: string, id: string): Promise<PurchaseResponseDto> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new NotFoundException(`Purchase with ID "${id}" not found`);
    }

    return this.mapToResponseDto(purchase);
  }

  /**
   * Update a purchase
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    const purchase = await this.prisma.purchase.findUnique({ where: { id } });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new NotFoundException(`Purchase with ID "${id}" not found`);
    }

    if (purchase.status === 'PAID' || purchase.status === 'CANCELLED') {
      throw new BadRequestException(
        `Cannot update purchase with status ${purchase.status}`,
      );
    }

    const updated = await this.prisma.purchase.update({
      where: { id },
      data: {
        ...(dto.supplierName && { supplierName: dto.supplierName }),
        ...(dto.invoiceDate && { invoiceDate: new Date(dto.invoiceDate) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
        ...(dto.paymentReference !== undefined && {
          paymentReference: dto.paymentReference,
        }),
        ...(dto.cashAmount !== undefined && { cashAmount: dto.cashAmount }),
        ...(dto.upiAmount !== undefined && { upiAmount: dto.upiAmount }),
        ...(dto.purchaseType && { purchaseType: dto.purchaseType }),
        ...(dto.taxInclusive !== undefined && {
          taxInclusive: dto.taxInclusive,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Cancel a purchase (soft delete)
   */
  async remove(tenantId: string, id: string): Promise<PurchaseResponseDto> {
    const purchase = await this.prisma.purchase.findUnique({ where: { id } });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new NotFoundException(`Purchase with ID "${id}" not found`);
    }

    if (purchase.paidAmount > 0) {
      throw new BadRequestException(
        'Cannot cancel purchase with payments made',
      );
    }

    const cancelled = await this.prisma.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        items: true,
        payments: true,
      },
    });

    return this.mapToResponseDto(cancelled);
  }

  /**
   * Record a payment for a purchase
   */
  async recordPayment(
    tenantId: string,
    purchaseId: string,
    dto: RecordPaymentDto,
  ): Promise<PurchaseResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { payments: true },
      });

      if (!purchase || purchase.tenantId !== tenantId) {
        throw new NotFoundException(`Purchase with ID "${purchaseId}" not found`);
      }

      if (purchase.status === 'CANCELLED') {
        throw new BadRequestException(
          'Cannot record payment for cancelled purchase',
        );
      }

      const outstanding = purchase.grandTotal - purchase.paidAmount;

      if (dto.amount > outstanding) {
        throw new BadRequestException(
          `Payment amount (${dto.amount}) exceeds outstanding amount (${outstanding})`,
        );
      }

      // 1. Create Internal SupplierPayment (Helper Trace)
      const supplierPayment = await tx.supplierPayment.create({
        data: {
          tenantId,
          shopId: purchase.shopId,
          purchaseId: purchase.id,
          globalSupplierId: purchase.globalSupplierId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paymentReference: dto.paymentReference,
          paymentDate: new Date(),
          notes: dto.notes,
          createdBy: 'system',
        },
      });

      // 2. 🛡️ FINANCIAL TRUTH: Create PaymentVoucher (Money OUT)
      const voucherId = `PV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const voucher = await tx.paymentVoucher.create({
        data: {
          tenantId,
          shopId: purchase.shopId,
          voucherId: voucherId,
          voucherType: 'SUPPLIER', // Paying a supplier
          amount: dto.amount,
          date: new Date(),
          paymentMethod: dto.paymentMethod,
          narration: `Payment for Purchase #${purchase.invoiceNumber} (Supplier: ${purchase.supplierName})`,
          linkedPurchaseId: purchase.id, // Linking to Purchase
          // partyName removed
        },
      });

      // 3. 🛡️ LEDGER REFLECTION: Create FinancialEntry (OUT)
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: purchase.shopId,
          type: 'OUT',
          amount: dto.amount,
          mode: dto.paymentMethod,
          referenceType: 'PURCHASE', // Linking back to Purchase context
          referenceId: purchase.id,
          note: `Purchase Payment: ${purchase.invoiceNumber} (Voucher: ${voucher.voucherId})`,
        },
      });

      // 4. Update Purchase Status
      const newPaidAmount = purchase.paidAmount + dto.amount;
      const newStatus =
        newPaidAmount >= purchase.grandTotal
          ? 'PAID'
          : newPaidAmount > 0
            ? 'PARTIALLY_PAID'
            : purchase.status;

      const updated = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      return this.mapToResponseDto(updated);
    });
  }

  /**
   * Get outstanding purchases by supplier
   */
  async getOutstandingBySupplier(tenantId: string, supplierId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        globalSupplierId: supplierId,
        status: { in: ['SUBMITTED', 'PARTIALLY_PAID'] },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    const totalOutstanding = purchases.reduce(
      (sum, p) => sum + (p.grandTotal - p.paidAmount),
      0,
    );

    return {
      supplierId,
      totalOutstanding,
      purchases: purchases.map((p) => this.mapToResponseDto(p)),
    };
  }

  /**
   * Get purchases by supplier
   */
  async getBySupplier(
    tenantId: string,
    supplierId: string,
  ): Promise<{ data: PurchaseResponseDto[]; total: number }> {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        globalSupplierId: supplierId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: true,
      },
    });

    return {
      data: purchases.map((p) => this.mapToResponseDto(p)),
      total: purchases.length,
    };
  }

  /**
   * Map Prisma purchase to response DTO
   */
  private mapToResponseDto(purchase: any): PurchaseResponseDto {
    return {
      id: purchase.id,
      tenantId: purchase.tenantId,
      shopId: purchase.shopId,
      invoiceNumber: purchase.invoiceNumber,
      globalSupplierId: purchase.globalSupplierId,
      supplierName: purchase.supplierName,
      invoiceDate: purchase.invoiceDate,
      dueDate: purchase.dueDate,
      subTotal: purchase.subTotal,
      totalGst: purchase.totalGst,
      grandTotal: purchase.grandTotal,
      paidAmount: purchase.paidAmount,
      outstandingAmount: purchase.grandTotal - purchase.paidAmount,
      paymentMethod: purchase.paymentMethod,
      paymentReference: purchase.paymentReference,
      cashAmount: purchase.cashAmount,
      upiAmount: purchase.upiAmount,
      purchaseType: purchase.purchaseType,
      taxInclusive: purchase.taxInclusive,
      status: purchase.status,
      notes: purchase.notes,
      items: purchase.items?.map((item: any) => ({
        id: item.id,
        shopProductId: item.shopProductId,
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        gstRate: item.gstRate,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount,
      })),
      payments: purchase.payments?.map((payment: any) => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentReference: payment.paymentReference,
        paymentDate: payment.paymentDate,
        notes: payment.notes,
      })),
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }
}
