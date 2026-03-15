import { normalizeStateCode } from './state-normalizer.util';

export interface InvoiceLineInput {
  shopProductId: string;
  quantity: number;
  ratePaisa: number; // strictly Paise (Integer)
  gstRate: number; // percentage 0-100
  hsnCode?: string | null;
}

export interface InvoiceCalculationContext {
  isIndianGSTInvoice: boolean;
  pricesIncludeTax: boolean;
  shopStateCode?: string | null; // e.g. "TN"
  customerStateCode?: string | null; // e.g. "TN"
  customerGstin?: string | null;
}

export interface CalculatedInvoiceLine {
  shopProductId: string;
  quantity: number;
  ratePaisa: number;
  hsnCode: string;
  gstRate: number;
  taxableValuePaisa: number; // per-line taxable value in Paise
  gstAmountPaisa: number; // per-line GST amount in Paise
  lineTotalPaisa: number; // taxable + GST in Paise
}

export interface InvoiceCalculationResult {
  lines: CalculatedInvoiceLine[];
  subTotalPaisa: number;
  gstAmountPaisa: number;
  cgstPaisa: number;
  sgstPaisa: number;
  igstPaisa: number;
  isB2B: boolean;
}

export function calculateInvoiceTotals(
  inputs: InvoiceLineInput[],
  context: InvoiceCalculationContext,
): InvoiceCalculationResult {
  const {
    isIndianGSTInvoice,
    pricesIncludeTax,
    shopStateCode,
    customerStateCode,
    customerGstin,
  } = context;

  const lines: CalculatedInvoiceLine[] = [];

  let subTotalPaisa = 0;
  let gstAmountPaisa = 0;

  for (const input of inputs) {
    const gstRate = input.gstRate < 0 ? 0 : input.gstRate;
    // hsnCode is validated upstream (billing.service) for GST invoices.
    // We preserve whatever arrives; empty string is intentional for non-GST products.
    const hsnCode = input.hsnCode ?? '';

    const effectiveGstRate =
      isIndianGSTInvoice && gstRate > 0 && gstRate <= 100 ? gstRate : 0;

    const qty = input.quantity;
    const displayRatePaisa = Math.round(input.ratePaisa); // Ensure integer

    let taxableValuePaisa = 0;
    let lineGstPaisa = 0;
    let lineTotalPaisa = 0;

    if (effectiveGstRate === 0) {
      // No GST
      taxableValuePaisa = displayRatePaisa * qty;
      lineGstPaisa = 0;
      lineTotalPaisa = taxableValuePaisa;
    } else if (pricesIncludeTax) {
      // Rate is inclusive of GST.
      // Total gross line amount:
      const grossLinePaisa = displayRatePaisa * qty;

      // Calculate Taxable Base = (Gross * 100) / (100 + GST Rate)
      // Math.round applies nearest-integer standard accounting
      taxableValuePaisa = Math.round(
        (grossLinePaisa * 100) / (100 + effectiveGstRate),
      );

      // GST is simply the difference, guaranteeing no rounding drops
      lineGstPaisa = grossLinePaisa - taxableValuePaisa;
      lineTotalPaisa = grossLinePaisa;
    } else {
      // Rate is exclusive of GST.
      taxableValuePaisa = displayRatePaisa * qty;

      // GST = (Taxable * Rate) / 100
      lineGstPaisa = Math.round((taxableValuePaisa * effectiveGstRate) / 100);

      lineTotalPaisa = taxableValuePaisa + lineGstPaisa;
    }

    subTotalPaisa += taxableValuePaisa;
    gstAmountPaisa += lineGstPaisa;

    lines.push({
      shopProductId: input.shopProductId,
      quantity: qty,
      ratePaisa: displayRatePaisa,
      hsnCode,
      gstRate: effectiveGstRate,
      taxableValuePaisa,
      gstAmountPaisa: lineGstPaisa,
      lineTotalPaisa,
    });
  }

  // Determine intra/inter state for CGST/SGST/IGST
  let cgstPaisa = 0;
  let sgstPaisa = 0;
  let igstPaisa = 0;

  if (isIndianGSTInvoice && gstAmountPaisa > 0) {
    // Both state codes must be present, valid, and identical to be local.
    // Normalize state codes to handle "Tamilnadu" == "Tamil Nadu" vs "TN"
    const isInterState = Boolean(
      shopStateCode &&
      customerStateCode &&
      normalizeStateCode(shopStateCode) !==
        normalizeStateCode(customerStateCode),
    );

    if (isInterState) {
      igstPaisa = gstAmountPaisa;
    } else {
      // If gstAmountPaisa is odd (e.g., 35 Paisa), CGST gets 18, SGST gets 17.
      // This ensures CGST + SGST perfectly matches Total GST without decimal leakage.
      cgstPaisa = Math.round(gstAmountPaisa / 2);
      sgstPaisa = gstAmountPaisa - cgstPaisa;
    }
  }

  const isB2B = isIndianGSTInvoice && !!customerGstin;

  return {
    lines,
    subTotalPaisa,
    gstAmountPaisa,
    cgstPaisa,
    sgstPaisa,
    igstPaisa,
    isB2B,
  };
}
