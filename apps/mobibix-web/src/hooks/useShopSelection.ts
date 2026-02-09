import { useEffect, useState } from "react";
import { listShops, type Shop } from "@/services/shops.api";

const SELECTED_SHOP_KEY = "selectedShopId";

export function useShopSelection(initialShopId?: string) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadShops = async () => {
    try {
      setIsLoadingShops(true);
      setError(null);
      const data = await listShops();
      setShops(data);

      // Auto-select logic
      if (data.length > 0) {
        // Priority: initialShopId > localStorage > auto-select if single shop
        const storedShopId = localStorage.getItem(SELECTED_SHOP_KEY);

        if (initialShopId && data.find((s) => s.id === initialShopId)) {
          setSelectedShopId(initialShopId);
          localStorage.setItem(SELECTED_SHOP_KEY, initialShopId);
        } else if (storedShopId && data.find((s) => s.id === storedShopId)) {
          setSelectedShopId(storedShopId);
        } else if (data.length === 1) {
          // Auto-select if only one shop
          setSelectedShopId(data[0].id);
          localStorage.setItem(SELECTED_SHOP_KEY, data[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load shops");
    } finally {
      setIsLoadingShops(false);
    }
  };

  useEffect(() => {
    loadShops();
  }, [initialShopId, refreshTrigger]);

  // Listen for shop updates from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "shop_updated") {
        setRefreshTrigger((prev) => prev + 1);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Listen for custom event from settings page
  useEffect(() => {
    const handleShopUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener("shopUpdated", handleShopUpdate);
    return () => window.removeEventListener("shopUpdated", handleShopUpdate);
  }, []);

  const selectShop = (shopId: string) => {
    setSelectedShopId(shopId);
    if (shopId) {
      localStorage.setItem(SELECTED_SHOP_KEY, shopId);
    } else {
      localStorage.removeItem(SELECTED_SHOP_KEY);
    }
  };

  const selectedShop = Array.isArray(shops) 
    ? shops.find((s) => s.id === selectedShopId) || null 
    : null;
  const hasMultipleShops = Array.isArray(shops) && shops.length > 1;

  const refreshShops = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return {
    shops,
    selectedShopId,
    selectedShop,
    isLoadingShops,
    error,
    selectShop,
    hasMultipleShops,
    refreshShops,
  };
}
