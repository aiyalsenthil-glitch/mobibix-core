"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { listShops, type Shop } from "@/services/shops.api";
import { useAuth } from "@/hooks/useAuth";
import { hasSessionHint } from "@/services/auth.api";

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

  const { authUser, isLoading: authLoading } = useAuth();

  // Fetch shops from API
  const fetchShops = useCallback(async () => {
    if (!authUser?.tenantId) {
      setShops([]);
      setIsLoadingShops(false);
      return null;
    }

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
  }, [authUser?.tenantId]);

  // Initialize shops after login (only once)
  useEffect(() => {
    if (authLoading) return;

    if (authUser?.tenantId && !isInitialized) {
      initializeShops();
    } else if (!authLoading && !authUser?.tenantId) {
      setShops([]);
      setIsLoadingShops(false);
      setIsInitialized(true);
    }
  }, [authUser?.tenantId, authLoading, isInitialized]);

  const initializeShops = async () => {
    const data = await fetchShops();

    if (data && data.length > 0) {
      const storedShopId = localStorage.getItem(SELECTED_SHOP_KEY);

      // Validate stored shopId
      const isValidShopId =
        storedShopId &&
        /^[a-z0-9]{20,30}$/i.test(storedShopId) &&
        data.find((s) => s.id === storedShopId);

      if (isValidShopId) {
        setSelectedShopId(storedShopId);
      } else {
        // Auto-select first shop if none selected or invalid
        const firstShopId = data[0].id;
        setSelectedShopId(firstShopId);
        localStorage.setItem(SELECTED_SHOP_KEY, firstShopId);
      }
    }

    setIsInitialized(true);
  };

  // Watch shops and ensure one is selected if available
  useEffect(() => {
    if (isInitialized && shops.length > 0 && !selectedShopId) {
      const firstShopId = shops[0].id;
      setSelectedShopId(firstShopId);
      localStorage.setItem(SELECTED_SHOP_KEY, firstShopId);
    }
  }, [shops, selectedShopId, isInitialized]);

  const selectShop = (shopId: string) => {
    setSelectedShopId(shopId);
    if (shopId) {
      localStorage.setItem(SELECTED_SHOP_KEY, shopId);
    } else {
      localStorage.removeItem(SELECTED_SHOP_KEY);
    }
    // Phase 5: Trigger rehydration of activePermissions globally
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('branch_changed'));
    }
  };

  const refreshShops = useCallback(async () => {
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
  }, [fetchShops, selectedShopId]);

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

  const selectedShop = React.useMemo(() => {
    if (!isInitialized || !Array.isArray(shops)) return null;
    return shops.find((s) => s.id === selectedShopId) || (shops.length > 0 ? shops[0] : null);
  }, [shops, selectedShopId, isInitialized]);

  const hasMultipleShops = React.useMemo(() => {
    return Array.isArray(shops) && shops.length > 1;
  }, [shops]);

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
