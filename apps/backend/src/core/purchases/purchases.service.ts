import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto, PurchaseStatus } from './dto/update-purchase.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PurchaseResponseDto } from './dto/purchase.response.dto';
import { StockService } from '../../core/stock/stock.service';
import { PartiesService } from '../parties/parties.service';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly partiesService: PartiesService,
  ) {}

  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Create a new purchase invoice
   */
  async create(
    tenantId: string,
    dto: CreatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      // 🛡️ Party Role Validation & Auto-Upgrade
      if (dto.globalSupplierId) {
        const party = await tx.party.findUnique({
          where: { id: dto.globalSupplierId },
        });

        if (!party || party.tenantId !== tenantId) {
          throw new NotFoundException('Party not found');
        }

        if (party.partyType === 'CUSTOMER') {
          // Auto-upgrade to BOTH
          await tx.party.update({
            where: { id: party.id },
            data: { partyType: 'BOTH' },
          });
        }
      }

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

      const status = dto.status || 'DRAFT';

      // Calculate totals from items
      let subTotal = 0;
      let totalGst = 0;

      const itemsData = dto.items.map((item) => {
        // Convert input Rupees to Paisa
        const purchasePricePaisa = this.toPaisa(item.purchasePrice);

        const itemSubTotal = purchasePricePaisa * item.quantity;
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
          purchasePrice: purchasePricePaisa, // Store Paisa
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
          supplierGstin: dto.supplierGstin,
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
          status,
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

      // 🛡️ AUTO-SUBMIT: Process stock and cost if status is SUBMITTED
      if (status === 'SUBMITTED') {
        for (const item of purchase.items) {
          if (item.shopProductId) {
            // 1. Record Consolidated Stock In
            await this.stockService.recordStockIn(
              tenantId,
              purchase.shopId,
              item.shopProductId,
              item.quantity,
              'PURCHASE',
              purchase.id,
              item.purchasePrice,
              undefined,
              tx,
            );

            // 2. Update Cost Price (LPP)
            await tx.shopProduct.update({
              where: { id: item.shopProductId },
              data: { costPrice: item.purchasePrice },
            });
          }
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
    // SECURITY FIX: Use composite key to prevent cross-tenant access
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
    });

    if (!purchase) {
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
        ...(dto.supplierGstin && { supplierGstin: dto.supplierGstin }),
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
    // SECURITY FIX: Use composite key to prevent cross-tenant access
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
    });

    if (!purchase) {
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
        throw new NotFoundException(
          `Purchase with ID "${purchaseId}" not found`,
        );
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

  async atomicPurchaseSubmit(
    tenantId: string,
    purchaseId: string,
  ): Promise<void> {
    // Validation 1: Purchase exists and belongs to tenant
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new NotFoundException('Purchase not found');
    }

    // Validation 2: Cannot submit if already submitted/paid
    if (purchase.status !== 'DRAFT') {
      throw new ConflictException(
        `Purchase cannot be submitted. Current status: ${purchase.status}`,
      );
    }

    // Validation 3: Must have items
    if (!purchase.items || purchase.items.length === 0) {
      throw new BadRequestException('Purchase must have at least one item');
    }

    // Validation 4: GSTIN mandatory if GST > 0
    // Cast to any to avoid TS error if type definition is lagging
    if (purchase.totalGst > 0 && !(purchase as any).supplierGstin) {
      throw new BadRequestException(
        'Supplier GSTIN required for GST purchases (ITC eligibility)',
      );
    }

    // Defensive check: Ensure items is not undefined for further operations
    if (!purchase.items) {
      throw new InternalServerErrorException(
        'Invalid state: purchase items missing after validation',
      );
    }

    // Validation 5: Invoice date validation
    const today = new Date();
    if (purchase.invoiceDate > today) {
      throw new BadRequestException('Invoice date cannot be in future');
    }

    // Validation 6: 180-day ITC claim window
    const daysSinceInvoice = Math.floor(
      (today.getTime() - purchase.invoiceDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceInvoice > 180) {
      throw new BadRequestException(
        'ITC claim window expired (CGST Act Sec 16 - 180 days)',
      );
    }

    // Atomic transaction: Submit purchase + Create stock ledger entries
    await this.prisma.$transaction(
      async (tx) => {
        // Double-check status inside transaction (Serializable isolation)
        const currentStatus = await tx.purchase.findUnique({
          where: { id: purchaseId },
        });

        if (currentStatus && currentStatus.status !== 'DRAFT') {
          throw new ConflictException(
            'Purchase already submitted by another request',
          );
        }

        // Update purchase status to SUBMITTED
        await tx.purchase.update({
          where: { id: purchaseId },
          data: { status: 'SUBMITTED' },
        });

        // Create stock ledger entries for each item
        // 🛡️ STOCK IN & COST UPDATE (Tier-2 Hardening)
        // Iterate items to record stock and update Last Purchase Price
        for (const item of purchase.items) {
          if (item.shopProductId) {
            // 1. Record Consolidated Stock In
            await this.stockService.recordStockIn(
              tenantId,
              purchase.shopId,
              item.shopProductId,
              item.quantity,
              'PURCHASE',
              purchase.id,
              item.purchasePrice,
              undefined, // imeis (Future: Extract from strict PurchaseItemIMEI relation if added)
              tx,
            );

            // 2. Update Cost Price (LPP)
            await tx.shopProduct.update({
              where: { id: item.shopProductId },
              data: { costPrice: item.purchasePrice },
            });
          }
        }
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }
}
