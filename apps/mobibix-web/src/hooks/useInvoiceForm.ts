import { useState, useCallback } from "react";
import { type Party } from "@/services/parties.api";
import { type ShopProduct } from "@/services/products.api";

export interface ProductItem {
  id: string;
  shopProductId: string;
  productName: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  imeis: string[];
  serialNumbers: string[];
  warrantyDays?: number;
  warrantyEndAt?: string;
  costPrice: number | null;
}

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "CREDIT" | "MIXED";

export interface SplitPayment {
  id: string;
  mode: "CASH" | "UPI" | "CARD" | "BANK";
  amount: string;
}

interface UseInvoiceFormProps {
  shopGstEnabled?: boolean;
}

export function useInvoiceForm({ shopGstEnabled = false }: UseInvoiceFormProps = {}) {
  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);

  // Invoice Details
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  // Product Items
  const [items, setItems] = useState<ProductItem[]>([]);
  const [pricesIncludeTax, setPricesIncludeTax] = useState(true);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { id: crypto.randomUUID(), mode: "CASH", amount: "" },
  ]);

  // Actions
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        shopProductId: "",
        productName: "",
        hsnSac: "",
        quantity: 1,
        rate: 0,
        gstRate: shopGstEnabled ? 18 : 0,
        gstAmount: 0,
        total: 0,
        imeis: [],
        serialNumbers: [],
        costPrice: null,
      },
    ]);
  }, [shopGstEnabled]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: string, field: keyof ProductItem | "imeisText" | "serialNumbersText", value: any, products: ShopProduct[] = []) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const updated = { ...item, [field]: value };

            // Logic when product is selected
            if (field === "shopProductId") {
              const product = products.find((p) => p.id === value);
              if (product) {
                updated.productName = product.name;
                updated.rate = (product.salePrice || 0) / 100;
                updated.hsnSac = product.hsnCode || "";
                updated.gstRate = shopGstEnabled ? product.gstRate || 18 : 0;
                updated.costPrice = product.costPrice ?? null;
                updated.warrantyDays = product.warrantyDays ?? undefined;
                updated.imeis = []; // Reset IMEIs
                updated.serialNumbers = []; // Reset Serials
              }
            }

            // Recalculate totals
            if (
              field === "quantity" ||
              field === "rate" ||
              field === "gstRate" ||
              field === "shopProductId"
            ) {
              const baseAmount = updated.quantity * updated.rate;
              
              if (pricesIncludeTax) {
                // Price includes GST
                const divisor = 1 + updated.gstRate / 100;
                const base = baseAmount / divisor;
                updated.gstAmount = Math.round((baseAmount - base) * 100) / 100;
                updated.total = baseAmount;
              } else {
                // Price excludes GST
                updated.gstAmount = Math.round(((baseAmount * updated.gstRate) / 100) * 100) / 100;
                updated.total = Math.round((baseAmount + updated.gstAmount) * 100) / 100;
              }
            }

            // Parse IMEIs from text
            if (field === "imeisText") {
              const text: string = value || "";
              updated.imeis = text.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
            }

            // Parse Serial Numbers from text
            if (field === "serialNumbersText" as any) {
              const text: string = value || "";
              updated.serialNumbers = text.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
            }

            return updated;
          }
          return item;
        })
      );
    },
    [shopGstEnabled, pricesIncludeTax]
  );

  // Recalculate all items when pricesIncludeTax changes
  const togglePricesIncludeTax = useCallback((newValue: boolean) => {
    setPricesIncludeTax(newValue);
    setItems(prevItems => prevItems.map(item => {
      const updated = { ...item };
      const baseAmount = updated.quantity * updated.rate;
      
      if (newValue) {
        // Price includes GST
        const divisor = 1 + updated.gstRate / 100;
        const base = baseAmount / divisor;
        updated.gstAmount = Math.round((baseAmount - base) * 100) / 100;
        updated.total = baseAmount;
      } else {
        // Price excludes GST
        updated.gstAmount = Math.round(((baseAmount * updated.gstRate) / 100) * 100) / 100;
        updated.total = Math.round((baseAmount + updated.gstAmount) * 100) / 100;
      }
      return updated;
    }));
  }, []);

  // Summary Calculations
  const subtotal = items.reduce((sum, item) => {
    const base = pricesIncludeTax
      ? item.quantity * item.rate - item.gstAmount
      : item.quantity * item.rate;
    return sum + base;
  }, 0);

  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const grandTotal = subtotal + totalGst;

  return {
    selectedCustomer,
    setSelectedCustomer,
    invoiceDate,
    setInvoiceDate,
    items,
    params: { pricesIncludeTax },
    setPricesIncludeTax: togglePricesIncludeTax,
    paymentMode,
    setPaymentMode,
    splitPayments,
    setSplitPayments,
    addItem,
    removeItem,
    updateItem,
    totals: {
      subtotal,
      totalGst,
      grandTotal,
    }
  };
}
