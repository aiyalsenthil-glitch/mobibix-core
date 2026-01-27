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
  },
): Promise<void> {
  const response = await authenticatedFetch("/mobileshop/inventory/stock-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shopId,
      shopProductId: data.shopProductId,
      quantity: data.quantity,
      costPrice: data.costPrice,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add stock");
  }

  return response.json();
}
