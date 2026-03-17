import { authenticatedFetch, extractData } from "./auth.api";

export type EWayBillStatus =
  | "DRAFT"
  | "GENERATING"
  | "GENERATED"
  | "FAILED"
  | "CANCELLED";

export interface EWayBill {
  id: string;
  invoiceId: string;
  ewbNumber?: string;
  ewbDate?: string;
  validUpto?: string;
  status: EWayBillStatus;
  transMode: string;
  vehicleNumber?: string;
  distance?: number;
  transporterId?: string;
  transporterName?: string;
  cancelReason?: string;
  rawResponse?: Record<string, unknown>;
  generatedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface GenerateEWBDto {
  transMode?: "ROAD" | "RAIL" | "AIR" | "SHIP";
  vehicleNumber?: string;
  transporterId?: string;
  transporterName?: string;
  distance: number;
}

export interface CancelEWBDto {
  cancelRsnCode: 1 | 2 | 3;
  cancelRmrk?: string;
}

export async function generateEWayBill(
  invoiceId: string,
  dto: GenerateEWBDto,
): Promise<EWayBill> {
  const res = await authenticatedFetch(
    `/invoices/${invoiceId}/ewaybill`,
    { method: "POST", body: JSON.stringify(dto) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.message ?? err?.error ?? "Failed to generate E-Way Bill";
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return extractData<EWayBill>(res);
}

export async function getEWayBill(invoiceId: string): Promise<EWayBill | null> {
  const res = await authenticatedFetch(`/invoices/${invoiceId}/ewaybill`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return extractData<EWayBill>(res);
}

export async function cancelEWayBill(
  ewbId: string,
  dto: CancelEWBDto,
): Promise<EWayBill> {
  const res = await authenticatedFetch(
    `/ewaybill/${ewbId}/cancel`,
    { method: "POST", body: JSON.stringify(dto) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.message ?? err?.error ?? "Failed to cancel E-Way Bill";
    throw new Error(Array.isArray(msg) ? msg[0] : msg);
  }
  return extractData<EWayBill>(res);
}
