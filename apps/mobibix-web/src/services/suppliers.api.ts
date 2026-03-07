import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  notes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;

  // SupplierProfile
  category?: string;
  riskFlag?: boolean;
  rating?: number;
  paymentDueDays?: number;
  creditLimit?: number;
  preferredCurrency?: string;
  outstandingBalance?: number;
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  notes?: string;
  // SupplierProfile
  category?: string;
  paymentDueDays?: number;
  creditLimit?: number;
  preferredCurrency?: string;
}

export interface UpdateSupplierDto {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  notes?: string;
  // SupplierProfile
  category?: string;
  riskFlag?: boolean;
  paymentDueDays?: number;
  creditLimit?: number;
  preferredCurrency?: string;
}

export interface SupplierOutstanding {
  supplierId: string;
  supplierName: string;
  totalOutstanding: number;
}

/**
 * List all suppliers
 */
export async function listSuppliers(): Promise<Supplier[]> {
  try {
    const response = await authenticatedFetch("/suppliers");

    if (!response.ok) {
      let errorMessage = `API Error (${response.status})`;
      let errorDetails = {};

      try {
        const error = await extractData(response) as any;
        errorMessage = error?.message || error?.error || errorMessage;
        errorDetails = error || {};
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          details: errorDetails,
        });
      } catch (e) {
        console.error("Failed to parse error response:", e);
        // Try to get text response as fallback
        try {
          const text = await response.text();
          console.error("Error response text:", text);
        } catch {}
      }
      throw new Error(errorMessage);
    }

    const data = await extractData(response);

    // Handle both array response and paginated response
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
      return (data as any).data;
    }

    return (data as any)?.data || data;
  } catch (error: unknown) {
    console.error("List suppliers error:", error);
    throw error;
  }
}

/**
 * Get a single supplier by ID
 */
export async function getSupplier(supplierId: string): Promise<Supplier> {
  const response = await authenticatedFetch(`/suppliers/${supplierId}`);

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch supplier");
  }

  return extractData(response);
}

/**
 * Create a new supplier
 */
export async function createSupplier(
  data: CreateSupplierDto,
): Promise<Supplier> {
  const response = await authenticatedFetch("/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to create supplier");
  }

  return extractData(response);
}

/**
 * Update a supplier
 */
export async function updateSupplier(
  supplierId: string,
  data: UpdateSupplierDto,
): Promise<Supplier> {
  const response = await authenticatedFetch(`/suppliers/${supplierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to update supplier");
  }

  return extractData(response);
}

/**
 * Delete a supplier (soft delete)
 */
export async function deleteSupplier(supplierId: string): Promise<void> {
  const response = await authenticatedFetch(`/suppliers/${supplierId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to delete supplier");
  }
}

/**
 * Get supplier outstanding balance
 */
export async function getSupplierOutstanding(
  supplierId: string,
): Promise<SupplierOutstanding> {
  const response = await authenticatedFetch(
    `/suppliers/${supplierId}/outstanding-balance`,
  );

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch outstanding balance");
  }

  return extractData(response);
}
