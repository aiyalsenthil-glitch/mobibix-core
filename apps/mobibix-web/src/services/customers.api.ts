import { authenticatedFetch, extractData } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type BusinessType = "B2C" | "B2B";
export type PartyType = "CUSTOMER" | "VENDOR" | "BOTH";
export type CustomerLifecycle = "PROSPECT" | "ACTIVE" | "INACTIVE" | "CHURNED";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  altPhone?: string;
  address?: string;
  state: string;
  businessType: BusinessType;
  partyType: PartyType;
  gstNumber?: string;
  loyaltyPoints: number;
  isActive: boolean;
  tags: string[];
  customerLifecycle?: CustomerLifecycle;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CustomerStats {
  currentOutstanding: number;
  loyaltyBalance: number;
  jobCount: number;
  invoiceCount: number;
  totalSpend: number;
  lastInteractionDate: string | null;
  lastJob: {
    createdAt: string;
    jobNumber: string;
    deviceBrand: string;
    deviceModel: string;
    status: string;
  } | null;
  lastInvoice: {
    createdAt: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  } | null;
  nextFollowUp: {
    followUpAt: string;
    purpose: string;
    type: string;
  } | null;
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to load customers");
  }

  return extractData(response);
}

/**
 * List customers with pagination and search
 */
export async function listCustomersPaginated(options?: {
  skip?: number;
  take?: number;
  search?: string;
  lifecycle?: CustomerLifecycle;
  tags?: string[];
}): Promise<{ data: Customer[]; total: number; skip: number; take: number }> {
  const params = new URLSearchParams();
  if (options?.skip !== undefined)
    params.append("skip", options.skip.toString());
  if (options?.take !== undefined)
    params.append("take", options.take.toString());
  if (options?.search) params.append("search", options.search);
  if (options?.lifecycle) params.append("lifecycle", options.lifecycle);
  if (options?.tags?.length) params.append("tags", options.tags.join(","));

  const url = `/core/customers${params.toString() ? "?" + params.toString() : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to load customers");
  }

  return extractData(response);
}

/**
 * Get a customer by ID
 */
export async function getCustomer(customerId: string): Promise<Customer> {
  const response = await authenticatedFetch(`/core/customers/${customerId}`);

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to load customer");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to lookup customer");
  }

  return extractData(response);
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

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to create customer");
  }

  return extractData(response);
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
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to update customer");
  }

  return extractData(response);
}

/**
 * Delete (soft-delete) a customer
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  const response = await authenticatedFetch(`/core/customers/${customerId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to delete customer");
  }
}

export async function getCustomerStats(
  customerId: string,
): Promise<CustomerStats> {
  const response = await authenticatedFetch(
    `/core/customers/${customerId}/stats`,
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to load customer stats");
  }
  return extractData(response);
}

export async function updateCustomerLifecycle(
  customerId: string,
  lifecycle: CustomerLifecycle | null,
): Promise<Customer> {
  const response = await authenticatedFetch(
    `/core/customers/${customerId}/lifecycle`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lifecycle }),
    },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to update lifecycle");
  }
  return extractData(response);
}

export async function updateCustomerTags(
  customerId: string,
  tags: string[],
): Promise<Customer> {
  const response = await authenticatedFetch(
    `/core/customers/${customerId}/tags`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to update tags");
  }
  return extractData(response);
}

export interface CustomerNote {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; fullName: string };
}

export async function listCustomerNotes(
  customerId: string,
): Promise<CustomerNote[]> {
  const response = await authenticatedFetch(
    `/core/customers/${customerId}/notes`,
  );
  if (!response.ok) return [];
  return extractData(response);
}

export async function createCustomerNote(
  customerId: string,
  content: string,
): Promise<CustomerNote> {
  const response = await authenticatedFetch(
    `/core/customers/${customerId}/notes`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    },
  );
  if (!response.ok) {
    const error = await extractData(response);
    throw new Error((error as any).message || "Failed to create note");
  }
  return extractData(response);
}

export async function deleteCustomerNote(
  customerId: string,
  noteId: string,
): Promise<void> {
  await authenticatedFetch(`/core/customers/${customerId}/notes/${noteId}`, {
    method: "DELETE",
  });
}
