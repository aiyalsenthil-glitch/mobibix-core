import { useState } from "react";
import { updateProduct, ShopProduct } from "@/services/products.api";

interface UseProductCostProps {
  selectedShopId: string | null | undefined;
  setProducts: React.Dispatch<React.SetStateAction<ShopProduct[]>>;
  setError: (error: string | null) => void;
  setSuccessMessage: (msg: string | null) => void;
}

export function useProductCost(props: UseProductCostProps) {
  const { selectedShopId, setProducts, setError, setSuccessMessage } = props;
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostValue, setEditingCostValue] = useState("");
  const [updatingCostId, setUpdatingCostId] = useState<string | null>(null);

  const handleUpdateCost = async (productId: string, newCost: string) => {
    if (!selectedShopId || !newCost) return;

    try {
      const cost = parseFloat(newCost);
      if (cost <= 0) {
        setError("Cost must be greater than 0");
        return;
      }

      setUpdatingCostId(productId);

      // Call updateProduct API to update cost
      await updateProduct(selectedShopId, productId, { costPrice: cost });

      // Update local state
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, costPrice: cost } : p))
      );

      setEditingCostId(null);
      setEditingCostValue("");
      setSuccessMessage("✅ Cost updated successfully!");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update cost");
    } finally {
      setUpdatingCostId(null);
    }
  };

  return {
    editingCostId,
    setEditingCostId,
    editingCostValue,
    setEditingCostValue,
    updatingCostId,
    handleUpdateCost,
  };
}
