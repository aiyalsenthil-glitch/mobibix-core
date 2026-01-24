"use client";

import { useEffect, useState } from "react";
import {
  updateInvoice,
  type PaymentMode,
  type InvoiceItem,
  type SalesInvoice,
} from "@/services/sales.api";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { getShopSettings, type ShopSettings } from "@/services/shops.api";

interface EditInvoiceModalProps {
  invoice: SalesInvoice;
  onClose: () => void;
}

interface ItemRow extends InvoiceItem {
  tempId: string;
}

const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "BANK"];
const GST_RATES = [
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
  { label: "Other", value: -1 },
];

export function EditInvoiceModal({ invoice, onClose }: EditInvoiceModalProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [customerName, setCustomerName] = useState(invoice.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(
    invoice.customerPhone || "",
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    invoice.paymentMode,
  );
  const [items, setItems] = useState<ItemRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateGST = (
    rate: number,
    quantity: number,
    gstRate: number,
  ): number => {
    const lineSubtotal = rate * quantity;
    return Math.round((lineSubtotal * gstRate) / 100);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        const [productsData, settingsData] = await Promise.all([
          listProducts(invoice.shopId),
          getShopSettings(invoice.shopId),
        ]);
        setProducts(productsData);
        setSettings(settingsData);

        // Pre-fill items from existing invoice
        if (invoice.items && invoice.items.length > 0) {
          setItems(
            invoice.items.map((item, idx) => ({
              tempId: `existing-${idx}`,
              shopProductId: item.shopProductId,
              quantity: item.quantity,
              rate: item.rate,
              gstRate: item.gstRate ?? 0,
              gstAmount: item.gstAmount ?? 0,
            })),
          );
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [invoice]);

  const addItem = () => {
    const defaultGstRate = settings?.gstEnabled ? 18 : 0;
    setItems([
      ...items,
      {
        tempId: `temp-${Date.now()}`,
        shopProductId: "",
        quantity: 1,
        rate: 0,
        gstRate: defaultGstRate,
        gstAmount: 0,
      },
    ]);
  };

  const removeItem = (tempId: string) => {
    setItems(items.filter((i) => i.tempId !== tempId));
  };

  const updateItem = (tempId: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((i) => {
        if (i.tempId !== tempId) return i;

        const updated = { ...i, [field]: value };

        // Recalculate GST when rate, quantity, or gstRate changes
        if (field === "rate" || field === "quantity" || field === "gstRate") {
          updated.gstAmount = calculateGST(
            updated.rate,
            updated.quantity,
            updated.gstRate,
          );
        }

        return updated;
      }),
    );
  };

  const handleProductChange = (tempId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      updateItem(tempId, "shopProductId", productId);
      updateItem(tempId, "rate", product.salePrice);
    } else {
      updateItem(tempId, "shopProductId", productId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    if (items.some((i) => !i.shopProductId || i.quantity <= 0 || i.rate <= 0)) {
      alert("Please fill all item fields correctly");
      return;
    }

    // Validate GST if shop has GST disabled
    if (!settings?.gstEnabled && items.some((i) => i.gstRate > 0)) {
      alert("GST is disabled for this shop. All GST rates must be 0%.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await updateInvoice(invoice.id, {
        shopId: invoice.shopId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMode,
        items: items.map(
          ({ shopProductId, quantity, rate, gstRate, gstAmount }) => ({
            shopProductId,
            quantity,
            rate,
            gstRate,
            gstAmount,
          }),
        ),
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update invoice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 rounded-lg border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-stone-900 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Edit Invoice {invoice.invoiceNumber}
              </h2>
              <p className="text-sm text-stone-400 mt-1">
                Reversing old stock/GST and applying new values
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {isLoadingData ? (
          <div className="p-6 text-center text-stone-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* GST Status */}
            {settings && (
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg text-sm">
                GST: {settings.gstEnabled ? "Enabled" : "Disabled"} (calculated
                by backend)
              </div>
            )}

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-300 mb-2">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-2">
                  Customer Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  placeholder="Enter phone"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm text-stone-300 mb-2">
                Payment Mode <span className="text-red-400">*</span>
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
                required
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode} className="bg-stone-900">
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-stone-300">
                  Items <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-lg"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.tempId}
                    className="border border-white/10 rounded-lg p-3 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">
                        <label className="block text-xs text-stone-400 mb-1">
                          Product
                        </label>
                        <select
                          value={item.shopProductId}
                          onChange={(e) =>
                            handleProductChange(item.tempId, e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                          required
                        >
                          <option value="" className="bg-stone-900">
                            -- Select Product --
                          </option>
                          {products.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              className="bg-stone-900"
                            >
                              {p.name} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-stone-400 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.tempId,
                              "quantity",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                          placeholder="Qty"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs text-stone-400 mb-1">
                          Rate
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(
                              item.tempId,
                              "rate",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                          placeholder="Rate"
                          required
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(item.tempId)}
                          className="w-full px-2 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="block text-xs text-stone-400 mb-1">
                          GST Rate
                        </label>
                        <select
                          value={item.gstRate}
                          onChange={(e) =>
                            updateItem(
                              item.tempId,
                              "gstRate",
                              parseFloat(e.target.value),
                            )
                          }
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                          disabled={!settings?.gstEnabled}
                        >
                          {GST_RATES.map((rate) => (
                            <option
                              key={rate.value}
                              value={rate.value}
                              className="bg-stone-900"
                            >
                              {rate.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {item.gstRate === -1 && (
                        <div className="col-span-3">
                          <label className="block text-xs text-stone-400 mb-1">
                            Custom %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            onChange={(e) =>
                              updateItem(
                                item.tempId,
                                "gstRate",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                            placeholder="Enter %"
                          />
                        </div>
                      )}
                      <div
                        className={
                          item.gstRate === -1 ? "col-span-5" : "col-span-8"
                        }
                      >
                        <label className="block text-xs text-stone-400 mb-1">
                          GST Amount (Calculated)
                        </label>
                        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-stone-300 text-sm">
                          ₹ {item.gstAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-4 text-stone-400 text-sm">
                    No items added. Click "+ Add Item" to start.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg"
                disabled={isSaving || items.length === 0}
              >
                {isSaving ? "Updating..." : "Update Invoice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
