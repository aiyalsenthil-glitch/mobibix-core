"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Plus, Loader2, AlertTriangle,
  CheckCircle2, RefreshCw, PackageSearch, Check, History,
  ChevronDown, ChevronUp, HelpCircle,
} from "lucide-react";
import { useShop } from "@/context/ShopContext";
import {
  createVerificationSession, getVerificationSessions, getVerificationSession,
  addVerificationItems, confirmVerificationSession,
  type StockVerificationSession, type StockVerificationItem, type AdjustmentReason,
} from "@/services/operations.api";
import { listProducts } from "@/services/products.api";

const HELP_STEPS = [
  { step: "1", title: "Start a session", desc: 'Click "Start Verification" and pick today\'s date. One active session per shop at a time.' },
  { step: "2", title: "Count each product", desc: "Enter the physical quantity you see on the shelf. Leave blank for items you haven't counted." },
  { step: "3", title: "Pick a reason", desc: "When physical < system the Reason dropdown unlocks. Choose what caused the loss." },
  { step: "4", title: "Confirm & Apply", desc: "Save Draft to pause and resume later. Confirm & Apply to finalise — stock quantities are adjusted and the data feeds into Shrinkage Intelligence." },
];

const REASON_HELP = [
  { label: "Breakage",        color: "bg-red-500",    desc: "Item physically broke during storage or handling." },
  { label: "Damage",          color: "bg-orange-500", desc: "Damaged in demo, display, or transit." },
  { label: "Lost / Missing",  color: "bg-purple-500", desc: "Cannot be located — possible theft or misplacement." },
  { label: "Internal Use",    color: "bg-blue-500",   desc: "Consumed in-house (demo, staff use, gifted)." },
  { label: "Spare Part Damage", color: "bg-yellow-500", desc: "Part broke during a repair job." },
  { label: "Data Correction", color: "bg-gray-400",   desc: "Fixing a previous incorrect stock count." },
];

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-blue-50 dark:bg-slate-800/70 border border-blue-200 dark:border-slate-700 rounded-xl p-5 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-blue-900 dark:text-blue-300">How Stock Verification Works</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Physical count → loss reason → manager confirms → Shrinkage Intelligence updates</p>
        </div>
        <button onClick={onClose} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 p-1">
          <ChevronUp size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HELP_STEPS.map((s) => (
          <div key={s.step} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
            <div>
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">{s.title}</p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-2">Loss Reasons</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {REASON_HELP.map((r) => (
            <div key={r.label} className="flex items-start gap-2">
              <span className={`w-2 h-2 rounded-full ${r.color} flex-shrink-0 mt-1.5`} />
              <div>
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">{r.label}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-tight">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    CONFIRMED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    CANCELLED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400"}`}>
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
  const [showHelp, setShowHelp] = useState(false);

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

  if (!shopId) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Select a shop first.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Stock Verification</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Physical count vs system quantity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp((v) => !v)}
            title="How it works"
            className={`p-2 rounded-lg transition-colors ${showHelp ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500"}`}
          >
            <HelpCircle size={16} />
          </button>
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
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
            <div className="text-center py-10 space-y-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
              <ClipboardCheck size={48} className="text-gray-300 dark:text-slate-700 mx-auto" />
              <p className="text-gray-500 dark:text-slate-400 text-sm">No active verification session.</p>
              <button
                onClick={() => setShowNewForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} /> Start Verification
              </button>
            </div>
          )}

          {/* New Session Form */}
          {showNewForm && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">Start New Verification Session</p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-slate-400 w-20">Date</label>
                <input
                  type="date"
                  value={sessionDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 text-sm focus:outline-none dark:text-slate-200"
                />
              </div>
              <textarea
                placeholder="Notes (optional)"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none dark:text-slate-200"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null} Start
                </button>
                <button onClick={() => setShowNewForm(false)} className="flex-1 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active Session */}
          {activeSession && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">Active Session</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    {new Date(activeSession.sessionDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <StatusBadge status={activeSession.status} />
              </div>

              {/* Search */}
              <div className="relative">
                <PackageSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search product…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200 shadow-sm"
                />
              </div>

              {/* Product Count Table */}
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-md">
                <div className="grid grid-cols-[1fr_80px_80px_120px] text-xs text-gray-400 dark:text-slate-500 uppercase px-4 py-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 font-bold tracking-wider">
                  <span>Product</span>
                  <span className="text-center">System</span>
                  <span className="text-center">Physical</span>
                  <span className="text-center">Reason</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-slate-800 max-h-[50vh] overflow-y-auto">
                  {filteredProducts.map((p) => {
                    const c = counts[p.id] ?? { physicalQty: "", reason: "" };
                    const diff = c.physicalQty !== "" ? parseInt(c.physicalQty) - p.quantity : null;
                    return (
                      <div key={p.id} className="grid grid-cols-[1fr_80px_80px_120px] items-center px-4 py-3 gap-2 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium truncate text-gray-900 dark:text-slate-200">{p.name}</p>
                          {p.category && <p className="text-xs text-gray-400 dark:text-slate-500">{p.category}</p>}
                          {diff !== null && diff !== 0 && (
                            <p className={`text-xs font-bold mt-0.5 ${diff < 0 ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}`}>
                              {diff > 0 ? "+" : ""}{diff}
                            </p>
                          )}
                        </div>
                        <p className="text-center text-sm text-gray-500 dark:text-slate-400 font-mono">{p.quantity}</p>
                        <input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={c.physicalQty}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [p.id]: { ...prev[p.id] ?? { reason: "" }, physicalQty: e.target.value } }))
                          }
                          className="w-full text-center border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200"
                        />
                        <select
                          value={c.reason}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [p.id]: { ...prev[p.id] ?? { physicalQty: "" }, reason: e.target.value as AdjustmentReason } }))
                          }
                          disabled={diff === null || diff === 0}
                          className="border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-950 focus:outline-none disabled:opacity-40 disabled:bg-gray-50 dark:disabled:bg-slate-800"
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
                  className="flex-1 border border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 disabled:opacity-50 transition-colors"
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
                <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/30 rounded-xl p-4 space-y-2 shadow-sm">
                  <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Discrepancies</p>
                  {activeSession.items
                    .filter((i) => i.difference !== 0)
                    .map((i) => (
                      <div key={i.id} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-slate-300">{i.shopProduct?.name ?? i.shopProductId}</span>
                        <div className="text-right">
                          <span className={`font-bold ${i.difference < 0 ? "text-red-500 dark:text-red-400" : "text-green-500 dark:text-green-400"}`}>
                            {i.difference > 0 ? "+" : ""}{i.difference}
                          </span>
                          {i.reason && <span className="text-xs text-gray-400 dark:text-slate-500 ml-2 font-medium">({i.reason})</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Past Sessions */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800/50 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center gap-2"><History size={16} /> Past Sessions</span>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showHistory && (
              <div className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {sessions.filter((s) => s.status !== "DRAFT").length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">No completed sessions yet.</p>
                ) : sessions
                  .filter((s) => s.status !== "DRAFT")
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">
                          {new Date(s.sessionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{s._count?.items ?? 0} products counted</p>
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
