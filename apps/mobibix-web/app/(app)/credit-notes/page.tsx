"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  listCreditNotes,
  createCreditNote,
  issueCreditNote,
  voidCreditNote,
  type CreditNote,
  type CreditNoteType,
  type CreditNoteStatus,
  type CreditNoteReason,
  type CreateCreditNoteDto,
  type CreateCreditNoteItemDto,
} from "@/services/credit-notes.api";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { searchCustomers, type Customer } from "@/services/customers.api";
import { getInvoiceByNumber, type SalesInvoice } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";
import {
  Plus,
  FileX,
  Search,
  X,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  RotateCcw,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_TABS: { label: string; value: CreditNoteType | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Customer", value: "CUSTOMER" },
  { label: "Supplier", value: "SUPPLIER" },
];

const STATUS_STYLES: Record<CreditNoteStatus, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400",
  ISSUED: "bg-blue-500/15 text-blue-400",
  PARTIALLY_APPLIED: "bg-amber-500/15 text-amber-400",
  FULLY_APPLIED: "bg-green-500/15 text-green-400",
  REFUNDED: "bg-teal-500/15 text-teal-400",
  VOIDED: "bg-red-500/15 text-red-400",
};

const REASON_LABELS: Record<CreditNoteReason, string> = {
  SALES_RETURN: "Sales Return",
  PURCHASE_RETURN: "Purchase Return",
  PRICE_ADJUSTMENT: "Price Adjustment",
  DISCOUNT_POST_SALE: "Discount (Post Sale)",
  OVERBILLING: "Overbilling",
  WARRANTY_CLAIM: "Warranty Claim",
};

const CUSTOMER_REASONS: CreditNoteReason[] = [
  "SALES_RETURN",
  "PRICE_ADJUSTMENT",
  "DISCOUNT_POST_SALE",
  "OVERBILLING",
  "WARRANTY_CLAIM",
];

const SUPPLIER_REASONS: CreditNoteReason[] = [
  "PURCHASE_RETURN",
  "PRICE_ADJUSTMENT",
  "OVERBILLING",
];

const EMPTY_ITEM: CreateCreditNoteItemDto = {
  description: "",
  quantity: 1,
  rate: 0,
  gstRate: 0,
  gstAmount: 0,
  lineTotal: 0,
  restockItem: false,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcItem(item: CreateCreditNoteItemDto): CreateCreditNoteItemDto {
  const base = item.quantity * item.rate;
  const gst = Math.round(base * ((item.gstRate ?? 0) / 100));
  return { ...item, gstAmount: gst, lineTotal: base + gst };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreditNotesPage() {
  const { theme } = useTheme();
  const { shops, selectedShopId: ctxShopId, isLoadingShops } = useShop();
  const isDark = theme === "dark";

  const [shopId, setShopId] = useState("");
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [activeType, setActiveType] = useState<CreditNoteType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCN, setSelectedCN] = useState<CreditNote | null>(null);

  // Create form
  const [form, setForm] = useState<CreateCreditNoteDto>({
    type: "CUSTOMER",
    reason: "SALES_RETURN",
    items: [{ ...EMPTY_ITEM }],
  });
  const [saving, setSaving] = useState(false);

  // Customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Invoice lookup
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceLooking, setInvoiceLooking] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const invoiceLookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Shop sync ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (ctxShopId) setShopId(ctxShopId);
    else if (shops.length > 0) setShopId(shops[0].id);
  }, [ctxShopId, shops]);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [cns, prods] = await Promise.all([
        listCreditNotes(shopId, {
          type: activeType === "ALL" ? undefined : activeType,
          search: search || undefined,
        }),
        products.length === 0 ? listProducts(shopId) : Promise.resolve(null),
      ]);
      setNotes(cns);
      if (prods) {
        const arr = Array.isArray(prods) ? prods : (prods as any)?.data ?? [];
        setProducts(arr);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, activeType, search]);

  useEffect(() => { load(); }, [load]);

  // ─── Item helpers ──────────────────────────────────────────────────────────

  function addItem() { setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] })); }
  function removeItem(i: number) { setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }
  function updateItem(i: number, patch: Partial<CreateCreditNoteItemDto>) {
    setForm((f) => {
      const items = [...f.items];
      items[i] = calcItem({ ...items[i], ...patch });
      return { ...f, items };
    });
  }

  const subTotal = form.items.reduce((s, it) => s + (it.quantity * it.rate), 0);
  const gstTotal = form.items.reduce((s, it) => s + (it.gstAmount ?? 0), 0);
  const grandTotal = subTotal + gstTotal;

  const availableReasons = form.type === "CUSTOMER" ? CUSTOMER_REASONS : SUPPLIER_REASONS;

  // ─── Customer search ───────────────────────────────────────────────────────

  function handleCustomerQuery(q: string) {
    setCustomerQuery(q);
    setCustomerResults([]);
    if (customerSearchRef.current) clearTimeout(customerSearchRef.current);
    if (q.length < 2) return;
    customerSearchRef.current = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const res = await searchCustomers(q, 6);
        setCustomerResults(res);
      } catch { /* silent */ } finally {
        setCustomerSearching(false);
      }
    }, 300);
  }

  function selectCustomer(c: Customer) {
    setForm((f) => ({ ...f, customerId: c.id } as any));
    setCustomerQuery(c.name);
    setCustomerResults([]);
  }

  // ─── Invoice number lookup ─────────────────────────────────────────────────

  function handleInvoiceNumberChange(num: string) {
    setInvoiceNumber(num);
    setInvoiceError(null);
    if (invoiceLookupRef.current) clearTimeout(invoiceLookupRef.current);
    if (num.trim().length < 3) return;
    invoiceLookupRef.current = setTimeout(async () => {
      if (!shopId) return;
      setInvoiceLooking(true);
      try {
        const inv = await getInvoiceByNumber(shopId, num.trim());
        setForm((f) => ({
          ...f,
          linkedInvoiceId: inv.id,
          items: inv.items?.map((it) => ({
            shopProductId: it.shopProductId,
            description: (it as any).product?.name ?? it.shopProductId,
            quantity: it.quantity,
            rate: it.rate,
            gstRate: it.gstRate ?? 0,
            gstAmount: it.gstAmount ?? 0,
            lineTotal: it.lineTotal ?? it.rate * it.quantity,
            restockItem: true,
          })) ?? f.items,
        }));
        if (inv.customerName && !customerQuery) setCustomerQuery(inv.customerName);
      } catch (e: any) {
        setInvoiceError(e.message ?? "Invoice not found");
      } finally {
        setInvoiceLooking(false);
      }
    }, 500);
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);
    try {
      await createCreditNote(shopId, form);
      setShowCreate(false);
      setForm({ type: "CUSTOMER", reason: "SALES_RETURN", items: [{ ...EMPTY_ITEM }] });
      setCustomerQuery(""); setCustomerResults([]); setInvoiceNumber(""); setInvoiceError(null);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleIssue(cn: CreditNote) {
    if (!confirm(`Issue credit note ${cn.creditNoteNo}? This cannot be undone.`)) return;
    try {
      await issueCreditNote(shopId, cn.id);
      load();
      if (selectedCN?.id === cn.id) setSelectedCN(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleVoid(cn: CreditNote) {
    const reason = prompt("Reason for voiding this credit note:");
    if (!reason) return;
    try {
      await voidCreditNote(shopId, cn.id, reason);
      load();
      if (selectedCN?.id === cn.id) setSelectedCN(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoadingShops) return null;
  if (shops.length === 0) return <NoShopsAlert />;

  const card = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const input = `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`;

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Credit Notes</h1>
          <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Manage customer returns, refunds, and supplier price corrections
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Issue Credit Note
        </button>
      </div>

      {/* Shop selector */}
      {shops.length > 1 && (
        <div className="mb-4">
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={`${input} w-auto`}>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Type tabs */}
      <div className={`flex gap-1 p-1 rounded-xl mb-4 w-fit ${isDark ? "bg-gray-800/50" : "bg-gray-100"}`}>
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveType(t.value)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeType === t.value
                ? isDark ? "bg-teal-600 text-white" : "bg-white text-teal-700 shadow"
                : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by party name or credit note number…"
          className={`${input} pl-9`}
        />
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</div>
      )}

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-12 text-center">
            <FileX size={40} className={`mx-auto mb-3 ${isDark ? "text-gray-700" : "text-gray-300"}`} />
            <p className={`font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>No credit notes found</p>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Issue a credit note for returns, refunds or price corrections</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              Issue Credit Note
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-500"}>
                  <th className="text-left px-4 py-3 font-medium">CN #</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Party</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-right px-4 py-3 font-medium">Applied</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {notes.map((cn) => (
                  <tr
                    key={cn.id}
                    onClick={() => setSelectedCN(cn)}
                    className={`cursor-pointer transition-colors ${isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{cn.creditNoteNo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cn.type === "CUSTOMER" ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400"}`}>
                        {cn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{cn.customer?.name ?? cn.supplier?.name ?? "—"}</div>
                    </td>
                    <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{REASON_LABELS[cn.reason]}</td>
                    <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{fmtDate(cn.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(cn.totalAmount)}</td>
                    <td className={`px-4 py-3 text-right text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      {cn.appliedAmount > 0 ? fmt(cn.appliedAmount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[cn.status]}`}>
                        {cn.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {cn.status === "DRAFT" && (
                          <button
                            onClick={() => handleIssue(cn)}
                            title="Issue"
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-green-500/20 text-green-400" : "hover:bg-green-50 text-green-600"}`}
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        {(cn.status === "ISSUED" || cn.status === "PARTIALLY_APPLIED") && (
                          <button
                            onClick={() => handleVoid(cn)}
                            title="Void"
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-500"}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedCN(cn)}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Create Modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${card}`}>
            <div className="flex items-center justify-between p-5 border-b border-gray-700/30">
              <h2 className="text-lg font-semibold">Issue Credit Note</h2>
              <button onClick={() => { setShowCreate(false); setCustomerQuery(""); setCustomerResults([]); setInvoiceNumber(""); setInvoiceError(null); }} className="p-1 rounded-lg hover:bg-gray-700/30"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Type */}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["CUSTOMER", "SUPPLIER"] as CreditNoteType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t, reason: t === "CUSTOMER" ? "SALES_RETURN" : "PURCHASE_RETURN" }))}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        form.type === t
                          ? "border-teal-500 bg-teal-500/10 text-teal-400"
                          : isDark ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-300 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {t === "CUSTOMER" ? "Customer CN" : "Supplier CN"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Party + Reason */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {form.type === "CUSTOMER" ? "Customer *" : "Supplier Name *"}
                  </label>
                  <div className="relative">
                    <input
                      required
                      value={customerQuery}
                      onChange={(e) => handleCustomerQuery(e.target.value)}
                      placeholder={form.type === "CUSTOMER" ? "Search customer…" : "Supplier name"}
                      className={input}
                      autoComplete="off"
                    />
                    {customerSearching && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {customerResults.length > 0 && (
                    <div className={`absolute z-10 mt-1 w-full rounded-xl border shadow-lg overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-500/10 transition-colors ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                          <div className="font-medium">{c.name}</div>
                          {c.phone && <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{c.phone}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Reason *</label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as CreditNoteReason }))}
                    className={input}
                  >
                    {availableReasons.map((r) => (
                      <option key={r} value={r}>{REASON_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source document */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    {form.type === "CUSTOMER" ? "Invoice Number (auto-fill items)" : "Purchase ID (optional)"}
                  </label>
                  <div className="relative">
                    <input
                      value={form.type === "CUSTOMER" ? invoiceNumber : (form.linkedPurchaseId ?? "")}
                      onChange={(e) =>
                        form.type === "CUSTOMER"
                          ? handleInvoiceNumberChange(e.target.value)
                          : setForm((f) => ({ ...f, linkedPurchaseId: e.target.value || undefined }))
                      }
                      placeholder={form.type === "CUSTOMER" ? "e.g. MB-S-25-001" : "Purchase ID"}
                      className={input}
                    />
                    {invoiceLooking && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border border-teal-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {invoiceError && <p className="text-xs text-red-400 mt-1">{invoiceError}</p>}
                  {form.linkedInvoiceId && !invoiceError && (
                    <p className="text-xs text-teal-500 mt-1">✓ Invoice found — items pre-filled</p>
                  )}
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Notes</label>
                  <input
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Reason details"
                    className={input}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Items</label>
                  <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-400">
                    <Plus size={12} /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Description *</label>
                          <input
                            required
                            value={item.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            className={`${input} text-xs`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Qty</label>
                          <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className={`${input} text-xs`} />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Rate (₹)</label>
                          <input type="number" min={0} value={item.rate} onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })} className={`${input} text-xs`} />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>GST %</label>
                          <input type="number" min={0} value={item.gstRate ?? 0} onChange={(e) => updateItem(idx, { gstRate: Number(e.target.value) })} className={`${input} text-xs`} />
                        </div>
                        <div className="col-span-1">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Restock?</label>
                          <input
                            type="checkbox"
                            checked={item.restockItem ?? false}
                            onChange={(e) => updateItem(idx, { restockItem: e.target.checked })}
                            className="block mt-2 w-4 h-4 accent-teal-500"
                            title="Return this item to inventory"
                          />
                        </div>
                        <div className="col-span-1 flex items-end justify-end">
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 mb-2">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={`text-right text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        Total: <span className="font-semibold">{fmt(item.lineTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className={`rounded-xl p-4 border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className={isDark ? "text-gray-400" : "text-gray-500"}>Sub Total</span>
                    <span>{fmt(subTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-gray-400" : "text-gray-500"}>GST</span>
                    <span>{fmt(gstTotal)}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-base pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <span>Credit Amount</span>
                    <span className="text-teal-500">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className={`flex items-start gap-2 text-xs p-3 rounded-xl ${isDark ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>This creates a Draft credit note. Click <strong>Issue</strong> from the list to formally issue it to the party.</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Create Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Detail Panel ─────────────────────────────────────────────────── */}
      {selectedCN && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCN(null)}>
          <div
            className={`w-full max-w-md h-full max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${card}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-700/30">
              <div>
                <h2 className="text-base font-semibold">{selectedCN.creditNoteNo}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedCN.type === "CUSTOMER" ? "bg-purple-500/15 text-purple-400" : "bg-orange-500/15 text-orange-400"}`}>{selectedCN.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedCN.status]}`}>{selectedCN.status.replace("_", " ")}</span>
                </div>
              </div>
              <button onClick={() => setSelectedCN(null)} className="p-1 rounded-lg hover:bg-gray-700/30"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Party</div>
                  <div className="font-semibold text-sm mt-0.5">{selectedCN.customer?.name ?? selectedCN.supplier?.name ?? "—"}</div>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Credit Amount</div>
                  <div className="font-bold text-teal-500 text-base">{fmt(selectedCN.totalAmount)}</div>
                  {selectedCN.appliedAmount > 0 && (
                    <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Applied: {fmt(selectedCN.appliedAmount)}</div>
                  )}
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Reason</div>
                <div className="font-medium text-sm mt-0.5">{REASON_LABELS[selectedCN.reason]}</div>
                {selectedCN.invoice && (
                  <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Invoice: {selectedCN.invoice.invoiceNumber}</div>
                )}
                {selectedCN.purchase && (
                  <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Purchase: {selectedCN.purchase.invoiceNumber}</div>
                )}
              </div>

              {selectedCN.notes && (
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{selectedCN.notes}</p>
              )}

              <div className="space-y-2">
                {selectedCN.status === "DRAFT" && (
                  <button
                    onClick={() => handleIssue(selectedCN)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium"
                  >
                    <CheckCircle size={14} /> Issue Credit Note
                  </button>
                )}
                {(selectedCN.status === "ISSUED" || selectedCN.status === "PARTIALLY_APPLIED") && (
                  <button
                    onClick={() => handleVoid(selectedCN)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-300 text-red-600 hover:bg-red-50"}`}
                  >
                    <RotateCcw size={14} /> Void
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
