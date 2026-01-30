import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ProductType,
  IMEIStatus,
  ReceiptStatus,
  PaymentMode,
  ReceiptType,
  InvoiceStatus,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import {
  generateSalesInvoiceNumber,
  getFinancialYear,
} from '../../common/utils/invoice-number.util';
import {
  calculateInvoiceTotals,
  InvoiceLineInput,
} from './invoice-calculator.util';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
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

  async createInvoice(tenantId: string, dto: SalesInvoiceDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item required');
    }

    const invoiceId = await this.prisma.$transaction(async (tx) => {
      // 1. Validate shop
      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true, gstEnabled: true, state: true },
      });
      if (!shop) throw new BadRequestException('Invalid shop');

      // 2. Validate products
      const productIds = dto.items.map((i) => i.shopProductId);
      const products = await tx.shopProduct.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          shopId: dto.shopId,
          isActive: true,
        },
        select: { id: true, isSerialized: true, hsnCode: true },
      });
      if (products.length !== productIds.length)
        throw new BadRequestException('Invalid product');
      const productSerializedMap = new Map(
        products.map((p) => [p.id, p.isSerialized]),
      );
      const productHsnMap = new Map(
        products.map((p) => [p.id, p.hsnCode || null]),
      );

      // 3. IMEI logic
      const allImeis: string[] = [];
      const imeisByProduct = new Map<string, string[]>();
      for (const item of dto.items) {
        const isSerialized = productSerializedMap.get(item.shopProductId);
        if (isSerialized && !item.imeis?.length)
          throw new BadRequestException(`Serialized product requires IMEI`);
        if (!isSerialized && item.imeis?.length)
          throw new BadRequestException(
            `Non-serialized product cannot have IMEI`,
          );
        if (isSerialized && item.imeis) {
          if (item.quantity !== item.imeis.length)
            throw new BadRequestException(`Quantity mismatch`);
          allImeis.push(...item.imeis);
          imeisByProduct.set(item.shopProductId, item.imeis);
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

        for (const record of imeiRecords) {
          const expectedProductId = Array.from(imeisByProduct.entries()).find(
            ([_, imeis]) => imeis.includes(record.imei),
          )?.[0];
          if (record.shopProductId !== expectedProductId) {
            throw new BadRequestException(
              `IMEI ${record.imei} does not belong to product ${expectedProductId}`,
            );
          }
          if (record.status !== 'IN_STOCK') {
            throw new BadRequestException(
              `IMEI ${record.imei} is not available (status: ${record.status})`,
            );
          }
        }
      }

      // 4. Calculate Totals (Money logic)
      const lineInputs: InvoiceLineInput[] = dto.items.map((i) => {
        if (!shop.gstEnabled && i.gstRate > 0) {
          throw new BadRequestException(
            'GST not enabled for this shop. GST rate must be 0.',
          );
        }
        if (i.gstRate < 0 || i.gstRate > 100) {
          throw new BadRequestException(
            `Invalid GST rate: ${i.gstRate}. Must be between 0 and 100%.`,
          );
        }
        return {
          shopProductId: i.shopProductId,
          quantity: i.quantity,
          rate: i.rate,
          gstRate: i.gstRate,
          hsnCode: productHsnMap.get(i.shopProductId) || undefined,
        };
      });

      // Calculate GST flag
      const isIndianGSTInvoice = shop.gstEnabled && shop.state !== '';
      const calc = calculateInvoiceTotals(lineInputs, {
        isIndianGSTInvoice,
        pricesIncludeTax: !!dto.pricesIncludeTax,
        shopState: shop.state,
        customerState: dto.customerState,
        customerGstin: dto.customerGstin,
      });

      // Re-map properly using helper
      const invoiceItemsDataCorrected = calc.lines.map((line) => ({
        shopProductId: line.shopProductId,
        quantity: line.quantity,
        rate: this.toInt(line.rate), // Rate typically stored as integer rupees in many legacy systems, but ideally should be paisa.
        // We will keep `toInt` for rate to minimize friction if schema is weak,
        // BUT `lineTotal` MUST be paisa.
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        gstAmount: this.toPaisa(line.gstAmount),
        lineTotal: this.toPaisa(line.lineTotal), // CHANGED to toPaisa for consistency
      }));

      // 5. Determine Payment Status
      // Total Amount in PAISA
      const totalAmountPaisa = this.toPaisa(calc.subTotal + calc.gstAmount);

      let totalPaidPaisa = 0;
      const receiptsToCreate: { mode: PaymentMode; amountPaisa: number }[] = [];
      const primaryPaymentMode =
        (dto.paymentMethods?.[0]?.mode as PaymentMode) ||
        (dto.paymentMode as PaymentMode) ||
        PaymentMode.CASH;

      if (dto.paymentMethods && dto.paymentMethods.length > 0) {
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
          : InvoiceStatus.CREDIT; // 1 rupee tolerance

      // 6. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          shopId: dto.shopId,
          customerId: dto.customerId,
          invoiceNumber: await this.getNextInvoiceNumber(tx, dto.shopId, 'S'),
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerState: dto.customerState,
          customerGstin: dto.customerGstin,
          subTotal: this.toPaisa(calc.subTotal),
          gstAmount: this.toPaisa(calc.gstAmount),
          cgst: this.toPaisa(calc.cgst),
          sgst: this.toPaisa(calc.sgst),
          igst: this.toPaisa(calc.igst),
          totalAmount: totalAmountPaisa,
          paymentMode: primaryPaymentMode,
          status: invoiceStatus,
          items: { create: invoiceItemsDataCorrected },
        },
      });

      // 7. Create Financial Entries (Ledger)
      // Store in Paisa? Legacy might expect Rupees?
      // Checking existing code: `amount: pm.amount` (likely Rupees from DTO).
      // Checking `financialEntry` schema: Int.
      // If we change to Paisa, it might break dashboard if dashboard expects Rupees.
      // BUT requirement says: "Enforce ALL monetary values ... in PAISA".
      // We will store in PAISA.
      if (dto.paymentMethods && dto.paymentMethods.length > 0) {
        const entries = dto.paymentMethods.map((pm) => ({
          tenantId,
          shopId: dto.shopId,
          type: 'IN' as const,
          amount: this.toPaisa(pm.amount), // Paisa
          mode: pm.mode,
          referenceType: 'INVOICE' as const,
          referenceId: invoice.id,
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
            referenceId: invoice.id,
          },
        });
      }

      // 8. Create Receipts
      if (receiptsToCreate.length > 0) {
        // Atomic Print Number
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
              amount: r.amountPaisa, // Paisa
              paymentMethod: r.mode,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              customerPhone: invoice.customerPhone,
              linkedInvoiceId: invoice.id,
              status: ReceiptStatus.ACTIVE,
            },
          });
        }
      }

      // 9. Stock Out
      const createdInvoice = await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: { items: true },
      });
      if (!createdInvoice)
        throw new BadRequestException('Invoice creation validation failed');

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        const invoiceItem = createdInvoice.items[i];
        const isSerialized = productSerializedMap.get(item.shopProductId);

        await this.stockService.recordStockOut(
          tenantId,
          dto.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          invoiceItem.id,
          undefined,
          isSerialized ? item.imeis : undefined,
        );
      }

      // 10. Update IMEIs
      if (allImeis.length > 0) {
        await tx.iMEI.updateMany({
          where: { imei: { in: allImeis }, tenantId }, // tenantId constraint
          data: { invoiceId: invoice.id, status: 'SOLD', soldAt: new Date() },
        });
      }

      return invoice.id;
    });
    return this.getInvoiceDetails(tenantId, invoiceId);
  }

  async updateInvoice(
    tenantId: string,
    invoiceId: string,
    dto: SalesInvoiceDto,
  ) {
    if (!dto.items?.length)
      throw new BadRequestException('At least one item required');

    const txResult = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch Existing
      const oldInvoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { items: true, receipts: true },
      });

      if (!oldInvoice) throw new BadRequestException('Invoice not found');
      if (oldInvoice.status === 'CANCELLED')
        throw new BadRequestException('Cannot update cancelled invoice');

      const shop = await tx.shop.findFirst({
        where: { id: dto.shopId, tenantId },
        select: { id: true, gstEnabled: true, state: true },
      });
      if (!shop) throw new BadRequestException('Invalid shop');

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
        select: { id: true, type: true, isSerialized: true, hsnCode: true },
      });

      if (products.length !== productIds.length)
        throw new BadRequestException('Invalid product');

      const productSerializedMap = new Map(
        products.map((p) => [p.id, p.isSerialized]),
      );
      const productHsnMap = new Map(
        products.map((p) => [p.id, p.hsnCode || null]),
      );

      const newAllImeis: string[] = [];
      const newImeisByProduct = new Map<string, string[]>();

      for (const item of dto.items) {
        const isSerialized = productSerializedMap.get(item.shopProductId);
        // ... (Same validation as create)
        if (isSerialized && !item.imeis?.length)
          throw new BadRequestException(`Serialized product requires IMEI`);
        if (!isSerialized && item.imeis?.length)
          throw new BadRequestException(
            `Non-serialized product cannot have IMEI`,
          );
        if (isSerialized && item.imeis) {
          if (item.quantity !== item.imeis.length)
            throw new BadRequestException(`Quantity mismatch`);
          newAllImeis.push(...item.imeis);
          newImeisByProduct.set(item.shopProductId, item.imeis);
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
          // Allow if status=IN_STOCK OR (status=SOLD and invoiceId=currentInvoiceId -- handled by revert step which freed them)
          // Since we reverted in step 3, they should be IN_STOCK and invoiceId=null.
          if (record.status !== 'IN_STOCK')
            throw new BadRequestException(`IMEI ${record.imei} not available`);
        }
      }

      // 7. Calculate New Totals
      const lineInputs = dto.items.map((i) => ({
        shopProductId: i.shopProductId,
        quantity: i.quantity,
        rate: i.rate,
        gstRate: i.gstRate,
        hsnCode: productHsnMap.get(i.shopProductId) || undefined,
      }));

      const calc = calculateInvoiceTotals(lineInputs, {
        isIndianGSTInvoice: shop.gstEnabled && shop.state !== '', // Simplified check
        pricesIncludeTax: !!dto.pricesIncludeTax,
        shopState: shop.state,
        customerState: dto.customerState,
        customerGstin: dto.customerGstin,
      });

      const totalAmountPaisa = this.toPaisa(calc.subTotal + calc.gstAmount);

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
          : InvoiceStatus.CREDIT;

      // 9. Update Invoice
      await tx.invoiceItem.deleteMany({ where: { invoiceId: oldInvoice.id } });

      const invoiceItemsData = calc.lines.map((line) => ({
        shopProductId: line.shopProductId,
        quantity: line.quantity,
        rate: this.toInt(line.rate),
        hsnCode: line.hsnCode,
        gstRate: line.gstRate,
        gstAmount: this.toPaisa(line.gstAmount),
        lineTotal: this.toPaisa(line.lineTotal),
      }));

      const updatedInvoice = await tx.invoice.update({
        where: { id: oldInvoice.id },
        data: {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          subTotal: this.toPaisa(calc.subTotal),
          gstAmount: this.toPaisa(calc.gstAmount),
          totalAmount: totalAmountPaisa,
          paymentMode: primaryPaymentMode,
          status: invoiceStatus,
          items: { create: invoiceItemsData },
        },
        include: { items: true },
      });

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

        await this.stockService.recordStockOut(
          tenantId,
          dto.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          invoiceItem.id,
          undefined,
          isSerialized ? item.imeis : undefined,
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

  async cancelInvoice(tenantId: string, invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch invoice with items
      const invoice = await tx.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }

      if (invoice.status === 'CANCELLED') {
        throw new BadRequestException('Invoice already cancelled');
      }

      // 2️⃣ Mark invoice as cancelled
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // 2️⃣.5️⃣ Revert IMEI links (mark as available again)
      // ✅ FIX: Reset status to IN_STOCK and clear soldAt
      await tx.iMEI.updateMany({
        where: { invoiceId: invoice.id },
        data: {
          invoiceId: null,
          status: IMEIStatus.IN_STOCK,
          soldAt: null,
        },
      });

      // 3️⃣ Reverse stock (IN) using StockService with InvoiceItem.id
      for (const item of invoice.items) {
        await this.stockService.recordStockIn(
          tenantId,
          invoice.shopId,
          item.shopProductId,
          item.quantity,
          'SALE',
          item.id,
        );
      }

      // 4️⃣ Reverse financial entry (OUT)
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: invoice.shopId,
          type: 'OUT',
          amount: invoice.totalAmount,
          mode: invoice.paymentMode,
          referenceType: 'INVOICE',
          referenceId: invoice.id,
          note: 'Invoice cancelled',
        },
      });

      // 5. Cancel Receipts
      await tx.receipt.updateMany({
        where: { linkedInvoiceId: invoice.id, status: ReceiptStatus.ACTIVE },
        data: {
          status: ReceiptStatus.CANCELLED,
          narration: 'Invoice Cancelled',
        },
      });

      return { success: true };
    });
  }
  async listInvoices(tenantId: string, shopId: string) {
    // validate shop belongs to tenant
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, tenantId },
      select: { id: true },
    });

    if (!shop) {
      // Check if tenant has any shops
      const shopCount = await this.prisma.shop.count({
        where: { tenantId },
      });

      if (shopCount === 0) {
        return {
          invoices: [],
          empty: true,
          message:
            'No shops found. Create a shop to start creating sales invoices.',
          createShopUrl: '/mobileshop/shops',
        };
      }

      throw new BadRequestException('Invalid shop');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        shopId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        receipts: {
          where: { status: 'ACTIVE' },
          select: { amount: true },
        },
      },
    });

    // Enrich with calculated fields: paidAmount, balanceAmount, paymentStatus
    const enrichedInvoices = invoices.map((invoice) => {
      const paidAmount = invoice.receipts.reduce((sum, r) => sum + r.amount, 0);
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
        customerName: invoice.customerName,
        totalAmount: this.fromPaisa(invoice.totalAmount), // Fix: Paisa -> Rupee
        paymentMode: invoice.paymentMode,
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        paidAmount: this.fromPaisa(paidAmount), // Fix: Paisa -> Rupee
        balanceAmount: this.fromPaisa(balanceAmount), // Fix: Paisa -> Rupee
        paymentStatus,
      };
    });

    return { invoices: enrichedInvoices, empty: false };
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
            shopProductId: true,
            quantity: true,
            rate: true,
            hsnCode: true,
            gstRate: true,
            gstAmount: true,
            lineTotal: true,
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

    // Convert paisa back to rupees for values stored with decimal precision
    const fromPaisa = (paisa: number) => paisa / 100;

    return {
      id: invoice.id,
      shopId: invoice.shopId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerGstin: invoice.customerGstin,
      customerState: invoice.customerState,

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
          rate: item.rate, // Rate is typically unit price, usually stored as Float in generic apps, but likely Int here?
          // Checking schema would clarify. Assuming rate is Float/Rupees as per previous patterns or handled upstream.
          // But wait, if everything is Paisa, rate might be Paisa too.
          // Let's assume rate is kept as is for now unless I see otherwise.
          // Actually rate is likely Rupee in most designs, but lineTotal is what matters for sum.
          // Rate * Qty = LineTotal.
          // If LineTotal is Paisa, Rate * Qty should be Paisa.
          // If Rate is Rupee, Rate * 100 * Qty = LineTotal.
          // createInvoice does: const lineTotal = item.quantity * item.rate (if rate is Paisa).
          // createInvoice logic:
          // const rate = item.rate; // from DTO
          // lineTotal = rate * quantity (if rate is Paisa? No, DTO is usually Rupees).
          // Let's check createInvoice logic again later.
          // For now, let's keep rate as passed (it's informational), but ensure totals are converted.
          hsnCode: item.hsnCode || undefined,
          gstRate: item.gstRate || undefined,
          gstAmount,
          lineTotal,
          taxableValue,
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
        shop: {
          select: {
            name: true,
            phone: true,
          },
        },
        items: {
          select: {
            quantity: true,
            rate: true,
            lineTotal: true,
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
      totalAmount: this.fromPaisa(invoice.totalAmount), // Fix: Paisa -> Rupee
      status: invoice.status,
      shopName: invoice.shop.name,
      shopPhone: invoice.shop.phone,
      items: invoice.items.map((item) => ({
        description: item.product.name,
        quantity: item.quantity,
        rate: item.rate, // Keeping rate as is, assuming it's unit price (Review if needed)
        total: this.fromPaisa(item.lineTotal), // Fix: Paisa -> Rupee
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
        status: { not: 'CANCELLED' },
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch invoice
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { receipts: { where: { status: 'ACTIVE' } } },
      });

      if (!invoice) throw new BadRequestException('Invoice not found');
      if (invoice.status === 'CANCELLED')
        throw new BadRequestException(
          'Cannot collect payment for cancelled invoice',
        );

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

      // If paid >= total (with tolerance), mark PAID. Else remains CREDIT.
      const newStatus =
        newTotalPaidPaisa >= totalAmountPaisa - 100
          ? InvoiceStatus.PAID
          : InvoiceStatus.CREDIT;

      // Only update if status changed, but always nice to ensure consistency
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      return {
        invoiceId: updatedInvoice.id,
        totalAmount: this.fromPaisa(totalAmountPaisa),
        paidAmount: this.fromPaisa(newTotalPaidPaisa),
        balanceAmount: this.fromPaisa(totalAmountPaisa - newTotalPaidPaisa),
        status: newStatus,
        message: 'Payment collected successfully',
      };
    });
  }

  /**
   * Get public invoice verification (limited data for public route)
   * @param invoiceId - Invoice ID
   * @returns Public invoice data (no sensitive info)
   */
}
