"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Plus, ChevronRight, Loader2, AlertTriangle,
  CheckCircle2, RefreshCw, PackageSearch, X, Check, History,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  createVerificationSession, getVerificationSessions, getVerificationSession,
  addVerificationItems, confirmVerificationSession,
  type StockVerificationSession, type StockVerificationItem, type AdjustmentReason,
} from "@/services/operations.api";
import { listProducts } from "@/services/products.api";

const REASONS: { value: AdjustmentReason; label: string }[] = [
  { value: "BREAKAGE",     label: "Breakage" },
  { value: "DAMAGE",       label: "Damage" },
  { value: "LOST",         label: "Lost / Missing" },
  { value: "INTERNAL_USE", label: "Internal Use" },
  { value: "CORRECTION",   label: "Data Correction" },
  { value: "SPARE_DAMAGE", label: "Spare Part Damage" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

type Product = { id: string; name: string; category?: string; quantity: number };

export default function StockVerificationPage() {
  const { selectedShop } = useShop();
  const shopId = selectedShop?.id ?? "";

  const [sessions, setSessions] = useState<StockVerificationSession[]>([]);
  const [activeSession, setActiveSession] = useState<(StockVerificationSession & { items: StockVerificationItem[] }) | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // New session form
  const [showNewForm, setShowNewForm] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionNotes, setSessionNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Count form — keyed by shopProductId
  const [counts, setCounts] = useState<Record<string, { physicalQty: string; reason: AdjustmentReason | "" }>>({});
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [s, inv] = await Promise.all([
        getVerificationSessions(shopId),
        listProducts(shopId),
      ]);
      setSessions(s);
      // Find active DRAFT session
      const draft = s.find((x) => x.status === "DRAFT");
      if (draft) {
        const detail = await getVerificationSession(draft.id);
        setActiveSession(detail);
        // Pre-fill counts from existing items
        const c: typeof counts = {};
        for (const item of detail.items) {
          c[item.shopProductId] = {
            physicalQty: String(item.physicalQty),
            reason: item.reason ?? "",
          };
        }
        setCounts(c);
      } else {
        setActiveSession(null);
        setCounts({});
      }
      const rawList = Array.isArray(inv) ? inv : (inv as any).data ?? [];
      setProducts(
        rawList.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          quantity: p.quantity ?? 0,
        }))
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true); setError("");
    try {
      await createVerificationSession({ shopId, sessionDate, notes: sessionNotes });
      setSuccess("Verification session started.");
      setShowNewForm(false); setSessionNotes("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCounts = async () => {
    if (!activeSession) return;
    setError(""); setSuccess("");
    const items = Object.entries(counts)
      .filter(([, v]) => v.physicalQty !== "")
      .map(([shopProductId, v]) => ({
        shopProductId,
        physicalQty: parseInt(v.physicalQty) || 0,
        reason: v.reason || undefined,
      }));
    if (items.length === 0) { setError("Enter at least one product count."); return; }

    setConfirming(true);
    try {
      await addVerificationItems(activeSession.id, items);
      await load();
      setSuccess("Counts saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeSession) return;
    // First save current counts
    await handleSaveCounts();
    setConfirming(true); setError(""); setSuccess("");
    try {
      await confirmVerificationSession(activeSession.id, shopId);
      setSuccess("Session confirmed! Stock adjustments applied.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!shopId) return <div className="p-8 text-center text-gray-500">Select a shop first.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Stock Verification</h1>
          <p className="text-sm text-gray-500">Physical count vs system quantity</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-blue-500" size={28} />
        </div>
      ) : (
        <>
          {/* No active session */}
          {!activeSession && !showNewForm && (
            <div className="text-center py-10 space-y-4">
              <ClipboardCheck size={48} className="text-gray-300 mx-auto" />
              <p className="text-gray-500 text-sm">No active verification session.</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Plus size={16} /> Start Verification
              </button>
            </div>
          )}

          {/* New Session Form */}
          {showNewForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Start New Verification Session</p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-20">Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null} Start
                </button>
                <button onClick={() => setShowNewForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active Session */}
          {activeSession && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Active Session</p>
                  <p className="text-xs text-yellow-600">
                    {new Date(activeSession.sessionDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <StatusBadge status={activeSession.status} />
              </div>

              {/* Search */}
              <div className="relative">
                <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search product…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Product Count Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_80px_120px] text-xs text-gray-400 uppercase px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <span>Product</span>
                  <span className="text-center">System</span>
                  <span className="text-center">Physical</span>
                  <span className="text-center">Reason</span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[50vh] overflow-y-auto">
                  {filteredProducts.map((p) => {
                    const c = counts[p.id] ?? { physicalQty: "", reason: "" };
                    const diff = c.physicalQty !== "" ? parseInt(c.physicalQty) - p.quantity : null;
                    return (
                      <div key={p.id} className="grid grid-cols-[1fr_80px_80px_120px] items-center px-4 py-3 gap-2">
                        <div>
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                          {diff !== null && diff !== 0 && (
                            <p className={`text-xs font-medium mt-0.5 ${diff < 0 ? "text-red-500" : "text-green-500"}`}>
                              {diff > 0 ? "+" : ""}{diff}
                            </p>
                          )}
                        </div>
                        <p className="text-center text-sm text-gray-500">{p.quantity}</p>
                        <input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={c.physicalQty}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [p.id]: { ...prev[p.id] ?? { reason: "" }, physicalQty: e.target.value } }))
                          }
                          className="w-full text-center border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <select
                          value={c.reason}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [p.id]: { ...prev[p.id] ?? { physicalQty: "" }, reason: e.target.value as AdjustmentReason } }))
                          }
                          disabled={diff === null || diff === 0}
                          className="border border-gray-200 rounded px-2 py-1 text-xs text-gray-600 focus:outline-none disabled:opacity-40 disabled:bg-gray-50"
                        >
                          <option value="">—</option>
                          {REASONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveCounts}
                  disabled={confirming}
                  className="flex-1 border border-blue-300 text-blue-600 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Confirm &amp; Apply
                </button>
              </div>

              {/* Items with differences */}
              {activeSession.items.filter((i) => i.difference !== 0).length > 0 && (
                <div className="bg-white border border-orange-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Discrepancies</p>
                  {activeSession.items
                    .filter((i) => i.difference !== 0)
                    .map((i) => (
                      <div key={i.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{i.shopProduct?.name ?? i.shopProductId}</span>
                        <div className="text-right">
                          <span className={`font-medium ${i.difference < 0 ? "text-red-500" : "text-green-500"}`}>
                            {i.difference > 0 ? "+" : ""}{i.difference}
                          </span>
                          {i.reason && <span className="text-xs text-gray-400 ml-2">({i.reason})</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Past Sessions */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700"
            >
              <span className="flex items-center gap-2"><History size={16} /> Past Sessions</span>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showHistory && (
              <div className="divide-y divide-gray-100">
                {sessions.filter((s) => s.status !== "DRAFT").length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No completed sessions yet.</p>
                ) : sessions
                  .filter((s) => s.status !== "DRAFT")
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(s.sessionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-xs text-gray-400">{s._count?.items ?? 0} products counted</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
