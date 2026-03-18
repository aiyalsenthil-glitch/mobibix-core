import { authenticatedFetch, extractData } from './auth.api';

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
}

export const distributorApi = {
  // Catalog
  getCatalog: async () => {
    const response = await authenticatedFetch('/distributor/catalog');
    return await extractData(response) as DistCatalogItem[];
  },

  createCatalogItem: async (data: any) => {
    const response = await authenticatedFetch('/distributor/catalog', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await extractData(response);
  },

  updateCatalogItem: async (itemId: string, data: any) => {
    const response = await authenticatedFetch(`/distributor/catalog/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await extractData(response);
  },

  adjustStock: async (itemId: string, adjustment: number) => {
    const response = await authenticatedFetch(`/distributor/catalog/${itemId}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ adjustment }),
    });
    return await extractData(response);
  },

  // Orders
  getInboundOrders: async () => {
    const response = await authenticatedFetch('/distributor/orders');
    return await extractData(response) as DistOrder[];
  },

  updateOrderStatus: async (orderId: string, status: string, notes?: string) => {
    const response = await authenticatedFetch(`/distributor/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
    return await extractData(response);
  },

  // Analytics
  getOverview: async () => {
    const response = await authenticatedFetch('/distributor/analytics/overview');
    return await extractData(response) as DistAnalytics;
  },

  getRetailers: async () => {
    const response = await authenticatedFetch('/distributor/analytics/retailers');
    return await extractData(response);
  },

  getRetailerBalance: async (retailerId: string) => {
    const response = await authenticatedFetch(`/distributor/analytics/retailers/${retailerId}/balance`);
    return await extractData(response);
  },

  recordCreditEntry: async (data: any) => {
    const response = await authenticatedFetch('/distributor/analytics/credit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await extractData(response);
  },
};
