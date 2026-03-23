"use client";

import { useEffect, useState } from "react";
import {
  Package, AlertTriangle, Plus, Minus, Send, ChevronDown, Loader2,
  CheckCircle2, Clock, XCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { distributorLinkingApi } from "@/services/distributor-linking.api";
import { distributorApi, DistCatalogItem } from "@/services/distributor.api";

interface Props {
  retailerId: string;
  retailerLabel: string;
}

interface StockProduct {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  brand?: string;
  quantity: number;
  reorderLevel?: number;
}

interface RefillItem {
  catalogItemId: string;
  catalogItemName: string;
  suggestedQty: number;
}

export function RetailerStockManager({ retailerId, retailerLabel }: Props) {
  const { toast } = useToast();
  const [stockData, setStockData] = useState<{ visible: boolean; reason?: string; products?: StockProduct[]; lowStockCount?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<DistCatalogItem[]>([]);
  const [refillItems, setRefillItems] = useState<RefillItem[]>([]);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [pastRefills, setPastRefills] = useState<any[]>([]);
  const [tab, setTab] = useState<"stock" | "suggest" | "history">("stock");

  useEffect(() => {
    loadData();
  }, [retailerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stock, cat, hist] = await Promise.all([
        distributorLinkingApi.getRetailerStock(retailerId),
        distributorApi.getCatalog(),
        distributorLinkingApi.listRefills(retailerId),
      ]);
      setStockData(stock);
      setCatalog(Array.isArray(cat) ? cat : []);
      setPastRefills(Array.isArray(hist) ? hist : []);
    } catch {
      setStockData({ visible: false, reason: "Failed to load" });
    } finally {
      setLoading(false);
    }
  };

  const addToRefill = (catalogItem: DistCatalogItem) => {
    setRefillItems(prev => {
      const exists = prev.find(i => i.catalogItemId === catalogItem.id);
      if (exists) return prev.map(i => i.catalogItemId === catalogItem.id ? { ...i, suggestedQty: i.suggestedQty + 1 } : i);
      return [...prev, { catalogItemId: catalogItem.id, catalogItemName: catalogItem.name, suggestedQty: 1 }];
    });
  };

  const adjustQty = (id: string, delta: number) => {
    setRefillItems(prev =>
      prev.map(i => i.catalogItemId === id ? { ...i, suggestedQty: Math.max(1, i.suggestedQty + delta) } : i)
        .filter(i => i.suggestedQty > 0)
    );
  };

  const removeItem = (id: string) => setRefillItems(prev => prev.filter(i => i.catalogItemId !== id));

  const sendRefillRequest = async () => {
    if (!refillItems.length) return;
    setSending(true);
    try {
      await distributorLinkingApi.createRefillRequest(retailerId, {
        items: refillItems.map(i => ({ catalogItemId: i.catalogItemId, suggestedQty: i.suggestedQty })),
        notes: notes.trim() || undefined,
      });
      toast({ title: "Refill suggestion sent!", description: `${refillItems.length} items suggested to ${retailerLabel}` });
      setRefillItems([]);
      setNotes("");
      loadData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading retailer data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {(["stock", "suggest", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
              tab === t ? "border-teal-500 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {t === "suggest" ? "Suggest Refill" : t === "history" ? `History (${pastRefills.length})` : "Stock View"}
          </button>
        ))}
        <button onClick={loadData} className="ml-auto pb-1 text-slate-400 hover:text-slate-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* STOCK VIEW */}
      {tab === "stock" && (
        !stockData?.visible ? (
          <div className="text-center py-10 text-slate-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{stockData?.reason ?? "Retailer hasn't granted stock visibility."}</p>
            <p className="text-xs mt-1">Ask them to enable it in Settings → Distributor Network.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stockData.lowStockCount! > 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {stockData.lowStockCount} items are at or below reorder point
              </div>
            )}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-400">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-center p-3">Brand</th>
                    <th className="text-center p-3">Category</th>
                    <th className="text-right p-3">In Stock</th>
                    <th className="text-right p-3">Reorder At</th>
                    <th className="text-right p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.products?.map(p => {
                    const isLow = p.reorderLevel != null && p.quantity <= p.reorderLevel;
                    return (
                      <tr key={p.id} className={`border-t border-slate-100 dark:border-slate-800 ${isLow ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {p.name}
                          {p.sku && <span className="ml-1 text-xs text-slate-400">({p.sku})</span>}
                          {isLow && <span className="ml-2 text-xs text-red-500 font-semibold">LOW</span>}
                        </td>
                        <td className="p-3 text-center text-slate-500">{p.brand ?? "—"}</td>
                        <td className="p-3 text-center text-slate-500">{p.category ?? "—"}</td>
                        <td className={`p-3 text-right font-semibold ${isLow ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}>{p.quantity}</td>
                        <td className="p-3 text-right text-slate-400">{p.reorderLevel ?? "—"}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => setTab("suggest")} className="text-xs text-teal-600 hover:underline">
                            + Add to refill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* SUGGEST REFILL */}
      {tab === "suggest" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Pick items from your catalog and suggest a restock quantity. The retailer will receive a notification to accept or modify.</p>

          {/* Catalog picker */}
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {catalog.map(item => (
              <button
                key={item.id}
                onClick={() => addToRefill(item)}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-teal-400 hover:bg-teal-50/50 p-2.5 text-left transition"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-400">₹{Number(item.unitPrice).toFixed(0)}</p>
                </div>
                <Plus className="w-4 h-4 text-teal-500 shrink-0" />
              </button>
            ))}
          </div>

          {/* Selected items */}
          {refillItems.length > 0 && (
            <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Refill List</p>
              {refillItems.map(item => (
                <div key={item.catalogItemId} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800 dark:text-white flex-1 truncate">{item.catalogItemName}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustQty(item.catalogItemId, -1)} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                    <span className="w-8 text-center text-sm font-bold">{item.suggestedQty}</span>
                    <button onClick={() => adjustQty(item.catalogItemId, 1)} className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-100"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => removeItem(item.catalogItemId)} className="ml-1 text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional note to retailer..."
                className="mt-2 text-sm"
              />
              <Button onClick={sendRefillRequest} disabled={sending} className="w-full bg-teal-600 hover:bg-teal-700 gap-2 mt-1">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Refill Suggestion
              </Button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div className="space-y-2">
          {pastRefills.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">No refill requests sent yet.</p>
          ) : pastRefills.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.items?.length ?? 0} items · {new Date(r.createdAt).toLocaleDateString()}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  r.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                  r.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-700" :
                  r.status === "REJECTED" ? "bg-red-100 text-red-600" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {r.status === "PENDING" ? <Clock className="w-3 h-3" /> : r.status === "ACCEPTED" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {r.status}
                </span>
              </div>
              {r.notes && <p className="text-xs text-slate-400 italic">"{r.notes}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
