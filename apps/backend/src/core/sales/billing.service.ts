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
import { calculateInvoiceTotals, InvoiceLineInput } from './invoice-calculator.util';
import { v4 as uuidv4 } from 'uuid';

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
  
  // Context specific
  referenceType?: 'JOB' | 'SALE';
  referenceId?: string;
  
  // Behavior flags
  skipStockUpdate?: boolean; // For Repair (stock already consumed)
  skipReceipt?: boolean;     // If strictly credit?
  
  shop?: any;                // Optional: Pass already fetched shop to avoid redundant lookup
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly receiptsService: ReceiptsService,
    private readonly documentNumberService: DocumentNumberService,
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
    const shop = options.shop || await prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true, gstEnabled: true, state: true, receiptPrintCounter: true },
    });

    if (!shop) throw new BadRequestException('Shop not found');
    
    // 2. Validate Items & Compliance
    const isIndianGSTInvoice = shop.gstEnabled && !!shop.state;
    const lineInputs: InvoiceLineInput[] = items.map(item => {
        if (shop.gstEnabled && item.gstRate <= 0 && process.env.STRICT_GST === 'true') {
             // Optional strict check
        }
        return {
            shopProductId: item.shopProductId,
            quantity: item.quantity,
            rate: item.rate,
            gstRate: item.gstRate,
            hsnCode: item.hsnCode,
        };
    });

    // 3. Calculate Totals
    const calc = calculateInvoiceTotals(lineInputs, {
        isIndianGSTInvoice: !!isIndianGSTInvoice,
        pricesIncludeTax: !!options.pricesIncludeTax,
        shopState: shop.state,
        customerState: options.customerState,
        customerGstin: options.customerGstin,
    });

    // 4. Map Lines for DB
    const invoiceItemsData = calc.lines.map((line, idx) => ({
        shopProductId: line.shopProductId,
        quantity: line.quantity,
        rate: Math.round(line.rate), // Integers for rate? SalesService uses it.
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        gstAmount: this.toPaisa(line.gstAmount),
        lineTotal: this.toPaisa(line.lineTotal),
    }));

    // 5. Calculate Total Amount
    const totalAmountPaisa = this.toPaisa(calc.subTotal + calc.gstAmount);
    
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
             receiptsToCreate.push({ mode: options.paymentMode, amountPaisa: totalAmountPaisa });
         }
    }

    const status = totalPaidPaisa >= (totalAmountPaisa - 100) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    // 7. Generate Invoice Number
    const invoiceNumber = await this.documentNumberService.generateDocumentNumber(
        shopId,
        DocumentType.SALES_INVOICE,
        new Date()
    );

    // 8. Create Invoice
    const invoice = await prisma.invoice.create({
        data: {
            tenantId,
            shopId,
            customerId: options.customerId,
            invoiceNumber,
            invoiceDate: new Date(),
            customerName: options.customerName,
            customerPhone: options.customerPhone,
            customerState: options.customerState,
            customerGstin: options.customerGstin,
            subTotal: this.toPaisa(calc.subTotal),
            gstAmount: this.toPaisa(calc.gstAmount),
            cgst: this.toPaisa(calc.cgst),
            sgst: this.toPaisa(calc.sgst),
            igst: this.toPaisa(calc.igst),
            totalAmount: totalAmountPaisa,
            paymentMode: options.paymentMode,
            status,
            jobCardId: options.referenceType === 'JOB' ? options.referenceId : undefined,
            items: { create: invoiceItemsData },
        }
    });

    // 9. Financial Entries
    const entries = receiptsToCreate.length > 0 ? receiptsToCreate.map(r => ({
        tenantId,
        shopId,
        type: 'IN' as const,
        amount: r.amountPaisa,
        mode: r.mode,
        referenceType: 'INVOICE' as const,
        referenceId: invoice.id,
    })) : (options.paymentMode === PaymentMode.CREDIT ? [] : [{
        tenantId,
        shopId,
        type: 'IN' as const,
        amount: totalAmountPaisa,
        mode: options.paymentMode,
        referenceType: 'INVOICE' as const,
        referenceId: invoice.id,
    }]);

    if (entries.length > 0) {
        await prisma.financialEntry.createMany({ data: entries });
    }

    // 10. Receipts
    if (!options.skipReceipt && receiptsToCreate.length > 0) {
         const cnt = receiptsToCreate.length;
         const updatedShop = await prisma.shop.update({
             where: { id: shopId },
             data: { receiptPrintCounter: { increment: cnt } },
             select: { receiptPrintCounter: true }
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
        const stockItems = items.filter(i => i.productType !== ProductType.SERVICE);
        if (stockItems.length > 0) {
             const stockOutItems = stockItems.map(i => ({
                 productId: i.shopProductId,
                 quantity: i.quantity,
                 costPerUnit: i.costPrice,
                 imeis: i.imeis,
                 note: `Invoice ${invoiceNumber}`
             }));
             
             await this.stockService.recordStockOutBatch(
                 tenantId,
                 shopId,
                 stockOutItems,
                 'SALE', // ReferenceType
                 invoice.id, // ReferenceId
                 tx
             );
        }
        
        // IMEI Updates
        const allImeis = items.flatMap(i => i.imeis || []);
        if (allImeis.length > 0) {
             await prisma.iMEI.updateMany({
                 where: { imei: { in: allImeis }, tenantId },
                 data: { invoiceId: invoice.id, status: 'SOLD', soldAt: new Date() }
             });
        }
    }

    return invoice;
  }
}
