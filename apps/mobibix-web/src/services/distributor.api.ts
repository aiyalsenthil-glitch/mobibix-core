import { authenticatedFetch, extractData } from './auth.api'; // extractData used inside fetchDist

async function fetchDist<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(endpoint, options);
  if (!response.ok) {
    const err: any = new Error(`Distributor API error: ${response.status}`);
    err.response = { status: response.status };
    throw err;
  }
  return extractData<T>(response);
}

export interface DistCatalogItem {
  id: string;
  sku?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  unitPrice: number;
  stockQuantity: number;
  images: string[];
  isActive: boolean;
  createdAt: string;
}

export interface DistOrder {
  id: string;
  orderNumber: string;
  retailerId: string;
  status: string;
  totalAmount: number;
  paymentType: string;
  createdAt: string;
  items: any[];
}

export interface DistAnalytics {
  currentMonth: string;
  totalRetailers: number;
  totalOrders: number;
  monthlyRevenue: {
    amount: number;
    unitsSold: number;
  };
  topProducts: any[];
  recentAttributions: any[];
  partnerEarnings?: {
    total: number;
    paid: number;
    pending: number;
    code: string;
  };
}

export const distributorApi = {
  // Catalog
  getCatalog: () => fetchDist<DistCatalogItem[]>('/distributor/catalog'),

  createCatalogItem: (data: any) => fetchDist('/distributor/catalog', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateCatalogItem: (itemId: string, data: any) => fetchDist(`/distributor/catalog/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  adjustStock: (itemId: string, adjustment: number) => fetchDist(`/distributor/catalog/${itemId}/stock`, {
    method: 'PUT',
    body: JSON.stringify({ adjustment }),
  }),

  // Orders
  getInboundOrders: () => fetchDist<DistOrder[]>('/distributor/orders'),

  updateOrderStatus: (orderId: string, status: string, notes?: string) => fetchDist(`/distributor/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  }),

  // Analytics
  getOverview: () => fetchDist<DistAnalytics>('/distributor/analytics/overview'),

  getRetailers: () => fetchDist('/distributor/analytics/retailers'),

  getRetailerBalance: (retailerId: string) => fetchDist(`/distributor/analytics/retailers/${retailerId}/balance`),

  recordCreditEntry: (data: any) => fetchDist('/distributor/analytics/credit', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
