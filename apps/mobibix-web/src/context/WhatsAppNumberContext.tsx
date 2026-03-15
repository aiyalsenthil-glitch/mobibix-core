"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPhoneNumbers, type WhatsAppNumber } from "@/services/whatsapp.api";

interface WhatsAppNumberContextValue {
  numbers: WhatsAppNumber[];
  selectedNumberId: string;
  selectedNumber: WhatsAppNumber | null;
  isLoading: boolean;
  error: string | null;
  setSelectedNumberId: (id: string) => void;
  refreshNumbers: () => Promise<void>;
}

const WhatsAppNumberContext = createContext<
  WhatsAppNumberContextValue | undefined
>(undefined);

const storageKey = (tenantId: string) => `whatsappNumberId:${tenantId}`;

export function WhatsAppNumberProvider({
  tenantId,
  children,
}: {
  tenantId?: string;
  children: React.ReactNode;
}) {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumberId, setSelectedNumberIdState] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSelection = useCallback(
    (id: string) => {
      if (!tenantId || typeof window === "undefined") return;
      localStorage.setItem(storageKey(tenantId), id);
    },
    [tenantId],
  );

  const setSelectedNumberId = useCallback(
    (id: string) => {
      setSelectedNumberIdState(id);
      persistSelection(id);
    },
    [persistSelection],
  );

  const refreshNumbers = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPhoneNumbers(tenantId);
      setNumbers(data || []);

      const saved =
        typeof window !== "undefined"
          ? localStorage.getItem(storageKey(tenantId))
          : null;

      if (saved && (saved === "ALL" || data.some((n) => n.id === saved))) {
        setSelectedNumberIdState(saved);
        return;
      }

      if (data.length > 1) {
        setSelectedNumberIdState("ALL");
        persistSelection("ALL");
        return;
      }

      if (data.length === 1) {
        setSelectedNumberIdState(data[0].id);
        persistSelection(data[0].id);
        return;
      }

      setSelectedNumberIdState("ALL");
    } catch (err: unknown) {
      setError((err as any)?.message || "Failed to load WhatsApp numbers");
      setNumbers([]);
    } finally {
      setIsLoading(false);
    }
  }, [persistSelection, tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    refreshNumbers();
  }, [tenantId, refreshNumbers]);

  const selectedNumber = useMemo(() => {
    if (selectedNumberId === "ALL") return null;
    return numbers.find((n) => n.id === selectedNumberId) || null;
  }, [numbers, selectedNumberId]);

  const value = useMemo(
    () => ({
      numbers,
      selectedNumberId,
      selectedNumber,
      isLoading,
      error,
      setSelectedNumberId,
      refreshNumbers,
    }),
    [
      numbers,
      selectedNumberId,
      selectedNumber,
      isLoading,
      error,
      setSelectedNumberId,
      refreshNumbers,
    ],
  );

  return (
    <WhatsAppNumberContext.Provider value={value}>
      {children}
    </WhatsAppNumberContext.Provider>
  );
}

export function useWhatsAppNumber() {
  const context = useContext(WhatsAppNumberContext);
  if (!context) {
    throw new Error(
      "useWhatsAppNumber must be used within WhatsAppNumberProvider",
    );
  }
  return context;
}
