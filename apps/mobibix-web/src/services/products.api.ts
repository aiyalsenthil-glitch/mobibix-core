import { authenticatedFetch, extractData } from "./auth.api";

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
  costPrice?: number; // Shop-specific cost price (legacy - Last Purchase Price)
  avgCost?: number; // Weighted Average Cost (WAC) - calculated on every stock IN
  isActive: boolean; // Can this shop sell this product?
  isSerialized: boolean; // Track by IMEI (true) or bulk quantity (false)
  warrantyDays?: number; // Warranty coverage duration

  // Tax & Compliance (Shop-level override or inherited)
  hsnCode?: string;
  gstRate?: number;

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
export async function listProducts(
  shopId: string,
): Promise<
  | ShopProduct[]
  | { data: ShopProduct[]; total: number; skip: number; take: number }
> {
  const response = await authenticatedFetch(
    `/mobileshop/products?shopId=${shopId}`,
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to fetch products");
  }

  return extractData(response);
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
    costPrice?: number; // Add cost price support
    gstRate?: number;
    isSerialized?: boolean;
    reorderLevel?: number; // Add reorder level
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
      costPrice: data.costPrice,
      hsnCode: data.hsnSac,
      gstRate: data.gstRate,
      isSerialized: data.isSerialized,
      reorderLevel: data.reorderLevel,
    }),
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to create product");
  }

  return extractData(response);
}

/**
 * Update an existing product
 */
export async function updateProduct(
  shopId: string,
  productId: string,
  data: {
    name?: string;
    type?: ProductType;
    category?: string;
    hsnSac?: string;
    salePrice?: number;
    costPrice?: number;
    gstRate?: number;
    reorderLevel?: number; // Add reorder level support
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
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.salePrice && { salePrice: data.salePrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.hsnSac && { hsnCode: data.hsnSac }),
        ...(data.gstRate !== undefined && { gstRate: data.gstRate }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
      }),
    },
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to update product");
  }

  return extractData(response);
}

/**
 * Stock adjustment types
 */
export interface StockAdjustmentRequest {
  quantity: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  reason: string;
  reference?: string;
}

/**
 * Adjust stock for a product
 */
export async function adjustStock(
  shopId: string,
  productId: string,
  data: StockAdjustmentRequest,
): Promise<{ success: boolean; newStock: number }> {
  const response = await authenticatedFetch(
    `/mobileshop/inventory/stock/adjust`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopId,
        shopProductId: productId,
        ...data,
      }),
    },
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to adjust stock");
  }

  return extractData(response);
}

/**
 * Get stock levels for all products in a shop
 */
export async function getStockLevels(
  shopId: string,
): Promise<
  | ShopProduct[]
  | { data: ShopProduct[]; total: number; skip: number; take: number }
> {
  const response = await authenticatedFetch(
    `/mobileshop/inventory/stock-levels?shopId=${shopId}`,
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to fetch stock levels");
  }

  return extractData(response);
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(
  shopId: string,
): Promise<ShopProduct[]> {
  const response = await authenticatedFetch(
    `/mobileshop/inventory/low-stock?shopId=${shopId}`,
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to fetch low stock products");
  }

  const data = await extractData(response);
  return Array.isArray(data) ? data : data.data || [];
}

/**
 * Get stock movement history for a product
 */
export async function getStockHistory(
  productId: string,
  options?: { skip?: number; take?: number },
): Promise<Array<Record<string, unknown>>> {
  const query = new URLSearchParams();
  if (options?.skip !== undefined)
    query.append("skip", options.skip.toString());
  if (options?.take !== undefined)
    query.append("take", options.take.toString());

  const response = await authenticatedFetch(
    `/mobileshop/inventory/stock-history/${productId}?${query}`,
  );

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to fetch stock history");
  }

  const data = await extractData(response);
  return Array.isArray(data) ? data : data.data || [];
}

/**
 * Import products from CSV/Excel file
 */
export async function importProducts(
  shopId: string,
  file: File,
  includeStock?: boolean,
): Promise<{ success: number; skipped: number; failed: number; errors: string[] }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("shopId", shopId);
  if (includeStock !== undefined) {
    formData.append("includeStock", includeStock.toString());
  }

  const response = await authenticatedFetch("/mobileshop/products/import", {
    method: "POST",
    body: formData,
    // Don't set Content-Type — browser sets multipart boundary automatically
    headers: {},
  });

  if (!response.ok) {
    const error = await extractData(response);
    throw new Error(error.message || "Failed to import products");
  }

  return extractData(response);
}

/**
 * Export products as CSV
 */
export async function exportProducts(
  shopId: string,
  includeStock?: boolean,
): Promise<Blob> {
  const query = new URLSearchParams({ shopId });
  if (includeStock !== undefined) {
    query.append("includeStock", includeStock.toString());
  }

  const response = await authenticatedFetch(
    `/mobileshop/products/export?${query.toString()}`,
  );

  if (!response.ok) {
    // We cannot use extractData here reliably since it can fail if response is not JSON
    let errorMsg = "Failed to export products";
    try {
      const error = await response.json();
      errorMsg = error.message || errorMsg;
    } catch {
      errorMsg = await response.text() || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.blob();
}
