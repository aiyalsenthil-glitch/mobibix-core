import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type BusinessType = "B2C" | "B2B";
export type PartyType = "CUSTOMER" | "VENDOR" | "BOTH";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  state: string;
  businessType: BusinessType;
  partyType: PartyType;
  gstNumber?: string;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateCustomerDto {
  name: string;
  phone: string;
  email?: string;
  state: string;
  businessType: BusinessType;
  partyType: PartyType;
  gstNumber?: string;
}

export interface UpdateCustomerDto {
  name: string;
  email?: string;
  state: string;
  businessType: BusinessType;
  partyType: PartyType;
  gstNumber?: string;
}

/**
 * List all customers for the current tenant (unpaginated - for backward compatibility)
 */
export async function listCustomers(): Promise<Customer[]> {
  const response = await authenticatedFetch(`/core/customers`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to load customers");
  }

  return response.json();
}

/**
 * List customers with pagination and search
 */
export async function listCustomersPaginated(options?: {
  skip?: number;
  take?: number;
  search?: string;
}): Promise<{ data: Customer[]; total: number; skip: number; take: number }> {
  const params = new URLSearchParams();
  if (options?.skip !== undefined)
    params.append("skip", options.skip.toString());
  if (options?.take !== undefined)
    params.append("take", options.take.toString());
  if (options?.search) params.append("search", options.search);

  const url = `/core/customers${params.toString() ? "?" + params.toString() : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to load customers");
  }

  return response.json();
}

/**
 * Get a customer by ID
 */
export async function getCustomer(customerId: string): Promise<Customer> {
  const response = await authenticatedFetch(`/core/customers/${customerId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to load customer");
  }

  return response.json();
}

/**
 * Get a customer by phone number
 */
export async function getCustomerByPhone(
  phone: string,
): Promise<Customer | null> {
  const response = await authenticatedFetch(
    `/core/customers/by-phone?phone=${encodeURIComponent(phone)}`,
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to lookup customer");
  }

  return response.json();
}

/**
 * Search customers by name or phone (returns up to limit matches)
 */
export async function searchCustomers(
  query: string,
  limit: number = 5,
): Promise<Customer[]> {
  const response = await authenticatedFetch(
    `/core/customers/search?query=${encodeURIComponent(query)}&limit=${limit}`,
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    // Return empty array on error instead of throwing
    return [];
  }

  return response.json();
}

/**
 * Create a new customer
 */
export async function createCustomer(
  dto: CreateCustomerDto,
): Promise<Customer> {
  const response = await authenticatedFetch(`/core/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create customer");
  }

  return response.json();
}

/**
 * Update a customer
 */
export async function updateCustomer(
  customerId: string,
  dto: UpdateCustomerDto,
): Promise<Customer> {
  const response = await authenticatedFetch(`/core/customers/${customerId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dto),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update customer");
  }

  return response.json();
}

/**
 * Delete (soft-delete) a customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const response = await authenticatedFetch(`/core/customers/${customerId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete customer");
  }
}
