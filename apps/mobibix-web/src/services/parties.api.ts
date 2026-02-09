import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export type PartyType = "CUSTOMER" | "VENDOR" | "BOTH";

export interface Party {
  id: string;
  name: string;
  phone: string;
  email?: string;
  state: string;
  partyType: PartyType;
  businessType?: "B2B" | "B2C";
  gstNumber?: string;
  address?: string; // Unified from Supplier
  loyaltyPoints?: number; // Only for customers
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Search parties by name, phone, or GSTIN
 */
export async function searchParties(
  query: string,
  type?: PartyType,
  limit: number = 10,
): Promise<Party[]> {
  const queryParams = new URLSearchParams({
    query,
    limit: limit.toString(),
  });

  if (type) {
    queryParams.append("type", type);
  }

  const response = await authenticatedFetch(
    `/core/parties/search?${queryParams.toString()}`,
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  return response.json();
}

/**
 * Get a party by ID
 */
export async function getParty(id: string): Promise<Party> {
  const response = await authenticatedFetch(`/core/parties/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to load party");
  }

  return response.json();
}

/**
 * Upgrade party role (e.g. CUSTOMER -> BOTH)
 */
export async function upgradeParty(
  id: string,
  role: "CUSTOMER" | "VENDOR",
): Promise<Party> {
  const response = await authenticatedFetch(`/core/parties/${id}/upgrade`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to upgrade party");
  }

  return response.json();
}

/**
 * Get party outstanding balance
 */
export async function getPartyBalance(id: string): Promise<{ balance: number; currency: string }> {
  const response = await authenticatedFetch(`/core/parties/${id}/balance`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch balance");
  }

  return response.json();
}
