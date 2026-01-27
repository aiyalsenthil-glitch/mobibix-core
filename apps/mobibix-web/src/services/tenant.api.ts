import { authenticatedFetch } from "./auth.api";

export interface CreateTenantInput {
  name: string;
  legalName?: string;
  tenantType?: string;
  code?: string;
  contactPhone?: string;
  contactEmail?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  currency?: string;
  timezone?: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  code: string;
  tenantType: string;
  legalName?: string;
  contactPhone?: string;
  contactEmail?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantResponse {
  tenant: TenantResponse;
  accessToken: string;
}

export async function createTenant(
  data: CreateTenantInput,
): Promise<CreateTenantResponse> {
  const response = await authenticatedFetch(`/tenant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to create tenant (${response.status})`,
    );
  }

  return response.json();
}

export async function getCurrentTenant(): Promise<TenantResponse> {
  const response = await authenticatedFetch(`/tenant/current`);

  if (!response.ok) {
    throw new Error("Failed to fetch current tenant");
  }

  return response.json();
}
