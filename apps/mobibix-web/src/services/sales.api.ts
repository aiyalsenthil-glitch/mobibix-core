import { authenticatedFetch } from "./auth.api";
import type { Shop } from "./shops.api";
import type { ShopProduct } from "./products.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT";
export type InvoiceStatus = "DRAFT" | "FINAL" | "PAID" | "PARTIALLY_PAID" | "CREDIT" | "VOIDED";
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "UNPAID" | "CANCELLED";

export type InvoiceType = "SALES" | "REPAIR";

export interface SalesInvoice {
  id: string;
  tenantId?: string;
  shopId: string;
  shopName?: string;
  customerId?: string;
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

  // Tier 2 Fields
  financialYear?: string;
  cashAmount?: number;
  upiAmount?: number;
  cardAmount?: number;
  invoiceType?: InvoiceType;
  isGstApplicable?: boolean;
  jobCardId?: string;
  voidReason?: string;
  voidedAt?: string | Date;

  payments?: {
    id: string;
    amount: number;
    method: PaymentMode;
    transactionRef?: string;
    createdAt: string | Date;
    receiptNumber: string;
  }[];
  jobCard?: {
    jobNumber: string;
    deviceBrand: string;
    deviceModel: string;
    deviceSerial: string | null;
    problem: string;
  };
  whatsappSent?: boolean;
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

  // Tier 2 Fields
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
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
  paymentMethods?: {
    mode: PaymentMode;
    amount: number;
    transactionRef?: string;
  }[];
}

/**
 * List all sales invoices for a shop (sorted by latest first on backend)
 */
export async function listInvoices(
  shopId: string,
  fromJobCard?: boolean,
  options?: {
    skip?: number;
    take?: number;
    status?: string;
    customerName?: string;
  },
): Promise<
  | SalesInvoice[]
  | { data: SalesInvoice[]; total: number; skip: number; take: number }
> {
  const startTime = Date.now();
  try {
    const query = new URLSearchParams({ shopId });
    if (fromJobCard) query.append("fromJobCard", "true");
    if (options?.skip !== undefined)
      query.append("skip", options.skip.toString());
    if (options?.take !== undefined)
      query.append("take", options.take.toString());
    if (options?.status) query.append("status", options.status);
    if (options?.customerName) query.append("search", options.customerName); // Search already covers name

    const url = `/mobileshop/sales/invoices?${query.toString()}`;

    const fetchStart = Date.now();
    const response = await authenticatedFetch(url);
    console.log(`[Sales API] Fetch took ${Date.now() - fetchStart}ms`);

    if (!response.ok) {
      let errorMessage = "Failed to fetch invoices";
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // ignore json parse error
      }
      console.error("API Error:", {
        status: response.status,
        message: errorMessage,
        shopId,
      });
      return [];
    }

    const data = await response.json();
    console.log(`[Sales API] Total time: ${Date.now() - startTime}ms`);

    // Handle paginated response (with pagination object)
    if (data.data && data.pagination) {
      return {
        data: data.data,
        total: data.pagination.total,
        skip: data.pagination.offset || 0,
        take: data.pagination.limit,
      };
    }

    // Handle legacy array response or invoices field
    if (Array.isArray(data)) {
      return data;
    }

    return data.invoices || data.data || [];
  } catch (error) {
    console.error("Failed to list invoices:", error);
    return [];
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

export interface PublicInvoiceResponse {
  invoice: SalesInvoice;
  shop: Shop;
  products: Partial<ShopProduct>[];
}

/**
 * Get a single PUBLIC invoice by ID (No Auth)
 */
export async function getPublicInvoice(invoiceId: string): Promise<PublicInvoiceResponse> {
  const url = `${API_BASE_URL}/mobileshop/sales/public/invoice/${invoiceId}`;
  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage = "Failed to fetch invoice";
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
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

/**
 * Add a single item to an invoice
 */
export async function addItemToInvoice(
  invoiceId: string,
  item: InvoiceItem,
): Promise<SalesInvoice> {
  const response = await authenticatedFetch(
    `/mobileshop/sales/invoice/${invoiceId}/items`,
    {
      method: "POST",
      body: JSON.stringify(item),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add item");
  }

  return response.json();
}
