"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { listShops, type Shop } from "@/services/shops.api";
import { getAccessToken } from "@/services/auth.api";

interface ShopContextType {
  shops: Shop[];
  selectedShopId: string;
  selectedShop: Shop | null;
  isLoadingShops: boolean;
  error: string | null;
  selectShop: (shopId: string) => void;
  refreshShops: () => Promise<void>;
  hasMultipleShops: boolean;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const SELECTED_SHOP_KEY = "selectedShopId";
const SHOPS_CACHE_KEY = "shops_cache";

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch shops from API
  const fetchShops = useCallback(async () => {
    try {
      setIsLoadingShops(true);
      setError(null);
      const data = await listShops();
      setShops(data);
      // Cache shops in localStorage
      localStorage.setItem(SHOPS_CACHE_KEY, JSON.stringify(data));
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to load shops");
      // Try to load from cache if API fails
      const cached = localStorage.getItem(SHOPS_CACHE_KEY);
      if (cached) {
        try {
          setShops(JSON.parse(cached));
        } catch {
          setShops([]);
        }
      }
      return null;
    } finally {
      setIsLoadingShops(false);
    }
  }, []);

  // Initialize shops after login (only once)
  useEffect(() => {
    const token = getAccessToken();
    if (token && !isInitialized) {
      initializeShops();
    }
  }, []);

  const initializeShops = async () => {
    const data = await fetchShops();

    if (data && data.length > 0) {
      // Priority: localStorage > first shop (if only one)
      const storedShopId = localStorage.getItem(SELECTED_SHOP_KEY);

      if (storedShopId && data.find((s) => s.id === storedShopId)) {
        setSelectedShopId(storedShopId);
      } else if (data.length === 1) {
        // Auto-select if only one shop
        setSelectedShopId(data[0].id);
        localStorage.setItem(SELECTED_SHOP_KEY, data[0].id);
      }
    }

    setIsInitialized(true);
  };

  const selectShop = (shopId: string) => {
    setSelectedShopId(shopId);
    if (shopId) {
      localStorage.setItem(SELECTED_SHOP_KEY, shopId);
    } else {
      localStorage.removeItem(SELECTED_SHOP_KEY);
    }
  };

  const refreshShops = async () => {
    const data = await fetchShops();

    // Keep a valid selection after refresh
    if (data) {
      const hasSelected =
        selectedShopId && data.some((s) => s.id === selectedShopId);

      if (!hasSelected && data.length > 0) {
        const fallbackId = data[0].id;
        setSelectedShopId(fallbackId);
        localStorage.setItem(SELECTED_SHOP_KEY, fallbackId);
      }
    }
  };

  // Listen for shop updates (same tab + cross-tab)
  useEffect(() => {
    const handleShopUpdated = () => {
      refreshShops();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "shop_updated") {
        refreshShops();
      }
    };

    window.addEventListener("shopUpdated", handleShopUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("shopUpdated", handleShopUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshShops]);

  const selectedShop = shops.find((s) => s.id === selectedShopId) || null;
  const hasMultipleShops = shops.length > 1;

  const value: ShopContextType = {
    shops,
    selectedShopId,
    selectedShop,
    isLoadingShops,
    error,
    selectShop,
    refreshShops,
    hasMultipleShops,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within ShopProvider");
  }
  return context;
}
