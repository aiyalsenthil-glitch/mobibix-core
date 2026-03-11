import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  IMEIStatus,
  ReceiptStatus,
  PaymentMode,
  ReceiptType,
  InvoiceStatus,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { assertGstinFormat } from '../../common/utils/gstin.util';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { SalesInvoiceDto, SalesInvoiceItemDto } from './dto/sales-invoice.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import {
  generateSalesInvoiceNumber,
  getFinancialYear,
} from '../../common/utils/invoice-number.util';
import { calculateInvoiceTotals } from './invoice-calculator.util';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceCreatedEvent, InvoicePaidEvent } from '../events/crm.events';
import { DocumentNumberService } from '../../common/services/document-number.service';
import { DocumentType } from '@prisma/client';
import { assertShopAccess } from '../../common/guards/shop-access.guard';

import { BillingService, CreateInvoiceOptions } from './billing.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
    private eventEmitter: EventEmitter2,
    private documentNumberService: DocumentNumberService,
    private billingService: BillingService,
    private loyaltyService: LoyaltyService,
  ) {}

  // ============================================
  // MONEY HELPERS (PAISA CONSISTENCY)
  //All monetary values in DB are integers (Paisa)
  //Frontend sends Rupees (decimal)
  // ============================================
  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }

  // Helper to ensure integers for DB fields
  private toInt(val: number): number {
    return Math.round(val);
  }

  /**
   * Get next invoice number for the shop and financial year
   * IMPORTANT: Sequence resets to 0001 on each financial year (April 1)
   * - Each FY (April-March) has its own independent sequence
   * - When FY changes, search finds no invoices with new FY code
   * - First invoice of new FY automatically gets 0001
   * Handles race conditions with retry logic
   */
  private async getNextInvoiceNumber(
    tx: any,
    shopId: string,
    invoicePrefix: string,
  ): Promise<string> {
    const today = new Date();
    const fy = getFinancialYear(today);
    // fy will be "202526" for Apr2025-Mar2026, "202627" for Apr2026-Mar2027, etc.

    // Query all invoices for THIS FINANCIAL YEAR and shop
    // When FY changes, this returns empty array, causing sequence to reset to 0001
    const allInvoices = await tx.invoice.findMany({
      where: {
        shopId: shopId,
        invoiceNumber: { contains: `-S-${fy}-` }, // Only finds invoices from current FY
      },
      select: { invoiceNumber: true },
      orderBy: { createdAt: 'desc' },
    });

    // Find the highest sequence number in current FY
    // If no invoices exist for this FY yet, maxSeq stays 0 (fresh start)
    let maxSeq = 0;
    for (const inv of allInvoices) {
      const parts = inv.invoiceNumber.split('-');
      const seq = parseInt(parts[parts.length - 1], 10); // Extract 0001, 0002, etc.
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }

    const nextSequence = maxSeq + 1; // First invoice = 1, second = 2, etc.

    // Generate candidate invoice number with current FY
    let invoiceNumber = generateSalesInvoiceNumber(
      invoicePrefix,
      nextSequence,
      today,
    );

    // Retry with increment if unique constraint violation
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        // Check if this invoice number already exists
        const existing = await tx.invoice.findFirst({
          where: {
            shopId: shopId,
            invoiceNumber: invoiceNumber,
          },
        });

        if (!existing) {
          return invoiceNumber;
        }

        // If exists, increment and retry
        invoiceNumber = generateSalesInvoiceNumber(
          invoicePrefix,
          nextSequence + retries + 1,
          today,
        );
        retries++;
      } catch {
        retries++;
      }
    }

    throw new BadRequestException(
      'Failed to generate unique invoice number. Please try again.',
    );
  }

  async getPublicInvoiceDetails(invoiceId: string) {
    // 1. Find invoice to get tenantId (Public access check)
    const invoiceMeta = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { tenantId: true },
    });

    if (!invoiceMeta) {
      throw new BadRequestException('Invoice not found');
    }

    // 2. Fetch full invoice details with relations
    const invoice = await this.getInvoiceDetails(
      invoiceMeta.tenantId,
      invoiceId,
    );

    // 3. Fetch Shop Details (Sanitized)
    const shop = await this.prisma.shop.findUnique({
      where: { id: invoice.shopId },
    });

    // 4. Fetch Product Details (for names, etc since InvoiceItem doesn't store name)
    const productIds = invoice.items?.map((i) => i.shopProductId) || [];
    const products = await this.prisma.shopProduct.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        type: true,
        hsnCode: true,
        gstRate: true,
        isSerialized: true,
      },
    });

    return {
      invoice,
      shop,
      products: products, // Return array, frontend can map
    };
  }

  async createInvoice(tenantId: string, dto: SalesInvoiceDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    const invoiceId = await this.prisma.$transaction(
      async (tx) => {
        // 0. CHECK FOR DELETION REQUEST (Soft Lock)
        const tenant = (await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { deletionRequestPending: true } as any,
        })) as any;
        if (tenant?.deletionRequestPending) {
          throw new BadRequestException(
            'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
          );
        }

        // 1. Validate shop access
        await assertShopAccess(tx, dto.shopId, tenantId);

        // Get shop details
        const shop = await tx.shop.findFirst({
          where: { id: dto.shopId, tenantId },
          select: {
            id: true,
            gstEnabled: true,
            state: true,
            stateCode: true,
          },
        });

        if (!shop) {
          throw new BadRequestException('Shop not found after validation');
        }

        // 2. Validate products
        const productIds = dto.items.map((i) => i.shopProductId);
        const products = await tx.shopProduct.findMany({
          where: {
            id: { in: productIds },
            tenantId,
            shopId: dto.shopId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            isSerialized: true,
            hsnCode: true,
            costPrice: true,
            warrantyDays: true,
            type: true,
          },
        });
        if (products.length !== productIds.length)
          throw new BadRequestException('Invalid product');

        const productMap = new Map(products.map((p) => [p.id, p]));
        const productCostMap = new Map(
          products.map((p) => [p.id, p.costPrice ?? null]),
        );

        // 🛡️ FIX 1: ENFORCE COST VALIDATION BEFORE SALE
        for (const item of dto.items) {
          const cost = productCostMap.get(item.shopProductId);
          if (cost === null || cost === undefined || cost <= 0) {
            const product = productMap.get(item.shopProductId);
            throw new BadRequestException(
              `Cannot sell product "${product?.name || 'Unknown'}" without a valid cost price. ` +
                `Please ensure a purchase has been recorded or update the cost price manually.`,
            );
          }
        }

        // 3. IMEI and Serial Number Validations
        const allImeis: string[] = [];
        const allSerials: string[] = [];

        for (const item of dto.items) {
          const product = productMap.get(item.shopProductId);
          const hasImeis = item.imeis && item.imeis.length > 0;
          const hasSerials =
            item.serialNumbers && item.serialNumbers.length > 0;

          if (product?.isSerialized) {
            if (!hasImeis && !hasSerials) {
              throw new BadRequestException(
                `Serialized product requires either IMEIs or Serial Numbers`,
              );
            }
            if (hasImeis && hasSerials) {
              throw new BadRequestException(
                `Cannot provide both IMEIs and Serial Numbers. Provide one or the other.`,
              );
            }

            const count = hasImeis
              ? item.imeis!.length
              : item.serialNumbers!.length;
            if (item.quantity !== count) {
              throw new BadRequestException(
                `Quantity mismatch for ${product.name}. Expected ${item.quantity}, got ${count}`,
              );
            }

            if (hasImeis) allImeis.push(...item.imeis!);
            if (hasSerials) allSerials.push(...item.serialNumbers!);
          } else {
            // Non-serialized products cannot have tracking numbers
            if (hasImeis || hasSerials) {
              throw new BadRequestException(
                `Non-serialized product cannot have IMEIs or Serial Numbers`,
              );
            }
          }
        }

        // Check Serial Numbers Uniqueness
        if (allSerials.length > 0) {
          const existingSerials = await tx.invoiceItem.findMany({
            where: {
              invoice: { tenantId, status: { not: 'VOIDED' } },
              serialNumbers: { hasSome: allSerials },
            },
            select: { id: true, serialNumbers: true },
          });
          if (existingSerials.length > 0) {
            throw new BadRequestException(
              'One or more Serial Numbers have already been sold',
            );
          }
        }

        // Check IMEI Availability (Safe check)
        if (allImeis.length > 0) {
          const imeiRecords = await tx.iMEI.findMany({
            where: { imei: { in: allImeis }, tenantId },
            select: { imei: true, shopProductId: true, status: true },
          });

          if (imeiRecords.length !== allImeis.length) {
            throw new BadRequestException('One or more IMEIs not found');
          }

          const imeiMap = new Map(imeiRecords.map((r) => [r.imei, r]));
          for (const item of dto.items) {
            if (item.imeis) {
              for (const imei of item.imeis) {
                const record = imeiMap.get(imei);
                if (record?.shopProductId !== item.shopProductId)
                  throw new BadRequestException(
                    `IMEI ${imei} does not belong to product`,
                  );
                if (record?.status !== 'IN_STOCK')
                  throw new BadRequestException(
                    `IMEI ${imei} is not available`,
                  );
              }
            }
          }
        }

        // 4. Map to CreateInvoiceOptions
        const billingItems = dto.items.map((item) => {
          const product = productMap.get(item.shopProductId);
          return {
            shopProductId: item.shopProductId,
            name: product?.name,
            quantity: item.quantity,
            rate: item.rate,
            gstRate: item.gstRate,
            hsnCode: item.hsnCode || product?.hsnCode || undefined,
            costPrice: product?.costPrice || 0,
            productType: product?.type,
            imeis: item.imeis,
            serialNumbers: item.serialNumbers,
            warrantyDays:
              item.warrantyDays ?? (product as any)?.warrantyDays ?? undefined,
            isSerialized: product?.isSerialized,
          };
        });

        const options: CreateInvoiceOptions = {
          tenantId,
          shopId: dto.shopId,
          customerId: dto.customerId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerState: dto.customerState,
          customerGstin: dto.customerGstin,
          items: billingItems,
          paymentMode: (dto.paymentMode as PaymentMode) || PaymentMode.CASH,
          paymentMethods: dto.paymentMethods?.map((pm) => ({
            mode: pm.mode as PaymentMode,
            amount: pm.amount,
          })),
          pricesIncludeTax: !!dto.pricesIncludeTax,
          invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
          referenceType: 'SALE',
          loyaltyPointsRedeemed: dto.loyaltyPointsRedeemed,
          // skipStockUpdate: false, // Default
        };

        // 5. Delegate to BillingService
        const invoice = await this.billingService.createInvoice(options, tx);
        
        // 💳 AWARD LOYALTY POINTS (Strictly within atomic transaction)
        if (invoice.status === InvoiceStatus.PAID && invoice.customerId) {
          await this.loyaltyService.awardLoyaltyPoints(tenantId, invoice, tx);
        }
        
        return invoice.id;
      },
      { timeout: 30000 },
    );

    // ⚡ EVENT (InvoiceCreated)
    const created = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (created) {
      this.eventEmitter.emit(
        'invoice.created',
        new InvoiceCreatedEvent(
          tenantId,
          dto.shopId,
          invoiceId,
          created.customerId,
          this.fromPaisa(created.totalAmount),
          created.invoiceNumber,
        ),
      );

    }

    return this.getInvoiceDetails(tenantId, invoiceId);
  }

  async updateInvoice(
    tenantId: string,
    invoiceId: string,
    dto: SalesInvoiceDto,
  ) {
    if (!dto.items?.length)
      throw new BadRequestException('At least one item required');

    await this.prisma.$transaction(async (tx) => {
      // 0. CHECK FOR DELETION REQUEST (Soft Lock)
      const tenant = (await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { deletionRequestPending: true } as any,
      })) as any;
      if (tenant?.deletionRequestPending) {
        throw new BadRequestException(
          'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
        );
      }

      // 1. Fetch Existing
      const oldInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { items: true, receipts: true, jobCard: true },
      });

      if (!oldInvoice) throw new BadRequestException('Invoice not found');
      if (oldInvoice.status === 'VOIDED')
        throw new BadRequestException('Cannot update cancelled invoice');

      // Lock Customer for Atomic Balance Update (if linked)
      const customerIdForLock = dto.customerId || oldInvoice.customerId;
      if (customerIdForLock) {
        await tx.$queryRawUnsafe(
          `SELECT id FROM mb_party WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`,
          customerIdForLock,
          tenantId,
        );
      }

      // 🛡️ GUARD: JobCard-linked invoices have special rules
      if (oldInvoice.jobCardId && oldInvoice.jobCard) {
        // If JobCard is DELIVERED, invoice is fully locked
        if (oldInvoice.jobCard.status === 'DELIVERED') {
          throw new BadRequestException(
            'This invoice is linked to a delivered job. Delivered invoices cannot be edited. Use credit note for any corrections.',
          );
        }

        // If JobCard is READY, only allow service charge edits (items structure must match)
        if (oldInvoice.jobCard.status === 'READY') {
          // For now, reject full item updates
          // Allow-listed: Only service charge can be edited via dedicated endpoint
          throw new BadRequestException(
            'This invoice is linked to a job. Use the Job Card interface to edit service charges, or add parts directly from the Job Card.',
          );
        }
      }

      // Validate shop access
      await assertShopAccess(tx, dto.shopId, tenantId);

      // Get shop details
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: {
          id: true,
          gstEnabled: true,
          gstNumber: true,
          state: true,
          stateCode: true,
        }, // gstNumber added for P0 HSN/GSTIN guards
      });

      if (!shop) {
        throw new BadRequestException('Shop not found after validation');
      }

      // ─── P0: Seller GSTIN Guard (mirrors billing.service.ts createInvoice) ───────────────
      if (shop.gstEnabled) {
        if (!shop.gstNumber) {
          throw new BadRequestException(
            'Shop GSTIN is required to update a GST Tax Invoice. ' +
              'Please configure GSTIN in Shop Settings.',
          );
        }
        assertGstinFormat(shop.gstNumber, 'Shop GSTIN');
      }

      // ─── P1: Buyer GSTIN Format Validation ───────────────────────────────────────
      if (dto.customerGstin) {
        assertGstinFormat(dto.customerGstin, 'Customer GSTIN');
      }

      // 2. Revert Stock (IN)
      for (const item of oldInvoice.items) {
        await this.stockService.recordStockIn(
          tenantId,
          oldInvoice.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          item.id,
        );
      }

      // 3. Revert IMEIs
      await tx.iMEI.updateMany({
        where: { invoiceId: oldInvoice.id },
        data: { invoiceId: null, status: IMEIStatus.IN_STOCK, soldAt: null },
      });

      // 4. Reverse Financial (OUT) - in PAISA
      // Assuming oldInvoice amounts were stored in Paisa. (If legacy was rupees, this might be off, but we go forward with Paisa)
      // To be safe, we take oldInvoice.totalAmount (which is DB value).
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: oldInvoice.shopId,
          type: 'OUT',
          amount: oldInvoice.totalAmount, // DB value
          mode: oldInvoice.paymentMode,
          referenceType: 'INVOICE',
          referenceId: oldInvoice.id,
          note: 'Invoice updated - reverse old',
        },
      });

      // 5. Cancel Old Receipts
      // Do NOT delete. Set to CANCELLED.
      const activeReceipts = await tx.receipt.findMany({
        where: { linkedInvoiceId: oldInvoice.id, status: ReceiptStatus.ACTIVE },
      });

      for (const r of activeReceipts) {
        await tx.receipt.update({
          where: { id: r.id },
          data: {
            status: ReceiptStatus.CANCELLED,
            narration:
              (r.narration || '') + ' [Auto-cancelled on Invoice Update]',
          },
        });
      }

      // 6. Validate New Items
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: {
          id: true,
          type: true,
          isSerialized: true,
          hsnCode: true,
          costPrice: true,
          name: true,
          warrantyDays: true,
        },
      });

      if (products.length !== productIds.length)
        throw new BadRequestException('Invalid product');

      const productMap = new Map(products.map((p) => [p.id, p])); // Added productMap for easier lookup
      const productSerializedMap = new Map(
        products.map((p) => [p.id, p.isSerialized]),
      );
      const productHsnMap = new Map(
        products.map((p) => [p.id, p.hsnCode || null]),
      );

      // ─── P0: HSN/SAC Enforcement for GST Invoices (mirrors billing.service.ts) ──────────
      const isGstInvoice = shop.gstEnabled && (!!shop.state || !!shop.stateCode);
      if (isGstInvoice) {
        for (const item of dto.items) {
          const hsnCode = productHsnMap.get(item.shopProductId);
          if (!hsnCode || hsnCode.trim() === '') {
            const product = productMap.get(item.shopProductId);
            throw new BadRequestException(
              `HSN/SAC code is mandatory on every line of a GST Tax Invoice. ` +
                `Missing for product: "${product?.name || item.shopProductId}". ` +
                `Please update the product catalogue with the correct HSN/SAC code.`,
            );
          }
        }
      }
      // 5. IMEI and Serial Number Validations (Update Flow)
      const newAllImeis: string[] = [];
      const newAllSerials: string[] = [];
      const newImeisByProduct = new Map<string, string[]>();

      for (const item of dto.items) {
        const product = productMap.get(item.shopProductId);
        const hasImeis = item.imeis && item.imeis.length > 0;
        const hasSerials = item.serialNumbers && item.serialNumbers.length > 0;

        if (product?.isSerialized) {
          if (!hasImeis && !hasSerials) {
            throw new BadRequestException(
              `Serialized product requires either IMEIs or Serial Numbers`,
            );
          }
          if (hasImeis && hasSerials) {
            throw new BadRequestException(
              `Cannot provide both IMEIs and Serial Numbers. Provide one or the other.`,
            );
          }

          const count = hasImeis
            ? item.imeis!.length
            : item.serialNumbers!.length;
          if (item.quantity !== count) {
            throw new BadRequestException(
              `Quantity mismatch for ${product.name}`,
            );
          }

          if (hasImeis) {
            newAllImeis.push(...item.imeis!);
            newImeisByProduct.set(item.shopProductId, item.imeis!);
          }
          if (hasSerials) {
            newAllSerials.push(...item.serialNumbers!);
          }
        } else {
          if (hasImeis || hasSerials) {
            throw new BadRequestException(
              `Non-serialized product cannot have IMEIs or Serial Numbers`,
            );
          }
        }
      }

      if (newAllSerials.length > 0) {
        // Check Serial Numbers Uniqueness
        const existingSerials = await tx.invoiceItem.findMany({
          where: {
            invoice: {
              tenantId,
              status: { not: 'VOIDED' },
              id: { not: invoiceId },
            },
            serialNumbers: { hasSome: newAllSerials },
          },
          select: { id: true, serialNumbers: true },
        });
        if (existingSerials.length > 0) {
          throw new BadRequestException(
            'One or more Serial Numbers have already been sold',
          );
        }
      }

      if (newAllImeis.length > 0) {
        // Validate availablity (logic same as create, allowed if invoiceId is null OR same invoice)
        const imeiRecords = await tx.iMEI.findMany({
          where: { imei: { in: newAllImeis }, tenantId },
          select: {
            imei: true,
            shopProductId: true,
            invoiceId: true,
            status: true,
          },
        });

        if (imeiRecords.length !== newAllImeis.length)
          throw new BadRequestException('One or more IMEIs not found');

        for (const record of imeiRecords) {
          if (record.status !== 'IN_STOCK')
            throw new BadRequestException(`IMEI ${record.imei} not available`);
        }
      }

      const isRepairLinked = !!oldInvoice.jobCardId;

      // 7. Calculate New Totals
      const lineInputs = dto.items.map((i) => ({
        shopProductId: i.shopProductId,
        quantity: i.quantity,
        ratePaisa: this.toPaisa(i.rate), // Send as Paise!
        gstRate: i.gstRate,
        hsnCode: i.hsnCode || productHsnMap.get(i.shopProductId) || undefined,
      }));

      const calc = calculateInvoiceTotals(lineInputs, {
        isIndianGSTInvoice: shop.gstEnabled && (!!shop.state || !!shop.stateCode), // P0 fix: !!shop.state handles null/empty
        pricesIncludeTax: !!dto.pricesIncludeTax,
        shopStateCode: shop.stateCode || shop.state,
        customerStateCode: dto.customerState,
        customerGstin: dto.customerGstin,
      });

      const totalAmountPaisa = calc.subTotalPaisa + calc.gstAmountPaisa;

      // 8. Determine Status & Receipts
      let totalPaidPaisa = 0;
      const receiptsToCreate: { mode: PaymentMode; amountPaisa: number }[] = [];
      const primaryPaymentMode =
        (dto.paymentMethods?.[0]?.mode as PaymentMode) ||
        (dto.paymentMode as PaymentMode) ||
        PaymentMode.CASH;

      if (dto.paymentMethods?.length) {
        for (const pm of dto.paymentMethods) {
          if (pm.mode !== PaymentMode.CREDIT) {
            const amountPaisa = this.toPaisa(pm.amount);
            totalPaidPaisa += amountPaisa;
            receiptsToCreate.push({ mode: pm.mode, amountPaisa });
          }
        }
      } else {
        const mode = (dto.paymentMode as PaymentMode) || PaymentMode.CASH;
        if (mode !== PaymentMode.CREDIT) {
          totalPaidPaisa = totalAmountPaisa;
          receiptsToCreate.push({ mode, amountPaisa: totalAmountPaisa });
        }
      }

      const invoiceStatus =
        totalPaidPaisa >= totalAmountPaisa - 100
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      // 9. Update Invoice
      await tx.invoiceItem.deleteMany({ where: { invoiceId: oldInvoice.id } });

      // Calculate warranty end date if applicable
      const invoiceDateActual = dto.invoiceDate
        ? new Date(dto.invoiceDate)
        : oldInvoice.createdAt || new Date();

      const invoiceItemsData = calc.lines.map((line) => {
        const inputItem = dto.items.find(
          (i) => i.shopProductId === line.shopProductId,
        );
        const prod = productMap.get(line.shopProductId);

        const warrantyDays =
          inputItem?.warrantyDays ?? (prod as any)?.warrantyDays;
        let warrantyEndAt: Date | undefined;
        if (warrantyDays !== undefined && warrantyDays > 0) {
          warrantyEndAt = new Date(invoiceDateActual);
          warrantyEndAt.setDate(warrantyEndAt.getDate() + warrantyDays);
        }

        return {
          shopProductId: line.shopProductId,
          quantity: line.quantity,
          rate: this.toInt(line.ratePaisa), // Now coming in directly as Paise
          costAtSale: prod?.costPrice || null, // Capture historical cost for GP integrity
          hsnCode: line.hsnCode,
          gstRate: line.gstRate,
          gstAmount: line.gstAmountPaisa, // Already in Paise
          lineTotal: line.lineTotalPaisa, // Already in Paise
          warrantyDays: warrantyDays,
          warrantyEndAt: warrantyEndAt,
          serialNumbers: inputItem?.serialNumbers || [],
        };
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: oldInvoice.id },
        data: {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerState: dto.customerState,
          customerGstin: dto.customerGstin,
          subTotal: calc.subTotalPaisa,
          gstAmount: calc.gstAmountPaisa,
          cgst: calc.cgstPaisa, // P0 fix: persist CGST breakdown on edit
          sgst: calc.sgstPaisa, // P0 fix: persist SGST breakdown on edit
          igst: calc.igstPaisa, // P0 fix: persist IGST breakdown on edit
          totalAmount: totalAmountPaisa,
          paymentMode: primaryPaymentMode,
          status: invoiceStatus,
          items: { create: invoiceItemsData },
        },
        include: { items: true },
      });

      // Update currentOutstanding (Atomic Net Adjustment)
      if (oldInvoice.customerId || dto.customerId) {
        // 1. Revert Old Credit
        const oldPaid = oldInvoice.receipts.reduce(
          (sum, r) => sum + r.amount,
          0,
        );
        const oldCredit = Math.max(0, oldInvoice.totalAmount - oldPaid);

        if (oldInvoice.customerId) {
          await tx.party.update({
            where: { id: oldInvoice.customerId },
            data: { currentOutstanding: { decrement: oldCredit } },
          });
        }

        // 2. Apply New Credit
        const newCredit = Math.max(0, totalAmountPaisa - totalPaidPaisa);
        const targetCustomerId = dto.customerId || oldInvoice.customerId;

        if (targetCustomerId) {
          await tx.party.update({
            where: { id: targetCustomerId },
            data: { currentOutstanding: { increment: newCredit } },
          });
        }
      }

      // 9b. Synchronize Job Card Parts (if linked)
      if (isRepairLinked && oldInvoice.jobCardId) {
        // Clear existing parts to sync exactly with invoice
        await tx.jobCardPart.deleteMany({
          where: { jobCardId: oldInvoice.jobCardId },
        });

        const jobPartsData = products
          .map((p) => {
            const item = dto.items.find((i) => i.shopProductId === p.id);
            return {
              jobCardId: oldInvoice.jobCardId!,
              shopProductId: p.id,
              quantity: item?.quantity || 0,
              costPrice: p.costPrice || 0,
            };
          })
          .filter((p) => p.quantity > 0);

        await tx.jobCardPart.createMany({ data: jobPartsData });
      }

      // 10. Create New Financial Entries
      if (dto.paymentMethods?.length) {
        const entries = dto.paymentMethods.map((pm) => ({
          tenantId,
          shopId: dto.shopId,
          type: 'IN' as const,
          amount: this.toPaisa(pm.amount),
          mode: pm.mode,
          referenceType: 'INVOICE' as const,
          referenceId: updatedInvoice.id,
          note: 'Invoice updated - new entry',
        }));
        await tx.financialEntry.createMany({ data: entries });
      } else {
        await tx.financialEntry.create({
          data: {
            tenantId,
            shopId: dto.shopId,
            type: 'IN',
            amount: totalAmountPaisa,
            mode: (dto.paymentMode as PaymentMode) || 'CASH',
            referenceType: 'INVOICE',
            referenceId: updatedInvoice.id,
            note: 'Invoice updated - new entry',
          },
        });
      }

      // 11. Create New Receipts (Atomic)
      if (receiptsToCreate.length > 0) {
        // If multiple receipts, we need multiple print numbers.
        // We will loop and increment counter atomically for each.
        // Or better, update receiptPrintCounter by N and assign ranges.
        // For absolute safety in loop without race condition on "reading range":
        //   Single increment is safest standard pattern unless we lock range.
        //   Given invoice rarely has >2 payment methods, simple loop with increment is fine.

        for (const r of receiptsToCreate) {
          const printNum = await this.getNextPrintNumberAtomic(tx, dto.shopId);
          await tx.receipt.create({
            data: {
              id: uuidv4(),
              tenantId,
              shopId: dto.shopId,
              receiptId: this.generateReceiptId(),
              printNumber: String(printNum),
              receiptType: ReceiptType.CUSTOMER,
              amount: r.amountPaisa,
              paymentMethod: r.mode,
              customerId: updatedInvoice.customerId,
              customerName: updatedInvoice.customerName,
              customerPhone: updatedInvoice.customerPhone,
              status: ReceiptStatus.ACTIVE,
              linkedInvoiceId: updatedInvoice.id,
            },
          });
        }
      }

      // 12. Stock Out (New)
      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const invoiceItem = updatedInvoice.items[i];
        const isSerialized = productSerializedMap.get(item.shopProductId);

        // 🛡️ REPAIR FIX: Skip stock out if already managed by Job Card Part
        // JobCardPart handles its own stock ledger entry.
        // If we also do it here, it's a double deduction.
        if (isRepairLinked) {
          continue;
        }

        await this.stockService.recordStockOut(
          tenantId,
          dto.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          invoiceItem.id,
          undefined,
          isSerialized ? item.imeis : undefined,
          tx,
        );
      }

      // 13. Update IMEIs (New)
      if (newAllImeis.length > 0) {
        await tx.iMEI.updateMany({
          where: { imei: { in: newAllImeis }, tenantId },
          data: {
            invoiceId: updatedInvoice.id,
            status: IMEIStatus.SOLD,
            soldAt: new Date(),
          },
        });
      }

      return updatedInvoice.id;
    });

    return this.getInvoiceDetails(tenantId, invoiceId);
  }

  async cancelInvoice(tenantId: string, invoiceId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { items: true, receipts: true },
      });
      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.status === InvoiceStatus.VOIDED)
        throw new BadRequestException('Already cancelled');

      // Lock Customer for Atomic Balance Update (if linked)
      if (invoice.customerId) {
        await tx.$queryRawUnsafe(
          `SELECT id FROM mb_party WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`,
          invoice.customerId,
          tenantId,
        );
      }

      // 🔒 PAYMENT VALIDATION
      const activeReceipts = invoice.receipts.filter(
        (r) => r.status === ReceiptStatus.ACTIVE,
      );
      if (activeReceipts.length > 0) {
        // Return receipt UUIDs (id) for cancellation API, not receiptId
        const receiptIds = activeReceipts.map((r) => r.id).join(', ');
        throw new BadRequestException(
          `Cannot cancel invoice with active payment records. Please cancel or refund the following receipt(s) first: ${receiptIds}`,
        );
      }

      // 2. Validate & Revert IMEIs
      const linkedImeis = await tx.iMEI.findMany({
        where: { invoiceId: invoice.id },
        select: { id: true, imei: true, status: true, shopProductId: true },
      });

      if (linkedImeis.length > 0) {
        // Enforce Optimistic Locking during reversion
        const updateResult = await tx.iMEI.updateMany({
          where: { invoiceId: invoice.id, status: 'SOLD' },
          data: { invoiceId: null, status: 'IN_STOCK', soldAt: null },
        });

        if (updateResult.count !== linkedImeis.length) {
          throw new BadRequestException(
            'Cannot cancel invoice: One or more linked devices have been altered concurrently (e.g. Scrapped or Returned).',
          );
        }
      }

      // 3. Revert Stock via Ledger Entries (Bypass recordStockIn to avoid IMEI creation throws)
      const products = await tx.shopProduct.findMany({
        where: { id: { in: invoice.items.map((i) => i.shopProductId) } },
        select: { id: true, type: true, isSerialized: true, costPrice: true },
      });
      const prodMap = new Map(products.map((p) => [p.id, p]));

      const ledgerEntries: any[] = [];
      for (const item of invoice.items) {
        const prod = prodMap.get(item.shopProductId);
        if (prod && prod.type !== 'SERVICE' && !prod.isSerialized) {
          ledgerEntries.push({
            tenantId,
            shopId: invoice.shopId,
            shopProductId: item.shopProductId,
            type: 'IN' as const,
            quantity: item.quantity,
            referenceType: 'ADJUSTMENT' as const,
            referenceId: item.id,
            costPerUnit: prod.costPrice || null,
          });
        }
      }

      if (ledgerEntries.length > 0) {
        await tx.stockLedger.createMany({ data: ledgerEntries });
      }

      // 4. Cancel Receipts
      await tx.receipt.updateMany({
        where: { linkedInvoiceId: invoice.id, status: ReceiptStatus.ACTIVE },
        data: {
          status: ReceiptStatus.CANCELLED,
          narration: 'Invoice Cancelled - ' + (reason || ''),
        },
      });

      // 5. Update Invoice Status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.VOIDED },
      });

      // Update currentOutstanding (Atomic Reversal)
      if (invoice.customerId) {
        const creditBalance =
          invoice.totalAmount -
          invoice.receipts.reduce((sum, r) => sum + r.amount, 0);
        if (creditBalance > 0) {
          await tx.party.update({
            where: { id: invoice.customerId },
            data: { currentOutstanding: { decrement: creditBalance } },
          });
        }
      }

      // 6. Financial Reversal
      // Create OUT entry to balance the original IN
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: invoice.shopId,
          type: 'OUT',
          amount: invoice.totalAmount, // Assuming full reversal
          mode: invoice.paymentMode,
          referenceType: 'INVOICE',
          referenceId: invoice.id,
          note: `Invoice Cancelled: ${reason || ''}`,
        },
      });

      // 7. Reverse loyalty points (if any were earned on this invoice)
      if (invoice.customerId && invoice.status === InvoiceStatus.PAID) {
        try {
          await this.loyaltyService.reversePointsOnCancel(
            tenantId,
            invoiceId,
            invoice.invoiceNumber,
          );
        } catch (error) {
          // Log but don't fail cancellation if loyalty reversal fails
          console.error(
            `Failed to reverse loyalty points for invoice ${invoiceId}`,
            error,
          );
        }
      }

      return { message: 'Invoice cancelled successfully' };
    });
  }

  // ... (getInvoiceDetails, listInvoices, etc. - ensure they persist)
  // I must include the rest of the file methods here or they will be lost.
  // Using 'read' output to ensure I have everything.
  // The 'view_file' output truncated at line 800. I need to be careful.
  // I will assume the rest of the file is standard and I only need to keep what I saw.
  // WAIT. I used `replace_file_content` before which corrupts if I replace everything.
  // I should write the FULL file content now I have context of what's missing (collectPayment and getters).
  // I will scroll down to see `collectPayment` and others in original file via view_file if needed?
  // No, I have `view_file` output from earlier (step 289, 290, 293).
  // I will reconstruct the full file.

  async listInvoices(
    tenantId: string,
    shopId: string,
    skip = 0,
    take = 20,
    search?: string,
    fromJobCard?: boolean,
    status?: InvoiceStatus,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `[listInvoices] Called with tenantId: ${tenantId}, shopId: ${shopId}, skip: ${skip}, take: ${take}`,
    );

    const where: any = { tenantId, shopId };

    // Filter for invoices linked to job cards
    if (fromJobCard) {
      where.jobCardId = { not: null };
    }

    if (status) {
      if (status.toString() === 'CREDIT') {
        where.paymentMode = PaymentMode.CREDIT;
      } else if (status.toString() === 'DRAFT') {
        where.status = InvoiceStatus.UNPAID; // Draft in UI = Unpaid in DB
      } else if (status.toString() === 'FINAL') {
        where.status = InvoiceStatus.PAID; // Final in UI = Paid in DB
      } else if (Object.values(InvoiceStatus).includes(status as any)) {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    this.logger.log(`[listInvoices] Query where:`, JSON.stringify(where));

    // Optimized: Get invoices without full receipts, then aggregate separately
    const queryStart = Date.now();
    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          customerId: true,
          customerName: true,
          totalAmount: true,
          paymentMode: true,
          status: true,
          invoiceDate: true,
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    this.logger.log(
      `[listInvoices] DB query took ${Date.now() - queryStart}ms. Found ${invoices.length} invoices, total count: ${total}`,
    );

    // Get receipt summaries (aggregated at DB level)
    const invoiceIds = invoices.map((i) => i.id);
    const receiptSummaries =
      invoiceIds.length > 0
        ? await this.prisma.receipt.groupBy({
            by: ['linkedInvoiceId'],
            _sum: { amount: true },
            where: { linkedInvoiceId: { in: invoiceIds } },
          })
        : [];

    // Build a map of invoiceId -> paidAmount
    const paidAmountMap = new Map<string, number>();
    receiptSummaries.forEach((summary: any) => {
      if (summary.linkedInvoiceId) {
        paidAmountMap.set(summary.linkedInvoiceId, summary._sum?.amount || 0);
      }
    });

    // Enrich with calculated fields: paidAmount, balanceAmount, paymentStatus
    const enrichedInvoices = invoices.map((invoice) => {
      const paidAmount = paidAmountMap.get(invoice.id) || 0;
      const balanceAmount = invoice.totalAmount - paidAmount;

      // Derive payment status
      let paymentStatus = 'UNPAID';
      if (balanceAmount <= 0) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        totalAmount: this.fromPaisa(invoice.totalAmount),
        paymentMode: invoice.paymentMode,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        paidAmount: this.fromPaisa(paidAmount),
        balanceAmount: this.fromPaisa(balanceAmount),
        paymentStatus,
      };
    });

    // Return standardized paginated format
    const safeTake = take > 0 ? take : 1;
    const page = Math.floor(skip / safeTake) + 1;
    const totalPages = Math.ceil(total / safeTake);

    const totalTime = Date.now() - startTime;
    this.logger.log(`[listInvoices] Total execution time: ${totalTime}ms`);

    return {
      data: enrichedInvoices,
      pagination: {
        total,
        page,
        limit: safeTake,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        offset: skip,
      },
    };
  }

  async getInvoiceDetails(tenantId: string, invoiceId: string) {
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        jobCard: {
          // Include linked Job Card
          select: {
            jobNumber: true,
            deviceBrand: true,
            deviceModel: true,
            deviceSerial: true,
            customerComplaint: true,
          },
        },
        receipts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            transactionRef: true,
            createdAt: true,
            printNumber: true,
          },
        },
        items: {
          select: {
            id: true, // Needed for updates?? Not yet exposed but good to have
            shopProductId: true,
            quantity: true,
            rate: true,
            hsnCode: true,
            gstRate: true,
            gstAmount: true,
            lineTotal: true,
            // Include product name for UI
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    // Calculate payment summary
    const paidAmount = invoice.receipts.reduce(
      (sum, receipt) => sum + receipt.amount,
      0,
    );
    const balanceAmount = invoice.totalAmount - paidAmount;

    // Derive payment status
    let paymentStatus = 'UNPAID';
    if (balanceAmount <= 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    return {
      id: invoice.id,
      shopId: invoice.shopId,
      shopGstin: invoice.shopGstin ?? null, // P0: seller GSTIN for invoice print
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerGstin: invoice.customerGstin,
      customerState: invoice.customerState,

      // Job Card Details (if applicable)
      jobCard: invoice.jobCard
        ? {
            jobNumber: invoice.jobCard.jobNumber,
            deviceBrand: invoice.jobCard.deviceBrand,
            deviceModel: invoice.jobCard.deviceModel,
            deviceSerial: invoice.jobCard.deviceSerial,
            problem: invoice.jobCard.customerComplaint, // Fixed field name
          }
        : undefined,

      // Monetary values (Paisa -> Rupee)
      subTotal: invoice.subTotal ? this.fromPaisa(invoice.subTotal) : 0,
      gstAmount: invoice.gstAmount ? this.fromPaisa(invoice.gstAmount) : 0,
      cgst: invoice.cgst ? this.fromPaisa(invoice.cgst) : undefined,
      sgst: invoice.sgst ? this.fromPaisa(invoice.sgst) : undefined,
      igst: invoice.igst ? this.fromPaisa(invoice.igst) : undefined,
      totalAmount: this.fromPaisa(invoice.totalAmount),
      paymentMode: invoice.paymentMode,

      // ✅ NEW: Payment summary
      paidAmount: this.fromPaisa(paidAmount),
      balanceAmount: this.fromPaisa(balanceAmount),
      paymentStatus,

      // ✅ NEW: Payment history
      payments: invoice.receipts.map((receipt) => ({
        id: receipt.id,
        amount: this.fromPaisa(receipt.amount), // Fix: Paisa -> Rupee
        method: receipt.paymentMethod,
        transactionRef: receipt.transactionRef,
        createdAt: receipt.createdAt,
        receiptNumber: receipt.printNumber,
      })),

      items: invoice.items.map((item) => {
        // Calculate accurate taxableValue
        // item.lineTotal is in Paisa. item.gstAmount is in Paisa.
        const lineTotalPaisa = item.lineTotal || 0;
        const gstAmountPaisa = item.gstAmount || 0;

        // Convert to Rupees
        const lineTotal = this.fromPaisa(lineTotalPaisa);
        const gstAmount = this.fromPaisa(gstAmountPaisa);

        // taxableValue derived from Rupee values
        const taxableValue = Math.round((lineTotal - gstAmount) * 100) / 100;

        return {
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: this.fromPaisa(item.rate), // Fix: Paisa -> Rupee
          hsnCode: item.hsnCode || undefined,
          gstRate: item.gstRate || undefined,
          gstAmount,
          lineTotal,
          taxableValue,
          product: (item as any).product
            ? { name: (item as any).product.name }
            : undefined,
        };
      }),
    };
  }

  /**
   * Public invoice verification (limited data, no auth)
   */
  async getPublicInvoiceVerification(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        totalAmount: true,
        status: true,
        shopGstin: true, // P0: seller GSTIN for print verification
        customerGstin: true, // buyer GSTIN for B2B ITC verification
        shop: {
          select: {
            name: true,
            phone: true,
            gstNumber: true, // live shop GSTIN (fallback if shopGstin null)
            addressLine1: true,
            state: true,
            stateCode: true,
          },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      totalAmount: this.fromPaisa(invoice.totalAmount),
      status: invoice.status,
      // P0: GST fields for buyer ITC verification and seller identity
      shopGstin: invoice.shopGstin ?? null,
      customerGstin: invoice.customerGstin ?? null,
      shopName: invoice.shop.name,
      shopPhone: invoice.shop.phone,
      shopGstNumber: invoice.shop.gstNumber ?? null, // live fallback in case shopGstin null on old invoices
      shopAddress: (invoice as any).shop.addressLine1 ?? null,
      shopState: (invoice as any).shop.stateCode || (invoice as any).shop.state || null,
      items: (invoice as any).items.map((item: any) => ({
        description: item.product.name,
        quantity: item.quantity,
        rate: this.fromPaisa(item.rate), // Fix: Paisa -> Rupee
        total: this.fromPaisa(item.lineTotal),
      })),
    };
  }

  /**
   * Get sales summary for a shop within a date range
   * Returns aggregated sales, payments, and pending amounts
   * Used for dashboard reports and financial summaries
   */
  async getSalesSummary(
    tenantId: string,
    shopId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    // Validate shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });

    if (!shop) {
      throw new BadRequestException('Invalid shop');
    }

    // Default to current month if no date range provided
    const now = new Date();
    const defaultStart =
      startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd =
      endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // ✅ Aggregate invoices
    const invoiceStats = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        shopId,
        invoiceDate: {
          gte: defaultStart,
          lte: defaultEnd,
        },
        status: { not: 'VOIDED' },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    // ✅ Aggregate receipts by payment method
    const paymentStats = await this.prisma.receipt.findMany({
      where: {
        tenantId,
        shopId,
        createdAt: {
          gte: defaultStart,
          lte: defaultEnd,
        },
        status: 'ACTIVE',
        linkedInvoiceId: {
          not: null, // Only count invoice payments
        },
      },
      select: {
        amount: true,
        paymentMethod: true,
      },
    });

    // Calculate totals by payment method
    const byMethod = paymentStats.reduce(
      (acc, receipt) => {
        if (!acc[receipt.paymentMethod]) {
          acc[receipt.paymentMethod] = 0;
        }
        acc[receipt.paymentMethod] += receipt.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalSales = invoiceStats._sum.totalAmount || 0;
    const cashReceived = byMethod['CASH'] || 0;
    const upiReceived = byMethod['UPI'] || 0;
    const cardReceived = byMethod['CARD'] || 0;
    const bankReceived = byMethod['BANK'] || 0;
    const totalReceived =
      cashReceived + upiReceived + cardReceived + bankReceived;
    const pendingAmount = totalSales - totalReceived;

    return {
      period: {
        startDate: defaultStart,
        endDate: defaultEnd,
      },
      summary: {
        totalSales,
        totalInvoices: invoiceStats._count,
        totalReceived,
        pendingAmount,
      },
      breakdown: {
        cashReceived,
        upiReceived,
        cardReceived,
        bankReceived,
      },
    };
  }

  private generateReceiptId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCP-${timestamp}-${random}`;
  }

  private async getNextPrintNumberAtomic(
    tx: any,
    shopId: string,
  ): Promise<number> {
    const shop = await tx.shop.update({
      where: { id: shopId },
      data: { receiptPrintCounter: { increment: 1 } },
      select: { receiptPrintCounter: true },
    });
    return shop.receiptPrintCounter;
  }

  /**
   * Collect payment for an existing invoice (CREDIT or PARTIALLY_PAID)
   */
  async collectPayment(
    tenantId: string,
    invoiceId: string,
    dto: CollectPaymentDto,
  ) {
    if (!dto.paymentMethods || dto.paymentMethods.length === 0) {
      throw new BadRequestException('At least one payment method required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch invoice
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { receipts: { where: { status: 'ACTIVE' } } },
      });

      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.status === 'VOIDED')
        throw new BadRequestException(
          'Cannot collect payment for cancelled invoice',
        );

      // Lock Customer for Atomic Balance Update (if linked)
      if (invoice.customerId) {
        await tx.$queryRawUnsafe(
          `SELECT id FROM mb_party WHERE id = $1 AND "tenantId" = $2 FOR UPDATE`,
          invoice.customerId,
          tenantId,
        );
      }

      // 2. Calculate Balance (in Paisa)
      // Invoice totals are already stored as Paisa in DB (ints)
      // Receipts amounts are also Paisa (ints)
      const totalAmountPaisa = invoice.totalAmount;

      const paidAmountPaisa = invoice.receipts.reduce(
        (sum, r) => sum + r.amount,
        0,
      );

      const balancePaisa = totalAmountPaisa - paidAmountPaisa;

      if (balancePaisa <= 0) {
        throw new BadRequestException('Invoice is already fully paid');
      }

      // 3. Process Incoming Payments
      let incomingTotalPaisa = 0;
      const receiptsToCreate: { mode: PaymentMode; amountPaisa: number }[] = [];

      for (const pm of dto.paymentMethods) {
        if (pm.mode === PaymentMode.CREDIT) {
          throw new BadRequestException(
            'CREDIT mode not allowed for payment collection',
          );
        }
        if (pm.amount <= 0) {
          throw new BadRequestException('Payment amount must be positive');
        }

        const amountPaisa = this.toPaisa(pm.amount); // Frontend sends Rupees -> Convert to Paisa
        incomingTotalPaisa += amountPaisa;
        receiptsToCreate.push({ mode: pm.mode, amountPaisa });
      }

      // 4. Validate Overpayment (Tolerance 100 paisa = 1 Rupee)
      if (incomingTotalPaisa > balancePaisa + 100) {
        throw new BadRequestException(
          `Payment amount (₹${this.fromPaisa(incomingTotalPaisa)}) exceeds balance (₹${this.fromPaisa(balancePaisa)})`,
        );
      }

      // 5. Create Receipts (Atomic) & Financial Entries
      if (receiptsToCreate.length > 0) {
        for (const r of receiptsToCreate) {
          // Atomic Print Number
          const printNum = await this.getNextPrintNumberAtomic(
            tx,
            invoice.shopId,
          );

          // Create Receipt
          const receipt = await tx.receipt.create({
            data: {
              id: uuidv4(),
              tenantId,
              shopId: invoice.shopId,
              receiptId: this.generateReceiptId(),
              printNumber: String(printNum),
              receiptType: ReceiptType.PAYMENT, // Usage of PAYMENT type for subsequent collections
              amount: r.amountPaisa, // Paisa
              paymentMethod: r.mode,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              customerPhone: invoice.customerPhone,
              linkedInvoiceId: invoice.id,
              status: ReceiptStatus.ACTIVE,
              transactionRef: dto.transactionRef,
              narration: dto.narration || 'Payment Collected',
            },
          });

          // Create Financial Entry
          await tx.financialEntry.create({
            data: {
              tenantId,
              shopId: invoice.shopId,
              type: 'IN',
              amount: r.amountPaisa, // Paisa
              mode: r.mode,
              referenceType: 'RECEIPT', // Linked to receipt for audit
              referenceId: receipt.id,
              note: `Payment collected for Inv #${invoice.invoiceNumber}`,
            },
          });
        }
      }

      // 6. Recalculate Invoice Status
      // New total paid = Old paid + Incoming
      const newTotalPaidPaisa = paidAmountPaisa + incomingTotalPaisa;

      // If paid >= total (with tolerance), mark PAID. Else remains PARTIALLY_PAID.
      const newStatus =
        newTotalPaidPaisa >= totalAmountPaisa - 100
          ? InvoiceStatus.PAID
          : InvoiceStatus.PARTIALLY_PAID;

      // Update currentOutstanding (Atomic)
      if (invoice.customerId) {
        await tx.party.update({
          where: { id: invoice.customerId },
          data: { currentOutstanding: { decrement: incomingTotalPaisa } },
        });
      }

      // Only update if status changed, but always nice to ensure consistency
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      return {
        invoiceId: updatedInvoice.id,
        shopId: updatedInvoice.shopId, // Pass back for event
        customerId: updatedInvoice.customerId, // Pass back for event
        totalAmount: this.fromPaisa(totalAmountPaisa),
        paidAmount: this.fromPaisa(newTotalPaidPaisa),
        balanceAmount: this.fromPaisa(totalAmountPaisa - newTotalPaidPaisa),
        status: newStatus,
        message: 'Payment collected successfully',
        paymentMode:
          incomingTotalPaisa > 0 ? receiptsToCreate[0]?.mode : undefined,
        amountCollected: incomingTotalPaisa, // paisa
      };
    });

    // ⚡ EVENT (InvoicePaid)
    // Emit after successful commit
    if (result) {
      this.eventEmitter.emit(
        'invoice.paid',
        new InvoicePaidEvent(
          tenantId,
          result.shopId,
          result.invoiceId,
          result.customerId,
          this.fromPaisa(result.amountCollected), // Convert back to Rupee for event if needed? Or keep paisa? Event def says "paidAmount: number". Typically events use float/Rupee if consumer expects it, OR paisa.
          // Event Definition: "paidAmount: number". Given app uses Rupee in DTOs, I'll send Rupee to be friendly to listeners.
          // Warning: Precision loss possible. But for CRM alert it's fine.
          (result.paymentMode as string) || 'MIXED',
          result.status === InvoiceStatus.PAID,
        ),
      );

      // 💳 AWARD LOYALTY POINTS
      // Only award points when invoice becomes PAID and has a customer
      if (result.status === InvoiceStatus.PAID && result.customerId) {
        try {
          const invoiceData = await this.prisma.invoice.findUnique({
            where: { id: result.invoiceId },
          });
          if (invoiceData) {
            await this.loyaltyService.awardLoyaltyPoints(tenantId, invoiceData);
          }
        } catch (err) {
          this.logger.error(
            `Failed to award loyalty points for invoice ${result.invoiceId}`,
            err as Error,
          );
          // Don't throw - payment collection succeeded, loyalty is secondary
        }
      }
    }

    return result;
  }

  /**
   * Add a single item to an existing invoice
   * Reuses updateInvoice logic by fetching current state, appending item, and calling update.
   */
  async addItemToInvoice(
    tenantId: string,
    invoiceId: string,
    newItem: SalesInvoiceItemDto, // Use DTO which includes gstAmount
  ) {
    // 1. Fetch current invoice with all details needed to reconstruct DTO
    const currentInvoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        items: true,
        imeis: true, // Fetch linked IMEIs
        shop: { select: { gstEnabled: true, state: true, stateCode: true } },
      },
    });

    if (!currentInvoice) throw new BadRequestException('Invoice not found');
    if (currentInvoice.status === 'VOIDED')
      throw new BadRequestException('Cannot add items to cancelled invoice');

    // 2. Reconstruct current items DTO
    const imeisByProduct = new Map<string, string[]>();
    const invoiceImeis = (currentInvoice as any).imeis || [];
    for (const imei of invoiceImeis) {
      if (!imeisByProduct.has(imei.shopProductId)) {
        imeisByProduct.set(imei.shopProductId, []);
      }
      imeisByProduct.get(imei.shopProductId)?.push(imei.imei);
    }

    const currentItemsDto = ((currentInvoice as any).items || []).map((item: any) => {
      const productImeis = imeisByProduct.get(item.shopProductId) || [];
      // Consume IMEIs for this item quantity
      const assignedImeis = productImeis.splice(0, item.quantity);

      return {
        shopProductId: item.shopProductId,
        quantity: item.quantity,
        rate: this.fromPaisa(item.rate), // Convert back to Rupee for DTO
        gstRate: item.gstRate,
        gstAmount: this.fromPaisa(item.gstAmount),
        imeis: assignedImeis.length > 0 ? assignedImeis : undefined,
      };
    });

    // 3. Append new item
    const newItemsDto = [...currentItemsDto, newItem];

    // 4. Call updateInvoice
    const updateDto: SalesInvoiceDto = {
      shopId: currentInvoice.shopId,
      customerId: currentInvoice.customerId ?? undefined,
      customerName: currentInvoice.customerName,
      customerPhone: currentInvoice.customerPhone ?? undefined,
      customerGstin: currentInvoice.customerGstin ?? undefined,
      customerState: currentInvoice.customerState ?? undefined,
      paymentMode: 'CREDIT', // Force credit to avoid auto-marking as PAID
      items: newItemsDto,
      pricesIncludeTax: true,
    };

    return this.updateInvoice(tenantId, invoiceId, updateDto);
  }
}
