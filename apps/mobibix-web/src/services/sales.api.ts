import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT";
export type InvoiceStatus = "PAID" | "CREDIT" | "CANCELLED";
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "CANCELLED";

export interface SalesInvoice {
  id: string;
  shopId: string;
  invoiceNumber: string;
  totalAmount: number;
  paymentMode: PaymentMode;
  status: InvoiceStatus;
  invoiceDate: string | Date;
  customerName?: string;
  customerPhone?: string;
  subTotal?: number;
  gstAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  items?: InvoiceItemDetail[];
  paidAmount?: number;
  balanceAmount?: number;
  paymentStatus?: PaymentStatus;
  customerState?: string;
  customerGstin?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  payments?: {
    id: string;
    amount: number;
    method: PaymentMode;
    transactionRef?: string;
    createdAt: string | Date;
    receiptNumber: string;
  }[];
}

export interface InvoiceItemDetail {
  shopProductId: string;
  quantity: number;
  rate: number;
  hsnCode?: string;
  gstRate?: number;
  gstAmount?: number;
  lineTotal?: number;
  taxableValue?: number; // Accurate taxable value (with 2 decimal precision)
}

export interface InvoiceItem {
  shopProductId: string;
  quantity: number;
  rate: number;
  gstRate: number; // GST rate percentage (0, 5, 18, 28, or custom)
  gstAmount: number; // Calculated GST amount
  imeis?: string[]; // Serialized IMEIs when applicable
}

export interface CreateInvoiceDto {
  shopId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerState?: string;
  customerGstin?: string;
  paymentMode: PaymentMode;
  items: InvoiceItem[];
  pricesIncludeTax?: boolean;
}

/**
 * List all sales invoices for a shop (sorted by latest first on backend)
 */
export async function listInvoices(shopId: string): Promise<SalesInvoice[]> {
  try {
    const response = await authenticatedFetch(
      `/mobileshop/sales/invoices?shopId=${shopId}`,
    );

    if (!response.ok) {
      let errorMessage = "Failed to fetch invoices";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
        console.error("API Error:", {
          status: response.status,
          message: errorMessage,
          shopId,
        });
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    // Backend returns { invoices: [...], empty: false }
    return data.invoices || [];
  } catch (error: any) {
    console.error("List invoices error:", error);
    throw error;
  }
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<SalesInvoice> {
  const response = await authenticatedFetch(
    `/mobileshop/sales/invoice/${invoiceId}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch invoice");
  }

  return response.json();
}

/**
 * Create a new sales invoice
 */
export async function createInvoice(
  data: CreateInvoiceDto,
): Promise<SalesInvoice> {
  const response = await authenticatedFetch(`/mobileshop/sales/invoice`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create invoice");
  }

  return response.json();
}

/**
 * Update an existing invoice (OWNER only)
 */
export async function updateInvoice(
  invoiceId: string,
  data: CreateInvoiceDto,
): Promise<SalesInvoice> {
  const response = await authenticatedFetch(
    `/mobileshop/sales/invoice/${invoiceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update invoice");
  }

  return response.json();
}

/**
 * Cancel an existing invoice
 */
export async function cancelInvoice(invoiceId: string): Promise<SalesInvoice> {
  const response = await authenticatedFetch(
    `/mobileshop/sales/invoice/${invoiceId}/cancel`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel invoice");
  }

  return response.json();
}

// Legacy payment API removed – use collectPayment only

/**
 * Get all payments recorded against an invoice
 */
export async function listPayments(invoiceId: string) {
  const response = await authenticatedFetch(
    `/mobileshop/sales/invoice/${invoiceId}/payments`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch payments");
  }

  return response.json();
}

/**
 * DTO for collecting payment via new API
 */
export interface CollectPaymentDto {
  paymentMethods: {
    mode: PaymentMode;
    amount: number;
    transactionRef?: string;
  }[];
  transactionRef?: string;
  narration?: string;
}

/**
 * Collect payment using the new robust API
 */
export async function collectPayment(
  invoiceId: string,
  data: CollectPaymentDto,
) {
  const response = await authenticatedFetch(
    `/mobileshop/sales/invoice/${invoiceId}/collect-payment`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to collect payment");
  }

  return response.json();
}
