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
  compatibility?: any;
}

export interface PlaceOrderPayload {
  distributorId: string;
  items: {
    catalogItemId: string;
    quantity: number;
  }[];
  paymentType?: string;
  notes?: string;
}

export const distributorNetworkApi = {
  // Retailer browsing distributor catalog
  getSupplierCatalog: async (distributorId: string) => {
    const response = await authenticatedFetch(`/retailer/supplier/catalog/${distributorId}`);
    return await extractData(response) as DistCatalogItem[];
  },

  // Retailer placing order to distributor
  placeOrder: async (payload: PlaceOrderPayload) => {
    const response = await authenticatedFetch('/retailer/supplier/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return await extractData(response);
  },

  // Retailer listing their purchase orders to distributors
  getMyOrders: async () => {
    const response = await authenticatedFetch('/retailer/supplier/orders');
    return await extractData(response);
  },

  // Retailer receiving order (GRN + mapping)
  receiveOrder: async (orderId: string, items: { orderItemId: string; retailerProductId: string }[]) => {
    const response = await authenticatedFetch(`/retailer/supplier/orders/${orderId}/receive`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
    return await extractData(response);
  },
};
