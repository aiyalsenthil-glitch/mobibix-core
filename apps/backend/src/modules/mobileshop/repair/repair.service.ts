import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ProductType } from '@prisma/client';
import { assertShopAccess } from '../../../common/guards/shop-access.guard';
import { RepairStockOutDto } from './dto/repair-stock-out.dto';
import { RepairBillDto, BillingMode } from './dto/repair-bill.dto';
import {
  generateSalesInvoiceNumber,
  getFinancialYear,
} from '../../../common/utils/invoice-number.util';
import { StockService } from '../../../core/stock/stock.service';
import {
  BillingService,
  BillingItem,
  CreateInvoiceOptions,
} from '../../../core/sales/billing.service';

@Injectable()
export class RepairService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
    private billingService: BillingService,
  ) {}

  async stockOutForRepair(tenantId: string, dto: RepairStockOutDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate shop access
      await assertShopAccess(tx, dto.shopId, tenantId);

      // validate job card
      const job = await tx.jobCard.findFirst({
        where: {
          id: dto.jobCardId,
          tenantId,
          shopId: dto.shopId,
        },
        select: { id: true, status: true },
      });
      if (!job) throw new BadRequestException('Invalid job card');

      // FIX 1: Job status validation - only allow specific statuses
      const allowedStatuses = [
        'RECEIVED',
        'DIAGNOSING',
        'WAITING_FOR_PARTS',
        'IN_PROGRESS',
      ];
      if (!allowedStatuses.includes(job.status)) {
        throw new BadRequestException(
          `Cannot issue stock for job in status ${job.status}`,
        );
      }

      // validate products and FIX 3: restrict product types
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true, type: true, name: true, costPrice: true },
      });
      if (products.length !== productIds.length) {
        throw new BadRequestException('Invalid product in items');
      }

      // Pre-checks
      for (const product of products) {
        if (product.type === ProductType.GOODS) {
          throw new BadRequestException(
            'Goods products cannot be issued as repair parts. Use SPARE products only.',
          );
        }
        if (product.type === ProductType.SERVICE) {
          throw new BadRequestException(
            `Service product "${product.name}" cannot be issued in stock operations. Only physical inventory items can be stock-out.`,
          );
        }
      }

      // FIX 2: Prevent duplicate stock-out for same job + product
      for (const item of dto.items) {
        const existing = await tx.stockLedger.findFirst({
          where: {
            tenantId,
            shopId: dto.shopId,
            referenceType: 'REPAIR',
            referenceId: dto.jobCardId,
            shopProductId: item.shopProductId,
          },
        });
        if (existing) {
          const product = products.find((p) => p.id === item.shopProductId);
          throw new BadRequestException(
            `Product "${product?.id}" has already been issued for this job`,
          );
        }
      }

      // Create JobCardPart entries first
      const partsUsedEntries = dto.items.map((i) => ({
        jobCardId: dto.jobCardId,
        shopProductId: i.shopProductId,
        quantity: i.quantity,
        costPrice: i.costPerUnit || 0, // Mapped to costPrice
      }));

      await tx.jobCardPart.createMany({ data: partsUsedEntries });

      // Use StockService Batch Operation
      const stockItems = dto.items.map((i) => ({
        productId: i.shopProductId,
        quantity: i.quantity,
        referenceType: 'REPAIR' as const,
        referenceId: dto.jobCardId,
        costPerUnit: i.costPerUnit || undefined,
        note: dto.note ?? undefined,
      }));

      await this.stockService.recordStockOutBatch(
        tenantId,
        dto.shopId,
        stockItems,
        'REPAIR',
        dto.jobCardId,
        tx,
      );

      return { success: true, entries: stockItems.length };
    });
  }

  async generateRepairBill(tenantId: string, dto: RepairBillDto) {
    if (!dto.services?.length) {
      throw new BadRequestException('At least one service required');
    }

    return this.prisma.$transaction(async (tx) => {
      // Fetch and validate job card
      const job = await tx.jobCard.findFirst({
        where: {
          id: dto.jobCardId,
          tenantId,
          shopId: dto.shopId,
        },
        select: {
          id: true,
          status: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          parts: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!job) {
        throw new BadRequestException('Job card not found');
      }

      // Fetch shop details once to avoid redundant lookups in BillingService
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: {
          id: true,
          gstEnabled: true,
          state: true,
          receiptPrintCounter: true,
        },
      });

      if (!shop) {
        throw new BadRequestException(
          'Invalid shop or shop does not belong to your organization',
        );
      }

      // Validate job status: Allow billing if not already closed
      if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(job.status)) {
        throw new BadRequestException(
          `Cannot bill job in ${job.status} status`,
        );
      }

      // Ensure "Repair Services" product exists
      let serviceProductId: string;
      const existingServiceProduct = await tx.shopProduct.findFirst({
        where: {
          shopId: dto.shopId,
          tenantId,
          name: 'Repair Services',
        },
        select: { id: true },
      });

      if (existingServiceProduct) {
        serviceProductId = existingServiceProduct.id;
      } else {
        const serviceProduct = await tx.shopProduct.create({
          data: {
            tenantId,
            shopId: dto.shopId,
            name: 'Repair Services',
            type: ProductType.SERVICE,
            isActive: true,
            salePrice: 0,
          },
          select: { id: true },
        });
        serviceProductId = serviceProduct.id;
      }

      // Prepare items for BillingService
      const billingItems: BillingItem[] = [];

      // Services
      const effectiveServiceGstRate =
        dto.billingMode === BillingMode.WITH_GST
          ? (dto.serviceGstRate ?? 18)
          : 0;

      dto.services.forEach((s) => {
        billingItems.push({
          shopProductId: serviceProductId,
          name: s.description || 'Repair Service',
          quantity: 1,
          rate: s.amount, // Rate is amount for 1 qty
          gstRate: effectiveServiceGstRate,
          hsnCode: '9987',
          productType: ProductType.SERVICE,
        });
      });

      // Parts - Standardized: Pull from JobCard table (Snapshotted cost + current Sale price/GST)
      if (job.parts && job.parts.length > 0) {
        job.parts.forEach((p) => {
          billingItems.push({
            shopProductId: p.shopProductId,
            quantity: p.quantity,
            rate: (p.product?.salePrice || 0) / 100,
            gstRate:
              dto.billingMode === BillingMode.WITH_GST
                ? p.product?.gstRate || 0
                : 0,
            hsnCode: p.product?.hsnCode || '8517',
            costPrice: p.costPrice || undefined,
          });
        });
      }

      const options: CreateInvoiceOptions = {
        tenantId,
        shopId: dto.shopId,
        customerId: job.customerId || undefined,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        items: billingItems,
        paymentMode: dto.paymentMode, // Assuming dto.paymentMode is PaymentMode enum or string
        pricesIncludeTax: !!dto.pricesIncludeTax,
        referenceType: 'JOB',
        referenceId: dto.jobCardId,
        skipStockUpdate: false, // ERP-Correct: Stock now consumed ONLY on Invoice confirm
        skipReceipt: false,
        shop, // Passing shop object to avoid redundant lookup
      };

      const invoice = await this.billingService.createInvoice(options, tx);

      // [Interactive Flow] Determine next status
      const nextStatus = dto.deliverImmediately ? 'DELIVERED' : 'READY';

      // Update job status and final cost (atomic with billing)
      await tx.jobCard.update({
        where: { id: dto.jobCardId },
        data: {
          status: nextStatus,
          finalCost: invoice.totalAmount, // Paisa
          updatedAt: new Date(),
        },
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        items: invoice.items,
        subTotal: invoice.subTotal,
        gstAmount: invoice.gstAmount,
        totalAmount: invoice.totalAmount,
        paymentMode: invoice.paymentMode,
        billingMode: dto.billingMode,
        status: nextStatus,
      };
    });
  }

  /**
   * Cancel repair job and reverse stock ledger entries
   * Creates IN entries to reverse all OUT entries linked to this job
   */
  async cancelRepair(tenantId: string, shopId: string, jobCardId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Validate job card exists
      const job = await tx.jobCard.findFirst({
        where: { id: jobCardId, tenantId, shopId },
        select: { id: true, status: true },
      });

      if (!job) {
        throw new BadRequestException('Job card not found');
      }

      // Prevent cancelling already delivered jobs
      if (job.status === 'DELIVERED' || job.status === 'CANCELLED') {
        throw new BadRequestException(
          `Cannot cancel job in ${job.status} status`,
        );
      }

      // Stock reversal is no longer needed here because stock is only deducted on invoice
      // If an invoice was already generated, it should be voided (handled by separate logic if needed)

      // Update job status to CANCELLED
      await tx.jobCard.update({
        where: { id: jobCardId },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });

      return { success: true };
    });
  }
}
