import { authenticatedFetch, extractData } from './auth.api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost_REPLACED:3000/api';

async function fetchLinking<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await authenticatedFetch(endpoint, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return extractData<T>(res);
}

// ─── ERP Retailer-facing ──────────────────────────────────────────────────────

export interface DistLinkInvite {
  id: string;
  distributorId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  distributor: { name: string; referralCode: string };
}

export interface LinkedDistributor {
  id: string;
  distributorId: string;
  stockVisibilityEnabled: boolean;
  linkedVia: string;
  distributor: { id: string; name: string; referralCode: string; phone?: string };
  stockVisibility: { allowAllProducts: boolean; allowedCategories: string[]; allowedBrands: string[] } | null;
}

export const retailerLinkingApi = {
  /** List all active distributor links for this shop */
  listDistributors: () => fetchLinking<LinkedDistributor[]>('/retailer/linking/distributors'),

  /** List pending invites sent by distributors to this shop */
  listInvites: () => fetchLinking<DistLinkInvite[]>('/retailer/linking/invites'),

  /** Accept or reject a distributor invite */
  respondToInvite: (inviteId: string, accept: boolean) =>
    fetchLinking(`/retailer/linking/invites/${inviteId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),

  /** Self-link to a distributor by entering their referral code (post-signup) */
  selfLink: (referralCode: string) =>
    fetchLinking('/retailer/linking/self-link', {
      method: 'POST',
      body: JSON.stringify({ referralCode }),
    }),
};

// ─── Stock visibility ─────────────────────────────────────────────────────────

export interface VisibilitySettings {
  linkId: string;
  stockVisibilityEnabled: boolean;
  settings: { allowAllProducts: boolean; allowedCategories: string[]; allowedBrands: string[] };
}

export const stockVisibilityApi = {
  getSettings: (distributorId: string) =>
    fetchLinking<VisibilitySettings>(`/retailer/stock/visibility/${distributorId}`),

  updateSettings: (
    distributorId: string,
    dto: { stockVisibilityEnabled: boolean; allowAllProducts?: boolean; allowedCategories?: string[]; allowedBrands?: string[] },
  ) =>
    fetchLinking(`/retailer/stock/visibility/${distributorId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};

export const productMetaApi = {
  getMeta: () => fetchLinking<{ brands: string[]; categories: string[] }>('/retailer/stock/meta'),
};

// ─── Refill Requests (ERP side) ───────────────────────────────────────────────

export interface RefillRequest {
  id: string;
  status: string;
  notes?: string;
  createdAt: string;
  link: { distributor: { name: string; referralCode: string } };
  items: {
    id: string;
    suggestedQty: number;
    acceptedQty?: number;
    catalogItem: { id: string; name: string; sku?: string; unitPrice: number };
  }[];
}

export const refillApi = {
  list: () => fetchLinking<RefillRequest[]>('/retailer/stock/refills'),

  respond: (
    requestId: string,
    accept: boolean,
    adjustedItems?: { itemId: string; acceptedQty: number }[],
  ) =>
    fetchLinking(`/retailer/stock/refills/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept, adjustedItems }),
    }),
};

// ─── Distributor-facing linking ───────────────────────────────────────────────

export const distributorLinkingApi = {
  sendInvite: (dto: { phone?: string; email?: string; tenantCode?: string }) =>
    fetch(`${API_BASE}/distributor/linking/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dto),
    }).then(r => r.json()).then(d => d?.data ?? d),

  listInvites: () =>
    fetch(`${API_BASE}/distributor/linking/invites`, { credentials: 'include' })
      .then(r => r.json()).then(d => d?.data ?? d),

  getRetailerStock: (retailerId: string) =>
    fetch(`${API_BASE}/distributor/stock/retailers/${retailerId}`, { credentials: 'include' })
      .then(r => r.json()).then(d => d?.data ?? d),

  createRefillRequest: (retailerId: string, dto: { items: { catalogItemId: string; suggestedQty: number }[]; notes?: string }) =>
    fetch(`${API_BASE}/distributor/stock/retailers/${retailerId}/refill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(dto),
    }).then(r => r.json()).then(d => d?.data ?? d),

  listRefills: (retailerId: string) =>
    fetch(`${API_BASE}/distributor/stock/retailers/${retailerId}/refills`, { credentials: 'include' })
      .then(r => r.json()).then(d => d?.data ?? d),
};
