import { authenticatedFetch } from "./auth.api";

export enum ProductType {
  GOODS = "GOODS",
  SPARE = "SPARE",
  SERVICE = "SERVICE",
}

export interface ShopProduct {
  id: string;
  shopId?: string;
  name: string;
  type?: ProductType | string;
  // Optional serialization flag (frontend-only; may be provided by backend later)
  isSerialized?: boolean;
  sku?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  salePrice: number;
  stock?: number;
  stockQty?: number;
  // Derived from stock balances merge; indicates negative stock state
  isNegative?: boolean;
  hsnCode?: string;
  gstRate?: number;
  minStock?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
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

/**
 * Create a new product
 */
export async function createProduct(
  shopId: string,
  data: {
    name: string;
    type: ProductType;
    category?: string;
    hsnSac?: string;
    salePrice: number;
    gstRate?: number;
  },
): Promise<ShopProduct> {
  const response = await authenticatedFetch("/mobileshop/inventory/product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shopId,
      name: data.name,
      type: data.type,
      category: data.category,
      salePrice: data.salePrice,
      hsnCode: data.hsnSac,
      gstRate: data.gstRate,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create product");
  }

  return response.json();
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  shopId: string,
  data: {
    name: string;
    type: ProductType;
    category?: string;
    hsnSac?: string;
    salePrice: number;
    gstRate?: number;
  },
): Promise<ShopProduct> {
  const response = await authenticatedFetch(
    `/mobileshop/inventory/product/${productId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopId,
        name: data.name,
        type: data.type,
        category: data.category,
        salePrice: data.salePrice,
        hsnCode: data.hsnSac,
        gstRate: data.gstRate,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update product");
  }

  return response.json();
}
