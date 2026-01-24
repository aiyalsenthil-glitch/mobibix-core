import { authenticatedFetch } from "./auth.api";

export interface ShopProduct {
  id: string;
  shopId: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  salePrice: number;
  stock: number;
  minStock?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * List all products for a shop
 */
export async function listProducts(shopId: string): Promise<ShopProduct[]> {
  const response = await authenticatedFetch(
    `/mobileshop/products?shopId=${shopId}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch products");
  }

  return response.json();
}
