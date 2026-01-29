export interface InvoiceLineInput {
  shopProductId: string;
  quantity: number;
  rate: number; // what user entered / what should appear as Rate column
  gstRate: number; // percentage 0-100
  hsnCode?: string | null;
}

export interface InvoiceCalculationContext {
  isIndianGSTInvoice: boolean;
  pricesIncludeTax: boolean;
  shopState?: string | null;
  customerState?: string | null;
  customerGstin?: string | null;
}

export interface CalculatedInvoiceLine {
  shopProductId: string;
  quantity: number;
  rate: number;
  hsnCode: string;
  gstRate: number;
  taxableValue: number; // per-line taxable value (rate excl. GST × qty)
  gstAmount: number; // per-line GST amount
  lineTotal: number; // taxable + GST
}

export interface InvoiceCalculationResult {
  lines: CalculatedInvoiceLine[];
  subTotal: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  isB2B: boolean;
}

const round2 = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export function calculateInvoiceTotals(
  inputs: InvoiceLineInput[],
  context: InvoiceCalculationContext,
): InvoiceCalculationResult {
  const {
    isIndianGSTInvoice,
    pricesIncludeTax,
    shopState,
    customerState,
    customerGstin,
  } = context;

  const lines: CalculatedInvoiceLine[] = [];

  let subTotal = 0;
  let gstAmount = 0;

  for (const input of inputs) {
    const gstRate = input.gstRate < 0 ? 0 : input.gstRate;
    const hsnCode = input.hsnCode || '';

    const effectiveGstRate =
      isIndianGSTInvoice && gstRate > 0 && gstRate <= 100 ? gstRate : 0;

    const qty = input.quantity;
    const displayRate = input.rate;

    let taxableValue = 0;
    let lineGst = 0;
    let lineTotal = 0;

    if (effectiveGstRate === 0) {
      // No GST for this line
      taxableValue = round2(displayRate * qty);
      lineGst = 0;
      lineTotal = taxableValue;
    } else if (pricesIncludeTax) {
      // Rate is inclusive of GST: split into base + GST
      const grossPerUnit = displayRate;
      const divisor = 1 + effectiveGstRate / 100;
      const basePerUnit = round2(grossPerUnit / divisor);
      const gstPerUnit = round2(grossPerUnit - basePerUnit);

      // Work in two decimals per line
      const grossLine = round2(grossPerUnit * qty);
      taxableValue = round2(basePerUnit * qty);
      // Reconcile GST so that taxable + GST = gross
      lineGst = round2(grossLine - taxableValue);
      lineTotal = round2(taxableValue + lineGst);
    } else {
      // Rate is exclusive of GST
      const basePerUnit = displayRate;
      taxableValue = round2(basePerUnit * qty);
      lineGst = round2((taxableValue * effectiveGstRate) / 100);
      lineTotal = round2(taxableValue + lineGst);
    }

    subTotal = round2(subTotal + taxableValue);
    gstAmount = round2(gstAmount + lineGst);

    lines.push({
      shopProductId: input.shopProductId,
      quantity: qty,
      rate: displayRate,
      hsnCode,
      gstRate: effectiveGstRate,
      taxableValue,
      gstAmount: lineGst,
      lineTotal,
    });
  }

  // Determine intra/inter state for CGST/SGST/IGST only for Indian GST invoices
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isIndianGSTInvoice && gstAmount > 0) {
    if (shopState && customerState && shopState !== customerState) {
      igst = gstAmount;
    } else {
      // Default / same-state: split equally as CGST + SGST
      const half = gstAmount / 2;
      cgst = round2(half);
      sgst = round2(gstAmount - cgst);
    }
  }

  const isB2B = isIndianGSTInvoice && !!customerGstin;

  return {
    lines,
    subTotal: round2(subTotal),
    gstAmount: round2(gstAmount),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    isB2B,
  };
}
