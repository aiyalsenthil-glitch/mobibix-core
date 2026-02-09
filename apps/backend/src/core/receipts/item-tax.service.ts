import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TaxCalculation {
  baseAmount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  finalAmount: number;
}

@Injectable()
export class ItemTaxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate tax for item based on HSN and rates
   */
  calculateItemTax(
    baseAmount: number,
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
  ): TaxCalculation {
    // Validate rates
    this.validateTaxRates(cgstRate, sgstRate, igstRate);

    // Calculate amounts (in paisa)
    const cgstAmount = Math.round((baseAmount * cgstRate) / 100);
    const sgstAmount = Math.round((baseAmount * sgstRate) / 100);
    const igstAmount = Math.round((baseAmount * igstRate) / 100);
    const totalTax = cgstAmount + sgstAmount + igstAmount;

    return {
      baseAmount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      finalAmount: baseAmount + totalTax,
    };
  }

  /**
   * Validate tax rates are within standard GST slabs
   */
  validateTaxRates(cgstRate: number, sgstRate: number, igstRate: number): void {
    const validRates = [0, 5, 12, 18];

    if (!validRates.includes(cgstRate)) {
      throw new BadRequestException(
        `Invalid CGST rate: ${cgstRate}. Must be one of: ${validRates.join(', ')}`,
      );
    }

    if (!validRates.includes(sgstRate)) {
      throw new BadRequestException(
        `Invalid SGST rate: ${sgstRate}. Must be one of: ${validRates.join(', ')}`,
      );
    }

    if (!validRates.includes(igstRate)) {
      throw new BadRequestException(
        `Invalid IGST rate: ${igstRate}. Must be one of: ${validRates.join(', ')}`,
      );
    }

    // CGST + SGST should equal IGST (9% = 4.5% + 4.5%, 18% = 9% + 9%)
    const combinedRate = cgstRate + sgstRate;
    if (combinedRate !== igstRate && igstRate !== 0) {
      throw new BadRequestException(
        `Tax rate mismatch: CGST (${cgstRate}) + SGST (${sgstRate}) = ${combinedRate} != IGST (${igstRate})`,
      );
    }
  }

  /**
   * Get applicable tax rates for HSN code
   */
  async getTaxRatesForHSN(
    tenantId: string,
    hsnCode: string,
  ): Promise<{
    hsnCode: string;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
  }> {
    // Look up HSN in ItemMaster or configuration
    // For now, return standard rates based on HSN mapping
    // (Implementation: store in ItemMaster or TaxConfiguration table)

    const hsnTaxMap: Record<
      string,
      { cgst: number; sgst: number; igst: number }
    > = {
      '8701': { cgst: 5, sgst: 5, igst: 10 }, // Tractors
      '6204': { cgst: 9, sgst: 9, igst: 18 }, // Textiles
      '7308': { cgst: 5, sgst: 5, igst: 10 }, // Metals
    };

    const rates = hsnTaxMap[hsnCode] || { cgst: 0, sgst: 0, igst: 0 };

    return {
      hsnCode,
      cgstRate: rates.cgst,
      sgstRate: rates.sgst,
      igstRate: rates.igst,
    };
  }

  /**
   * Update tax rates for invoice items
   */
  async updateInvoiceItemTaxes(
    tenantId: string,
    invoiceId: string,
    itemUpdates: Array<{
      itemId: string;
      cgstRate: number;
      sgstRate: number;
      igstRate: number;
    }>,
  ): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new BadRequestException('Invoice not found');
    }

    for (const update of itemUpdates) {
      // Validate rates
      this.validateTaxRates(update.cgstRate, update.sgstRate, update.igstRate);

      // Get current item to recalculate amounts
      const item = await this.prisma.invoiceItem.findUnique({
        where: { id: update.itemId },
      });

      if (!item) {
        throw new BadRequestException(`Item ${update.itemId} not found`);
      }

      // Recalculate tax amounts
      const taxCalc = this.calculateItemTax(
        item.lineTotal,
        update.cgstRate,
        update.sgstRate,
        update.igstRate,
      );

      // Update item
      await this.prisma.invoiceItem.update({
        where: { id: update.itemId },
        data: {
          cgstRate: update.cgstRate,
          sgstRate: update.sgstRate,
          igstRate: update.igstRate,
          cgstAmount: taxCalc.cgstAmount,
          sgstAmount: taxCalc.sgstAmount,
          igstAmount: taxCalc.igstAmount,
        },
      });
    }

    // Recalculate invoice totals
    const items = await this.prisma.invoiceItem.findMany({
      where: { invoiceId },
    });

    const totalCgst = items.reduce(
      (sum, item) => sum + (item.cgstAmount || 0),
      0,
    );
    const totalSgst = items.reduce(
      (sum, item) => sum + (item.sgstAmount || 0),
      0,
    );
    const totalIgst = items.reduce(
      (sum, item) => sum + (item.igstAmount || 0),
      0,
    );
    const totalTax = totalCgst + totalSgst + totalIgst;
    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subTotal: totalAmount,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
      },
    });
  }

  /**
   * Get tax summary for invoice
   */
  async getInvoiceTaxSummary(
    tenantId: string,
    invoiceId: string,
  ): Promise<{
    invoiceId: string;
    baseAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTax: number;
    finalAmount: number;
  }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new BadRequestException('Invoice not found');
    }

    const baseAmount = invoice.items.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );

    // Calculate effective rates (weighted average)
    const totalQuantity = invoice.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const avgCgstRate =
      totalQuantity > 0
        ? Math.round(
            (invoice.items.reduce(
              (sum, item) => sum + Number(item.cgstRate) * item.quantity,
              0,
            ) /
              totalQuantity) *
              100,
          ) / 100
        : 0;

    return {
      invoiceId,
      baseAmount,
      cgstRate: avgCgstRate,
      cgstAmount: invoice.cgst || 0,
      sgstRate: avgCgstRate,
      sgstAmount: invoice.sgst || 0,
      igstRate: avgCgstRate * 2,
      igstAmount: invoice.igst || 0,
      totalTax: (invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0),
      finalAmount: invoice.subTotal,
    };
  }
}
