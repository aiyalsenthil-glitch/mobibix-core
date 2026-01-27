import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK";
export type InvoiceStatus = "PAID" | "CANCELLED";

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
  items?: InvoiceItemDetail[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InvoiceItemDetail {
  shopProductId: string;
  quantity: number;
  rate: number;
  hsnCode?: string;
  gstRate?: number;
  gstAmount?: number;
  lineTotal?: number;
}

export interface InvoiceItem {
  shopProductId: string;
  quantity: number;
  rate: number;
  gstRate: number; // GST rate percentage (0, 5, 18, 28, or custom)
  gstAmount: number; // Calculated GST amount
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

    return response.json();
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
