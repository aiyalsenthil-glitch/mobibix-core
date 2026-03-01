import { authenticatedFetch, extractData } from './auth.api';

export interface Distributor {
  id: string;
  name: string;
}

export interface WholesaleCatalogItem {
  id: string;
  distributorId: string;
  sku: string;
  productName: string;
  category: string;
  wholesalePrice: number;
  moq: number;
  stockAvailable: number;
  distributor: Distributor;
}

export interface B2BOrderPayload {
  distributorId: string;
  items: {
    catalogItemId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export const b2bApi = {
  getCatalog: async () => {
    const response = await authenticatedFetch('/mobileshop/b2b/catalog');
    if (!response.ok) throw new Error('Failed to fetch catalog');
    return await extractData(response) as WholesaleCatalogItem[];
  },

  requestLink: async (distributorId: string) => {
    const response = await authenticatedFetch(`/mobileshop/b2b/link/${distributorId}`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to request link');
    return await extractData(response);
  },

  placeOrder: async (payload: B2BOrderPayload) => {
    const response = await authenticatedFetch('/mobileshop/b2b/order', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = (await extractData(response)) as any;
      throw new Error(error?.message || 'Failed to place order');
    }
    return await extractData(response);
  },
};
