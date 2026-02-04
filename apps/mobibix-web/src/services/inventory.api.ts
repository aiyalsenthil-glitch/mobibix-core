import { authenticatedFetch } from "./auth.api";

/**
 * Add stock for a product
 */
export async function stockIn(
  shopId: string,
  data: {
    shopProductId: string;
    quantity: number;
    costPrice: number;
    type?: string;
    imeis?: string[];
  },
): Promise<void> {
  const response = await authenticatedFetch("/mobileshop/inventory/stock-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: data.shopProductId,
      type: data.type,
      quantity: data.quantity,
      costPerUnit: data.costPrice,
      imeis: data.imeis,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add stock");
  }

  return response.json();
}
