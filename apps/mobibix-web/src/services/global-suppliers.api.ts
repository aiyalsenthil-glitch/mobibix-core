import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface GlobalSupplier {
  id: string;
  name: string;
  primaryPhone?: string;
  altPhone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  country: string;
  defaultPaymentTerms?: string;
  defaultCreditLimit?: number;
  defaultCurrency: string;
  tags: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantGlobalSupplier {
  id: string;
  tenantId: string;
  globalSupplierId: string;
  linkedAt: string;
  localName?: string;
  localPhone?: string;
  localNotes?: string;
  globalSupplier?: GlobalSupplier;
}

export interface CreateGlobalSupplierDto {
  name: string;
  primaryPhone?: string;
  altPhone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  state?: string;
  country?: string;
  defaultPaymentTerms?: string;
  defaultCreditLimit?: number;
  defaultCurrency?: string;
  tags?: string[];
  isVerified?: boolean;
  isActive?: boolean;
}

export interface LinkGlobalSupplierDto {
  localName?: string;
  localPhone?: string;
  localNotes?: string;
}

export interface SearchGlobalSuppliersDto {
  search?: string;
  skip?: number;
  take?: number;
}

/**
 * Search and list all global suppliers
 */
export async function listGlobalSuppliers(
  params?: SearchGlobalSuppliersDto,
): Promise<GlobalSupplier[]> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.take !== undefined)
      queryParams.append("take", params.take.toString());

    const url = `/global-suppliers${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      let errorMessage = "Failed to fetch global suppliers";
      try {
        const error = await extractData(response);
        errorMessage = error.message || error.error || errorMessage;
        console.error("API Error:", {
          status: response.status,
          message: errorMessage,
        });
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      throw new Error(errorMessage);
    }

    const result = await extractData(response);
    // Handle both array and paginated response
    if (Array.isArray(result)) {
      return result;
    } else if (result.data && Array.isArray(result.data)) {
      return result.data;
    }
    return result;
  } catch (error: any) {
    console.error("List global suppliers error:", error);
    throw error;
  }
}

/**
 * Get specific global supplier details
 */
export async function getGlobalSupplier(id: string): Promise<GlobalSupplier> {
  try {
    const response = await authenticatedFetch(`/global-suppliers/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch supplier: ${response.statusText}`);
    }

    return extractData(response);
  } catch (error: any) {
    console.error("Get global supplier error:", error);
    throw error;
  }
}

/**
 * Link a global supplier to tenant
 */
export async function linkGlobalSupplier(
  globalSupplierId: string,
  dto: LinkGlobalSupplierDto,
): Promise<TenantGlobalSupplier> {
  try {
    const response = await authenticatedFetch(
      `/global-suppliers/${globalSupplierId}/link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      },
    );

    if (!response.ok) {
      let errorMessage = "Failed to link supplier";
      try {
        const error = await extractData(response);
        errorMessage = error.message || error.error || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return extractData(response);
  } catch (error: any) {
    console.error("Link supplier error:", error);
    throw error;
  }
}

/**
 * Get suppliers linked to current tenant
 */
export async function getLinkedSuppliers(params?: {
  skip?: number;
  take?: number;
}): Promise<TenantGlobalSupplier[]> {
  try {
    // This assumes we can get tenantId from auth context or pass it differently
    // For now, using a simpler endpoint that the guard handles
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.take !== undefined)
      queryParams.append("take", params.take.toString());

    const url = `/global-suppliers/linked${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch linked suppliers");
    }

    const result = await extractData(response);
    return Array.isArray(result) ? result : result.data || [];
  } catch (error: any) {
    console.error("Get linked suppliers error:", error);
    throw error;
  }
}

/**
 * Unlink global supplier from tenant
 */
export async function unlinkGlobalSupplier(
  globalSupplierId: string,
): Promise<void> {
  try {
    const response = await authenticatedFetch(
      `/global-suppliers/${globalSupplierId}/unlink`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to unlink supplier");
    }
  } catch (error: any) {
    console.error("Unlink supplier error:", error);
    throw error;
  }
}
