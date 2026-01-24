import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

export interface Shop {
  id: string;
  tenantId: string;
  name: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  gstNumber?: string;
  gstEnabled?: boolean;
  invoicePrefix?: string;
  invoiceFooter?: string;
  logoUrl?: string;
  terms?: string[];
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateShopDto {
  name: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  invoicePrefix: string;
  gstNumber?: string;
  website?: string;
  logoUrl?: string;
  invoiceFooter?: string;
}

export interface UpdateShopDto {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  website?: string;
  logoUrl?: string;
  invoiceFooter?: string;
  terms?: string[];
}

export interface UpdateShopSettingsDto {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  website?: string;
  gstEnabled?: boolean;
  gstNumber?: string;
  invoiceFooter?: string;
  terms?: string[];
  logoUrl?: string;
}

/**
 * List all shops for the authenticated user's tenant
 */
export async function listShops(): Promise<Shop[]> {
  const response = await authenticatedFetch(`/mobileshop/shops`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shops");
  }

  return response.json();
}

/**
 * Get a single shop by ID
 */
export async function getShop(shopId: string): Promise<Shop> {
  const response = await authenticatedFetch(`/mobileshop/shops/${shopId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shop");
  }

  return response.json();
}

/**
 * Create a new shop
 */
export async function createShop(data: CreateShopDto): Promise<Shop> {
  const response = await authenticatedFetch(`/mobileshop/shops`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create shop");
  }

  return response.json();
}

/**
 * Update a shop
 */
export async function updateShop(
  shopId: string,
  data: UpdateShopDto,
): Promise<Shop> {
  const response = await authenticatedFetch(`/mobileshop/shops/${shopId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shop");
  }

  return response.json();
}

/**
 * Get shop settings
 */
export async function getShopSettings(shopId: string): Promise<Shop> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/settings`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shop settings");
  }

  return response.json();
}

/**
 * Update shop settings
 */
export async function updateShopSettings(
  shopId: string,
  data: UpdateShopSettingsDto,
): Promise<Shop> {
  const response = await authenticatedFetch(
    `/mobileshop/shops/${shopId}/settings`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shop settings");
  }

  return response.json();
}
