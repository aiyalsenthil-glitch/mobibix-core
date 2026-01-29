import { authenticatedFetch } from "./auth.api";

export enum ProductType {
  GOODS = "GOODS",
  SPARE = "SPARE",
  SERVICE = "SERVICE",
}

/**
 * ShopProduct = Shop-level product configuration
 * Links to GlobalProduct (shared catalog) or can be a custom product
 * Contains shop-specific pricing, tax, and inventory tracking settings
 */
export interface ShopProduct {
  id: string;
  shopId: string;
  tenantId?: string;

  // Shop-level configuration
  name: string; // Cached from GlobalProduct or entered directly for custom products
  category?: string; // Free-text category or inherited
  type?: ProductType | string;
  salePrice: number; // Shop-specific selling price
  costPrice?: number; // Shop-specific cost price
  isActive: boolean; // Can this shop sell this product?

  // Tax & Compliance (Shop-level override or inherited)
  hsnCode?: string;
  gstRate?: number;

  // Inventory configuration
  isSerialized?: boolean; // Track by IMEI (true) or bulk quantity (false)
  reorderLevel?: number;
  reorderQty?: number;
  barcode?: string;
  location?: string; // Physical location in shop

  // Legacy fields (for backward compatibility)
  sku?: string;
  brand?: string;
  minStock?: number;

  // Stock data (should NOT be used on Products page - Inventory page only)
  stock?: number;
  stockQty?: number;
  isNegative?: boolean;

  // Relations
  globalProductId?: string | null; // Reference to GlobalProduct (null = custom product)

  // Timestamps
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
