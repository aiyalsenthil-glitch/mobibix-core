/**
 * Type definitions and validation for invoice creation with GST compliance
 */

// Valid GST rates that can be applied
export const VALID_GST_RATES = [0, 5, 9, 12, 18, 28];

// Invoice item type
export interface InvoiceItemInput {
  shopProductId: string;
  quantity: number;
  rate: number;
  gstRate: number;
  hsnCode?: string;
  imeis?: string[];
}

// Invoice form type
export interface InvoiceFormInput {
  shopId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | "";
  customerState?: string | null;
  customerGstin?: string | "";
  paymentMode: "CASH" | "CARD" | "UPI" | "BANK" | "CREDIT";
  items: InvoiceItemInput[];
  isGstApplicable?: boolean;
  invoiceType?: "SALES" | "REPAIR";
}

/**
 * Payment recording type for customer payments
 */
export interface PaymentRecordingInput {
  invoiceId: string;
  amount: number;
  paymentMethod: "CASH" | "CARD" | "UPI" | "BANK" | "CREDIT";
  reference?: string;
}

/**
 * Validation errors type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate invoice form data
 */
export function validateInvoiceForm(
  data: Partial<InvoiceFormInput>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Shop validation
  if (!data.shopId)
    errors.push({ field: "shopId", message: "Shop is required" });

  // Customer validation
  if (!data.customerName) {
    errors.push({
      field: "customerName",
      message: "Customer name is required",
    });
  } else if (data.customerName.length > 100) {
    errors.push({
      field: "customerName",
      message: "Customer name too long (max 100 characters)",
    });
  }

  // Phone validation
  if (data.customerPhone && data.customerPhone !== "") {
    if (!/^[0-9]{10}$/.test(data.customerPhone)) {
      errors.push({
        field: "customerPhone",
        message: "Phone must be 10 digits",
      });
    }
  }

  // GSTIN validation
  if (data.customerGstin && data.customerGstin !== "") {
    const cleanGSTIN = data.customerGstin.replace(/\s/g, "").toUpperCase();
    if (!/^[0-9A-Z]{15}$/.test(cleanGSTIN)) {
      errors.push({
        field: "customerGstin",
        message: "Invalid GSTIN format (15 alphanumeric characters)",
      });
    }
  }

  // Payment mode validation
  const validPaymentModes = ["CASH", "CARD", "UPI", "BANK", "CREDIT"];
  if (!data.paymentMode || !validPaymentModes.includes(data.paymentMode)) {
    errors.push({
      field: "paymentMode",
      message: `Payment mode must be one of: ${validPaymentModes.join(", ")}`,
    });
  }

  // Items validation
  const itemErrors = validateInvoiceItems(data.items || [], !!data.isGstApplicable);
  if (!itemErrors.valid) {
    errors.push({
      field: "items",
      message: itemErrors.error || "Invalid items",
    });
  }

  return errors;
}

/**
 * Validate invoice items - checks for sanity
 * GST should not exceed 100% of item value, quantities and rates must be valid
 */
export function validateInvoiceItems(
  items: InvoiceItemInput[],
  isGstApplicable: boolean = false,
): {
  valid: boolean;
  error?: string;
} {
  if (!items || items.length === 0) {
    return { valid: false, error: "At least one item is required" };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Product required
    if (!item.shopProductId) {
      return {
        valid: false,
        error: `Item ${i + 1}: Product is required`,
      };
    }

    // Quantity must be positive
    if (!item.quantity || item.quantity <= 0) {
      return {
        valid: false,
        error: `Item ${i + 1}: Quantity must be greater than 0`,
      };
    }

    // Rate must be valid
    if (item.rate === undefined || item.rate < 0) {
      return {
        valid: false,
        error: `Item ${i + 1}: Rate must be >= 0`,
      };
    }

    // GST rate must be valid
    if (!VALID_GST_RATES.includes(item.gstRate)) {
      return {
        valid: false,
        error: `Item ${i + 1}: Invalid GST rate (must be one of: ${VALID_GST_RATES.join(", ")}%)`,
      };
    }

    // Line amount sanity check
    const lineAmount = item.quantity * item.rate;
    if (lineAmount <= 0) {
      return {
        valid: false,
        error: `Item ${i + 1}: Line amount must be greater than 0`,
      };
    }

    // GST cannot exceed 100% of item value
    if (item.gstRate > 100) {
      return {
        valid: false,
        error: `Item ${i + 1}: GST rate cannot exceed 100%`,
      };
    }

    // HSN Code mandatory for GST invoices
    if (isGstApplicable && (!item.hsnCode || item.hsnCode.trim() === "")) {
      return {
        valid: false,
        error: `Item ${i + 1}: HSN/SAC code is mandatory for GST invoices`,
      };
    }
  }

  return { valid: true };
}
