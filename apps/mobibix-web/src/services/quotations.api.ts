import { authenticatedFetch, extractData } from "./auth.api";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export type QuotationConversionType = "INVOICE" | "JOB_CARD";

export interface QuotationItem {
  id?: string;
  shopProductId?: string;
  description: string;
  quantity: number;
  price: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  totalAmount: number;
  product?: {
    id: string;
    name: string;
    salePrice?: number;
    hsnCode?: string;
    gstRate?: number;
  };
}

export interface Quotation {
  id: string;
  tenantId: string;
  shopId: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  quotationDate: string | Date;
  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  notes?: string;
  status: QuotationStatus;
  validityDays: number;
  expiryDate?: string | Date;
  linkedInvoiceId?: string;
  linkedJobCardId?: string;
  conversionType?: QuotationConversionType;
  convertedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  items?: QuotationItem[];
  party?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface CreateQuotationItemDto {
  shopProductId?: string;
  description: string;
  quantity: number;
  price: number;
  gstRate?: number;
  gstAmount?: number;
  lineTotal?: number;
  totalAmount?: number;
}

export interface CreateQuotationDto {
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  quotationDate?: string;
  validityDays?: number;
  notes?: string;
  taxInclusive?: boolean;
  items: CreateQuotationItemDto[];
}

export interface UpdateQuotationDto {
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  validityDays?: number;
  notes?: string;
  items?: CreateQuotationItemDto[];
}

export interface ConvertQuotationDto {
  conversionType: QuotationConversionType;
  // Required when conversionType = JOB_CARD
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  customerComplaint?: string;
}

export interface ListQuotationsParams {
  status?: QuotationStatus;
  search?: string;
  page?: number;
  limit?: number;
}

async function handleError(res: Response, fallback: string): Promise<never> {
  const err = await extractData(res).catch(() => ({})) as any;
  throw new Error(err?.message || fallback);
}

export async function listQuotations(
  shopId: string,
  params?: ListQuotationsParams,
): Promise<Quotation[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const url = `/mobileshop/shops/${shopId}/quotations${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await authenticatedFetch(url);
  if (!res.ok) await handleError(res, "Failed to fetch quotations");
  const data = await extractData(res);
  return Array.isArray(data) ? data : (data as any)?.data ?? [];
}

export async function getQuotation(
  shopId: string,
  quotationId: string,
): Promise<Quotation> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/quotations/${quotationId}`,
  );
  if (!res.ok) await handleError(res, "Failed to fetch quotation");
  return extractData(res);
}

export async function createQuotation(
  shopId: string,
  data: CreateQuotationDto,
): Promise<Quotation> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/quotations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await handleError(res, "Failed to create quotation");
  return extractData(res);
}

export async function updateQuotation(
  shopId: string,
  quotationId: string,
  data: UpdateQuotationDto,
): Promise<Quotation> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/quotations/${quotationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await handleError(res, "Failed to update quotation");
  return extractData(res);
}

export async function updateQuotationStatus(
  shopId: string,
  quotationId: string,
  status: QuotationStatus,
): Promise<Quotation> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/quotations/${quotationId}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  if (!res.ok) await handleError(res, "Failed to update quotation status");
  return extractData(res);
}

export async function convertQuotation(
  shopId: string,
  quotationId: string,
  data: ConvertQuotationDto,
): Promise<{ invoiceId?: string; jobCardId?: string }> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/quotations/${quotationId}/convert`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await handleError(res, "Failed to convert quotation");
  return extractData(res);
}

export async function deleteQuotation(
  shopId: string,
  quotationId: string,
): Promise<void> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/quotations/${quotationId}`,
    { method: "DELETE" },
  );
  if (!res.ok) await handleError(res, "Failed to delete quotation");
}
