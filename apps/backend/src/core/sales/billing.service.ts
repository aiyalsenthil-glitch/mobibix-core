import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  ProductType,
  InvoiceStatus,
  PaymentMode,
  ReceiptStatus,
  ReceiptType,
  DocumentType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { DocumentNumberService } from '../../common/services/document-number.service';
import {
  calculateInvoiceTotals,
  InvoiceLineInput,
} from './invoice-calculator.util';
import { assertGstinFormat } from '../../common/utils/gstin.util';
import { v4 as uuidv4 } from 'uuid';
import { LoyaltyService } from '../loyalty/loyalty.service';

export interface BillingItem {
  shopProductId: string;
  name?: string; // Optional override
  quantity: number;
  rate: number; // Unit Price
  gstRate: number;
  hsnCode?: string;
  costPrice?: number; // For Stock Valuation
  productType?: ProductType;
  imeis?: string[];
  serialNumbers?: string[];
  warrantyDays?: number;
  warrantyEndAt?: Date;
  isSerialized?: boolean;
}

export interface CreateInvoiceOptions {
  tenantId: string;
  shopId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerState?: string;
  customerGstin?: string;

  items: BillingItem[];

  paymentMode: PaymentMode;
  paymentMethods?: { mode: PaymentMode; amount: number }[]; // Amount in Rupees

  pricesIncludeTax?: boolean;
  invoiceDate?: Date; // Custom invoice date (defaults to now)

  // Context specific
  referenceType?: 'JOB' | 'SALE';
  referenceId?: string;

  // Behavior flags
  skipStockUpdate?: boolean; // For Repair (stock already consumed)
  skipReceipt?: boolean; // If strictly credit?

  loyaltyPointsRedeemed?: number;

  shop?: any; // Optional: Pass already fetched shop to avoid redundant lookup
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly receiptsService: ReceiptsService,
    private readonly documentNumberService: DocumentNumberService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }

  private generateReceiptId(): string {
    return `REC-${Date.now()}-${uuidv4().substring(0, 8)}`;
  }

  async createInvoice(options: CreateInvoiceOptions, tx?: any) {
    const prisma = tx || this.prisma;
    const { tenantId, shopId, items } = options;

    // 1. Fetch Shop Details (for GST/State) if not provided
    const shop =
      options.shop ||
      (await prisma.shop.findFirst({
        where: { id: shopId, tenantId },
        select: {
          id: true,
          gstEnabled: true,
          gstNumber: true, // P0: seller GSTIN
          state: true,
          receiptPrintCounter: true,
        },
      }));

    if (!shop) throw new BadRequestException('Shop not found');

    // ─── P0: Seller GSTIN Validation ──────────────────────────────────────
    if (shop.gstEnabled) {
      if (!shop.gstNumber) {
        throw new BadRequestException(
          'Shop GSTIN is required to issue a GST Tax Invoice. ' +
            'Please configure GSTIN in Shop Settings before creating a GST invoice.',
        );
      }
      assertGstinFormat(shop.gstNumber, 'Shop GSTIN');
    }

    // ─── P1: Buyer GSTIN Format Validation ────────────────────────────────
    if (options.customerGstin) {
      assertGstinFormat(options.customerGstin, 'Customer GSTIN');
    }

    // 2. Validate Items & Compliance
    const isIndianGSTInvoice = shop.gstEnabled && !!shop.state;

    // ─── P0: HSN/SAC Enforcement for GST Invoices ─────────────────────────
    if (isIndianGSTInvoice) {
      for (const item of items) {
        if (!item.hsnCode || item.hsnCode.trim() === '') {
          throw new BadRequestException(
            `HSN/SAC code is mandatory on every line of a GST Tax Invoice. ` +
              `Missing for product: "${item.name || item.shopProductId}". ` +
              `Please update the product catalogue with the correct HSN/SAC code.`,
          );
        }
      }
    }

    const lineInputs: InvoiceLineInput[] = items.map((item) => {
      return {
        shopProductId: item.shopProductId,
        quantity: item.quantity,
        ratePaisa: this.toPaisa(item.rate), // Input sent as Paise to strict calculator
        gstRate: item.gstRate,
        hsnCode: item.hsnCode,
      };
    });

    // 2b. Handle Loyalty Redemption (PRE-CALCULATION)
    let loyaltyDiscountPaise = 0;
    if (
      options.loyaltyPointsRedeemed &&
      options.loyaltyPointsRedeemed > 0 &&
      options.customerId
    ) {
      // First calculation to get base subtotal for validation
      const baseCalc = calculateInvoiceTotals(lineInputs, {
        isIndianGSTInvoice: !!isIndianGSTInvoice,
        pricesIncludeTax: !!options.pricesIncludeTax,
        shopStateCode: shop.state,
        customerStateCode: options.customerState,
        customerGstin: options.customerGstin,
      });

      const validation = await this.loyaltyService.validateRedemption(
        tenantId,
        options.customerId,
        options.loyaltyPointsRedeemed,
        baseCalc.subTotalPaisa,
        shopId,
      );

      if (validation.success) {
        loyaltyDiscountPaise = validation.discountPaise;
        // Add negative line item for discount
        lineInputs.push({
          shopProductId: 'LOYALTY_REDEMPTION',
          quantity: 1,
          ratePaisa: -loyaltyDiscountPaise,
          gstRate: 0,
          hsnCode: '99', // SAC for services/discounts
        });
      } else {
        throw new BadRequestException(
          `Loyalty redemption failed: ${validation.error}`,
        );
      }
    }

    // 3. Calculate Totals
    const calc = calculateInvoiceTotals(lineInputs, {
      isIndianGSTInvoice: !!isIndianGSTInvoice,
      pricesIncludeTax: !!options.pricesIncludeTax,
      shopStateCode: shop.state,
      customerStateCode: options.customerState,
      customerGstin: options.customerGstin,
    });

    const invoiceDate = options.invoiceDate || new Date();

    // 4. Map Lines for DB
    const invoiceItemsData = calc.lines.map((line) => {
      const parentItem = items.find(
        (i) => i.shopProductId === line.shopProductId,
      );

      let warrantyEndAt: Date | undefined;
      if (parentItem?.warrantyDays && parentItem.warrantyDays > 0) {
        warrantyEndAt = new Date(invoiceDate);
        warrantyEndAt.setDate(
          warrantyEndAt.getDate() + parentItem.warrantyDays,
        );
      }

      return {
        shopProductId: line.shopProductId,
        quantity: line.quantity,
        rate: line.ratePaisa,
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        gstAmount: line.gstAmountPaisa,
        lineTotal: line.lineTotalPaisa,
        warrantyDays: parentItem?.warrantyDays,
        warrantyEndAt: warrantyEndAt,
        serialNumbers: parentItem?.serialNumbers || [],
      };
    });

    // 5. Calculate Total Amount
    const totalAmountPaisa = calc.subTotalPaisa + calc.gstAmountPaisa;

    // 6. Payment Status
    let totalPaidPaisa = 0;
    const receiptsToCreate: { mode: PaymentMode; amountPaisa: number }[] = [];

    if (options.paymentMethods?.length) {
      for (const pm of options.paymentMethods) {
        if (pm.mode !== PaymentMode.CREDIT) {
          const p = this.toPaisa(pm.amount);
          totalPaidPaisa += p;
          receiptsToCreate.push({ mode: pm.mode, amountPaisa: p });
        }
      }
    } else {
      if (options.paymentMode !== PaymentMode.CREDIT) {
        totalPaidPaisa = totalAmountPaisa;
        receiptsToCreate.push({
          mode: options.paymentMode,
          amountPaisa: totalAmountPaisa,
        });
      }
    }

    let status: InvoiceStatus = InvoiceStatus.UNPAID;
    if (totalPaidPaisa >= totalAmountPaisa - 100) {
      status = InvoiceStatus.PAID;
    } else if (totalPaidPaisa > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    }

    // 7. Generate Invoice Number
    const invoiceNumber =
      await this.documentNumberService.generateDocumentNumber(
        shopId,
        DocumentType.SALES_INVOICE,
        invoiceDate,
        prisma, // Pass the active transaction client to prevent sequence gaps on rollback
      );

    // 8. Create Invoice
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        shopId,
        customerId: options.customerId,
        invoiceNumber,
        invoiceDate,
        customerName: options.customerName,
        customerPhone: options.customerPhone,
        customerState: options.customerState,
        customerGstin: options.customerGstin,
        shopGstin: shop.gstEnabled ? (shop.gstNumber ?? null) : null, // P0: seller GSTIN snapshot
        subTotal: calc.subTotalPaisa,
        gstAmount: calc.gstAmountPaisa,
        cgst: calc.cgstPaisa,
        sgst: calc.sgstPaisa,
        igst: calc.igstPaisa,
        totalAmount: totalAmountPaisa,
        paymentMode: options.paymentMode,
        status,
        jobCardId:
          options.referenceType === 'JOB' ? options.referenceId : undefined,
        items: { create: invoiceItemsData },
      },
    });

    // 9. Financial Entries
    const entries =
      receiptsToCreate.length > 0
        ? receiptsToCreate.map((r) => ({
            tenantId,
            shopId,
            type: 'IN' as const,
            amount: r.amountPaisa,
            mode: r.mode,
            referenceType: 'INVOICE' as const,
            referenceId: invoice.id,
          }))
        : options.paymentMode === PaymentMode.CREDIT
          ? []
          : [
              {
                tenantId,
                shopId,
                type: 'IN' as const,
                amount: totalAmountPaisa,
                mode: options.paymentMode,
                referenceType: 'INVOICE' as const,
                referenceId: invoice.id,
              },
            ];

    if (entries.length > 0) {
      await prisma.financialEntry.createMany({ data: entries });
    }

    // 10. Receipts
    if (!options.skipReceipt && receiptsToCreate.length > 0) {
      const cnt = receiptsToCreate.length;
      const updatedShop = await prisma.shop.update({
        where: { id: shopId },
        data: { receiptPrintCounter: { increment: cnt } },
        select: { receiptPrintCounter: true },
      });
      const startNum = updatedShop.receiptPrintCounter - cnt + 1;

      const receiptsData = receiptsToCreate.map((r, i) => ({
        id: uuidv4(),
        tenantId,
        shopId,
        receiptId: this.generateReceiptId(),
        printNumber: String(startNum + i),
        receiptType: ReceiptType.CUSTOMER,
        amount: r.amountPaisa,
        paymentMethod: r.mode,
        customerId: options.customerId,
        customerName: options.customerName,
        customerPhone: options.customerPhone,
        linkedInvoiceId: invoice.id,
        status: ReceiptStatus.ACTIVE,
        createdAt: new Date(),
      }));

      await prisma.receipt.createMany({ data: receiptsData });
    }

    // 11. Stock Updates
    if (!options.skipStockUpdate) {
      const stockItems = items.filter(
        (i) => i.productType !== ProductType.SERVICE,
      );
      if (stockItems.length > 0) {
        const stockOutItems = stockItems.map((i) => ({
          productId: i.shopProductId,
          quantity: i.quantity,
          costPerUnit: i.costPrice,
          imeis: i.imeis,
          note: `Invoice ${invoiceNumber}`,
        }));

        const stockRefType =
          options.referenceType === 'JOB' ? 'REPAIR' : 'SALE';
        const stockRefId =
          options.referenceType === 'JOB'
            ? (options.referenceId as string)
            : invoice.id;

        await this.stockService.recordStockOutBatch(
          tenantId,
          shopId,
          stockOutItems,
          stockRefType as any,
          stockRefId,
          tx,
        );
      }

      // IMEI Updates
      const allImeis = items.flatMap((i) => i.imeis || []);
      if (allImeis.length > 0) {
        const updateResult = await prisma.iMEI.updateMany({
          where: { imei: { in: allImeis }, tenantId, status: 'IN_STOCK' }, // Optimistic Lock
          data: { invoiceId: invoice.id, status: 'SOLD', soldAt: new Date() },
        });

        // If the number of rows updated doesn't match the number of IMEIs, one or more were sold concurrently
        if (updateResult.count !== allImeis.length) {
          throw new BadRequestException(
            'Concurrency Error: One or more IMEIs are no longer IN_STOCK',
          );
        }
      }
    }

    // 12. Complete Redemption Transaction
    if (
      loyaltyDiscountPaise > 0 &&
      options.loyaltyPointsRedeemed &&
      options.customerId
    ) {
      await this.loyaltyService.redeemPoints(
        tenantId,
        options.customerId,
        options.loyaltyPointsRedeemed,
        invoice.id,
        invoice.invoiceNumber,
        shopId,
      );
    }

    return invoice;
  }
}
