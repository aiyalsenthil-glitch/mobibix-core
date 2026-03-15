import { authenticatedFetch, extractData } from "./auth.api";

export type CreditNoteType = "CUSTOMER" | "SUPPLIER";

export type CreditNoteReason =
  | "SALES_RETURN"
  | "PURCHASE_RETURN"
  | "PRICE_ADJUSTMENT"
  | "DISCOUNT_POST_SALE"
  | "OVERBILLING"
  | "WARRANTY_CLAIM";

export type CreditNoteStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_APPLIED"
  | "FULLY_APPLIED"
  | "REFUNDED"
  | "VOIDED";

export interface CreditNoteItem {
  id?: string;
  shopProductId?: string;
  description: string;
  quantity: number;
  rate: number;
  hsnCode?: string;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  restockItem: boolean;
  product?: { id: string; name: string };
}

export interface CreditNote {
  id: string;
  tenantId: string;
  shopId: string;
  creditNoteNo: string;
  date: string | Date;
  financialYear?: string;
  customerId?: string;
  supplierId?: string;
  linkedInvoiceId?: string;
  linkedPurchaseId?: string;
  type: CreditNoteType;
  reason: CreditNoteReason;
  status: CreditNoteStatus;
  subTotal: number;
  gstAmount: number;
  totalAmount: number;
  appliedAmount: number;
  refundedAmount: number;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  items?: CreditNoteItem[];
  customer?: { id: string; name: string; phone: string };
  supplier?: { id: string; name: string };
  invoice?: { id: string; invoiceNumber: string; totalAmount: number };
  purchase?: { id: string; invoiceNumber: string; grandTotal: number };
}

export interface CreateCreditNoteItemDto {
  shopProductId?: string;
  description: string;
  quantity: number;
  rate: number;
  hsnCode?: string;
  gstRate?: number;
  gstAmount?: number;
  lineTotal: number;
  restockItem?: boolean;
}

export interface CreateCreditNoteDto {
  type: CreditNoteType;
  reason: CreditNoteReason;
  customerId?: string;
  supplierId?: string;
  linkedInvoiceId?: string;
  linkedPurchaseId?: string;
  date?: string;
  notes?: string;
  items: CreateCreditNoteItemDto[];
}

export interface ApplyCreditNoteDto {
  invoiceId?: string;
  purchaseId?: string;
  amount: number;
}

export interface ListCreditNotesParams {
  type?: CreditNoteType;
  status?: CreditNoteStatus;
  search?: string;
  page?: number;
  limit?: number;
}

async function handleError(res: Response, fallback: string): Promise<never> {
  const err = await extractData(res).catch(() => ({})) as any;
  throw new Error(err?.message || fallback);
}

export async function listCreditNotes(
  shopId: string,
  params?: ListCreditNotesParams,
): Promise<CreditNote[]> {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const url = `/mobileshop/shops/${shopId}/credit-notes${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await authenticatedFetch(url);
  if (!res.ok) await handleError(res, "Failed to fetch credit notes");
  const data = await extractData(res);
  return Array.isArray(data) ? data : (data as any)?.data ?? [];
}

export async function getCreditNote(
  shopId: string,
  creditNoteId: string,
): Promise<CreditNote> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/credit-notes/${creditNoteId}`,
  );
  if (!res.ok) await handleError(res, "Failed to fetch credit note");
  return extractData(res);
}

export async function createCreditNote(
  shopId: string,
  data: CreateCreditNoteDto,
): Promise<CreditNote> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/credit-notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await handleError(res, "Failed to create credit note");
  return extractData(res);
}

export async function issueCreditNote(
  shopId: string,
  creditNoteId: string,
): Promise<CreditNote> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/credit-notes/${creditNoteId}/issue`,
    { method: "POST" },
  );
  if (!res.ok) await handleError(res, "Failed to issue credit note");
  return extractData(res);
}

export async function applyCreditNote(
  shopId: string,
  creditNoteId: string,
  data: ApplyCreditNoteDto,
): Promise<CreditNote> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/credit-notes/${creditNoteId}/apply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await handleError(res, "Failed to apply credit note");
  return extractData(res);
}

export async function refundCreditNote(
  shopId: string,
  creditNoteId: string,
): Promise<CreditNote> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/credit-notes/${creditNoteId}/refund`,
    { method: "POST" },
  );
  if (!res.ok) await handleError(res, "Failed to mark credit note as refunded");
  return extractData(res);
}

export async function voidCreditNote(
  shopId: string,
  creditNoteId: string,
  reason: string,
): Promise<CreditNote> {
  const res = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/credit-notes/${creditNoteId}/void`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
  );
  if (!res.ok) await handleError(res, "Failed to void credit note");
  return extractData(res);
}
