"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listQuotations,
  createQuotation,
  updateQuotationStatus,
  convertQuotation,
  deleteQuotation,
  type Quotation,
  type QuotationStatus,
  type CreateQuotationDto,
  type CreateQuotationItemDto,
} from "@/services/quotations.api";
import {
  listProducts,
  createProduct,
  ProductType,
  type ShopProduct,
} from "@/services/products.api";
import { PartySelector } from "@/components/common/PartySelector";
import { type Party } from "@/services/parties.api";
import { CustomerModal } from "../customers/CustomerModal";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";
import {
  Plus,
  FileText,
  Search,
  X,
  ChevronRight,
  Trash2,
  ArrowRightLeft,
  CheckCircle,
  Send,
  Clock,
  XCircle,
  RefreshCw,
  Printer,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: QuotationStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Converted", value: "CONVERTED" },
];

const STATUS_STYLES: Record<QuotationStatus, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400",
  SENT: "bg-blue-500/15 text-blue-400",
  ACCEPTED: "bg-green-500/15 text-green-400",
  REJECTED: "bg-red-500/15 text-red-400",
  EXPIRED: "bg-amber-500/15 text-amber-400",
  CONVERTED: "bg-teal-500/15 text-teal-400",
};

const STATUS_ICONS: Record<QuotationStatus, React.ElementType> = {
  DRAFT: Clock,
  SENT: Send,
  ACCEPTED: CheckCircle,
  REJECTED: XCircle,
  EXPIRED: RefreshCw,
  CONVERTED: ArrowRightLeft,
};

const EMPTY_ITEM: CreateQuotationItemDto = {
  description: "",
  quantity: 1,
  price: 0,
  gstRate: 0,
  gstAmount: 0,
  lineTotal: 0,
  totalAmount: 0,
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

function calcItemTotals(
  item: CreateQuotationItemDto,
): CreateQuotationItemDto {
  const base = item.quantity * item.price;
  const gst = Math.round(base * ((item.gstRate ?? 0) / 100));
  return { ...item, gstAmount: gst, lineTotal: base, totalAmount: base + gst };
}

// ─── Component ───────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);

export default function QuotationsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { shops, selectedShopId: ctxShopId, isLoadingShops } = useShop();

  const isDark = theme === "dark";
  const [shopId, setShopId] = useState("");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [activeTab, setActiveTab] = useState<QuotationStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showConvert, setShowConvert] = useState<Quotation | null>(null);
  const [selectedQ, setSelectedQ] = useState<Quotation | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null);

  // Create form
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [form, setForm] = useState<CreateQuotationDto>({
    customerName: "",
    customerPhone: "",
    validityDays: 30,
    notes: "",
    quotationDate: today,
    items: [{ ...EMPTY_ITEM }],
  });
  const [saving, setSaving] = useState(false);

  // Product search per item row: itemIdx → search string
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [productDropOpen, setProductDropOpen] = useState<number | null>(null);

  // Quick product creation
  const [quickProduct, setQuickProduct] = useState<{ itemIdx: number } | null>(null);
  const [qpForm, setQpForm] = useState({ name: "", type: ProductType.GOODS, salePrice: 0, gstRate: 0 });
  const [qpSaving, setQpSaving] = useState(false);

  // Convert form
  const [convertType, setConvertType] = useState<"INVOICE" | "JOB_CARD">("INVOICE");
  const [jobCardFields, setJobCardFields] = useState({
    deviceType: "Smartphone",
    deviceBrand: "",
    deviceModel: "",
    customerComplaint: "",
  });
  const [converting, setConverting] = useState(false);

  // ─── Shop sync ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (ctxShopId) setShopId(ctxShopId);
    else if (shops.length > 0) setShopId(shops[0].id);
  }, [ctxShopId, shops]);

  // ─── Load data ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [qs, prods] = await Promise.all([
        listQuotations(shopId, {
          status: activeTab === "ALL" ? undefined : activeTab,
          search: search || undefined,
        }),
        products.length === 0 ? listProducts(shopId) : Promise.resolve(null),
      ]);
      setQuotations(qs);
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
  }, [shopId, activeTab, search]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Item helpers ──────────────────────────────────────────────────────────

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }

  function updateItem(idx: number, patch: Partial<CreateQuotationItemDto>) {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = calcItemTotals({ ...items[idx], ...patch });
      return { ...f, items };
    });
  }

  function pickProduct(idx: number, prod: ShopProduct) {
    updateItem(idx, {
      shopProductId: prod.id,
      description: prod.name,
      price: prod.salePrice != null ? Math.round(prod.salePrice) : 0,
      gstRate: prod.gstRate ?? 0,
    });
  }

  const subTotal = form.items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const gstTotal = form.items.reduce((s, it) => s + (it.gstAmount || 0), 0);
  const grandTotal = subTotal + gstTotal;

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);
    try {
      await createQuotation(shopId, {
        ...form,
        taxInclusive,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || form.customerName,
        customerPhone: selectedCustomer?.phone || form.customerPhone,
        items: form.items.map(it => ({
          shopProductId: it.shopProductId,
          description: it.description,
          quantity: it.quantity,
          price: it.price,
          gstRate: it.gstRate,
        })),
      });
      setShowCreate(false);
      setTaxInclusive(false);
      setForm({ customerName: "", customerPhone: "", validityDays: 30, notes: "", quotationDate: new Date().toISOString().slice(0, 10), items: [{ ...EMPTY_ITEM }] });
      setSelectedCustomer(null);
      setProductSearch({});
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!shopId || quickProduct === null) return;
    setQpSaving(true);
    try {
      const prod = await createProduct(shopId, {
        name: qpForm.name,
        type: qpForm.type,
        salePrice: qpForm.salePrice, // products.api sends rupees; backend converts to paise
        gstRate: qpForm.gstRate,
      });
      // createProduct returns salePrice in rupees
      const prodNorm: ShopProduct = { ...prod, salePrice: prod.salePrice ?? 0 };
      setProducts((prev) => [...prev, prodNorm]);
      pickProduct(quickProduct.itemIdx, prodNorm);
      setProductSearch((s) => ({ ...s, [quickProduct.itemIdx]: prodNorm.name }));
      setQuickProduct(null);
      setQpForm({ name: "", type: ProductType.GOODS, salePrice: 0, gstRate: 0 });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setQpSaving(false);
    }
  }

  async function handleStatusChange(q: Quotation, status: QuotationStatus) {
    try {
      await updateQuotationStatus(shopId, q.id, status);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!showConvert) return;

    if (convertType === "INVOICE") {
      router.push(`/sales/create?quotationId=${showConvert.id}&shopId=${shopId}`);
      return;
    }

    setConverting(true);
    try {
      const result = await convertQuotation(shopId, showConvert.id, {
        conversionType: convertType,
        ...(convertType === "JOB_CARD" ? jobCardFields : {}),
      });
      setShowConvert(null);
      load();
      if (result.jobCardId) router.push(`/jobcards`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setConverting(false);
    }
  }

  async function handleDelete(q: Quotation) {
    if (!confirm(`Delete quotation ${q.quotationNumber}?`)) return;
    try {
      await deleteQuotation(shopId, q.id);
      load();
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
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className={`text-sm mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Create and manage price estimates for customers
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Quotation
        </button>
      </div>

      {/* Shop selector */}
      {shops.length > 1 && (
        <div className="mb-4">
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className={`${input} w-auto`}
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status tabs */}
      <div className={`flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto ${isDark ? "bg-gray-800/50" : "bg-gray-100"}`}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === t.value
                ? isDark ? "bg-teal-600 text-white" : "bg-white text-teal-700 shadow"
                : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className={`relative mb-4`}>
        <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or quotation number…"
          className={`${input} pl-9`}
        />
      </div>

      {/* Table */}
      {error && (
        <div className="text-red-400 text-sm mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">{error}</div>
      )}

      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className={`mx-auto mb-3 ${isDark ? "text-gray-700" : "text-gray-300"}`} />
            <p className={`font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>No quotations found</p>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Create your first quotation to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              New Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? "bg-gray-800/50 text-gray-400" : "bg-gray-50 text-gray-500"}>
                  <th className="text-left px-4 py-3 font-medium">Quotation #</th>
                  <th className="text-left px-4 py-3 font-medium">Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Validity</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {quotations.map((q) => {
                  const Icon = STATUS_ICONS[q.status];
                  return (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedQ(q)}
                      className={`cursor-pointer transition-colors ${isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{q.quotationNumber}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{q.customerName}</div>
                        {q.customerPhone && (
                          <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{q.customerPhone}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{fmtDate(q.quotationDate)}</td>
                      <td className={`px-4 py-3 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{q.validityDays} days</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(q.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[q.status]}`}>
                            <Icon size={10} />
                            {q.status}
                          </span>
                          {q.status === 'CONVERTED' && (
                            <span className="text-[10px] text-gray-500 italic">
                              ({q.conversionType === 'INVOICE' ? 'as Invoice' : 'as Job Card'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {q.status === "DRAFT" && (
                            <button
                              onClick={() => handleStatusChange(q, "SENT")}
                              title="Mark as Sent"
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-blue-500/20 text-blue-400" : "hover:bg-blue-50 text-blue-600"}`}
                            >
                              <Send size={14} />
                            </button>
                          )}
                          {q.status === "SENT" && (
                            <button
                              onClick={() => handleStatusChange(q, "ACCEPTED")}
                              title="Mark as Accepted"
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-green-500/20 text-green-400" : "hover:bg-green-50 text-green-600"}`}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/print/quotation/${q.id}?shopId=${shopId}`, '_blank')}
                            title="Print"
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
                          >
                            <Printer size={14} />
                          </button>
                          {q.status === "ACCEPTED" && (
                            <button
                              onClick={() => setShowConvert(q)}
                              title="Convert"
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-teal-500/20 text-teal-400" : "hover:bg-teal-50 text-teal-600"}`}
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          )}
                          {q.status === "DRAFT" && (
                            <button
                              onClick={() => handleDelete(q)}
                              title="Delete"
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-50 text-red-500"}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedQ(q)}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              <h2 className="text-lg font-semibold">New Quotation</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-700/30">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Customer */}
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Search or Add Customer *
                    </label>
                    {selectedCustomer ? (
                      <div className={`flex items-center justify-between p-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                        <div>
                          <p className="text-sm font-medium">{selectedCustomer.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{selectedCustomer.phone}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSelectedCustomer(null)}
                          className="p-1 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <PartySelector
                        type="CUSTOMER"
                        onSelect={setSelectedCustomer}
                        placeholder="Search by name or phone..."
                        onCreateNew={() => setIsCustomerModalOpen(true)}
                        className="w-full"
                      />
                    )}
                  </div>
                  {!selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className={`px-4 py-2 border rounded-xl text-sm font-medium transition-colors h-[42px] ${isDark ? "border-gray-700 hover:bg-gray-800 text-teal-400" : "border-gray-300 hover:bg-gray-50 text-teal-600"}`}
                    >
                      + New
                    </button>
                  )}
                </div>

                {!selectedCustomer && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Manual Name</label>
                      <input
                        value={form.customerName}
                        onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                        placeholder="Or type name..."
                        className={input}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Manual Phone</label>
                      <input
                        value={form.customerPhone ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                        placeholder="Or type phone..."
                        className={input}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Date</label>
                  <input
                    type="date"
                    value={form.quotationDate ?? today}
                    onChange={(e) => setForm((f) => ({ ...f, quotationDate: e.target.value }))}
                    className={input}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Validity (days)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.validityDays ?? 30}
                    onChange={(e) => setForm((f) => ({ ...f, validityDays: Number(e.target.value) }))}
                    className={input}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Notes</label>
                  <input
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes"
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
                      <div className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-5">
                          {/* Searchable product combobox */}
                          <div className="flex gap-1 mb-1 relative">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                className={`${input} text-xs pr-6`}
                                placeholder="Search product…"
                                value={productSearch[idx] ?? (item.shopProductId ? products.find(p => p.id === item.shopProductId)?.name ?? "" : "")}
                                onChange={(e) => {
                                  setProductSearch((s) => ({ ...s, [idx]: e.target.value }));
                                  setProductDropOpen(idx);
                                  if (!e.target.value) updateItem(idx, { shopProductId: undefined });
                                }}
                                onFocus={() => setProductDropOpen(idx)}
                                onBlur={() => setTimeout(() => setProductDropOpen(null), 150)}
                                autoComplete="off"
                              />
                              {productSearch[idx] && (
                                <button
                                  type="button"
                                  onClick={() => { setProductSearch((s) => ({ ...s, [idx]: "" })); updateItem(idx, { shopProductId: undefined }); }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                ><X size={10} /></button>
                              )}
                              {productDropOpen === idx && (
                                <div className={`absolute z-50 top-full left-0 right-0 mt-0.5 rounded-xl border shadow-lg max-h-48 overflow-y-auto ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                                  {products
                                    .filter(p => !productSearch[idx] || p.name.toLowerCase().includes((productSearch[idx] ?? "").toLowerCase()))
                                    .slice(0, 50)
                                    .map(p => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onMouseDown={() => {
                                          pickProduct(idx, p);
                                          setProductSearch((s) => ({ ...s, [idx]: p.name }));
                                          setProductDropOpen(null);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-teal-500/10 ${isDark ? "text-white" : "text-gray-900"}`}
                                      >
                                        <span className="font-medium">{p.name}</span>
                                        {p.salePrice != null && (
                                          <span className={`ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>₹{p.salePrice.toFixed(0)}</span>
                                        )}
                                      </button>
                                    ))}
                                  {products.filter(p => !productSearch[idx] || p.name.toLowerCase().includes((productSearch[idx] ?? "").toLowerCase())).length === 0 && (
                                    <p className={`px-3 py-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>No products found</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              title="Create new product"
                              onClick={() => setQuickProduct({ itemIdx: idx })}
                              className={`px-2 rounded-lg border text-teal-500 hover:bg-teal-500/10 transition-colors shrink-0 ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-white"}`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="Description *"
                            required
                            className={`${input} text-xs`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            className={`${input} text-xs`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>Price (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                            className={`${input} text-xs`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>GST %</label>
                          <input
                            type="number"
                            min={0}
                            value={item.gstRate ?? 0}
                            onChange={(e) => updateItem(idx, { gstRate: Number(e.target.value) })}
                            className={`${input} text-xs`}
                          />
                        </div>
                        <div className="col-span-1 flex items-end justify-end pb-0.5">
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300 mt-5">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={`text-right text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {fmt(item.lineTotal || 0)} + GST {fmt(item.gstAmount || 0)} = <span className="font-semibold">{fmt(item.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax mode toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={e => setTaxInclusive(e.target.checked)}
                  className="w-4 h-4 accent-teal-500"
                />
                <span className={isDark ? "text-gray-300" : "text-gray-700"}>Prices include GST (tax-inclusive)</span>
              </label>

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
                    <span>Total</span>
                    <span className="text-teal-500">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Convert Modal ────────────────────────────────────────────────── */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl ${card}`}>
            <div className="flex items-center justify-between p-5 border-b border-gray-700/30">
              <h2 className="text-lg font-semibold">Convert Quotation</h2>
              <button onClick={() => setShowConvert(null)} className="p-1 rounded-lg hover:bg-gray-700/30">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConvert} className="p-5 space-y-4">
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                Converting <strong>{showConvert.quotationNumber}</strong> — {fmt(showConvert.totalAmount)}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {(["INVOICE", "JOB_CARD"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setConvertType(t)}
                    className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                      convertType === t
                        ? "border-teal-500 bg-teal-500/10 text-teal-400"
                        : isDark ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-300 text-gray-500 hover:border-gray-400"
                    }`}
                  >
                    {t === "INVOICE" ? "Sales Invoice" : "Job Card"}
                  </button>
                ))}
              </div>

              {convertType === "JOB_CARD" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`}>Device Type</label>
                      <input
                        required
                        value={jobCardFields.deviceType}
                        onChange={(e) => setJobCardFields((f) => ({ ...f, deviceType: e.target.value }))}
                        className={`${input} text-xs`}
                        placeholder="Smartphone, Laptop…"
                      />
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`}>Brand</label>
                      <input
                        required
                        value={jobCardFields.deviceBrand}
                        onChange={(e) => setJobCardFields((f) => ({ ...f, deviceBrand: e.target.value }))}
                        className={`${input} text-xs`}
                        placeholder="Samsung, Apple…"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`}>Model</label>
                    <input
                      required
                      value={jobCardFields.deviceModel}
                      onChange={(e) => setJobCardFields((f) => ({ ...f, deviceModel: e.target.value }))}
                      className={`${input} text-xs`}
                      placeholder="S24, iPhone 15…"
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isDark ? "text-gray-400" : "text-gray-600"}`}>Customer Complaint</label>
                    <input
                      required
                      value={jobCardFields.customerComplaint}
                      onChange={(e) => setJobCardFields((f) => ({ ...f, customerComplaint: e.target.value }))}
                      className={`${input} text-xs`}
                      placeholder="Screen broken, won't charge…"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConvert(null)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {converting ? "Converting…" : "Convert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Detail Panel ─────────────────────────────────────────────────── */}
      {selectedQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedQ(null)}>
          <div
            className={`w-full max-w-md h-full max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${card}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-700/30">
              <div>
                <h2 className="text-base font-semibold">{selectedQ.quotationNumber}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[selectedQ.status]}`}>{selectedQ.status}</span>
              </div>
              <button onClick={() => setSelectedQ(null)} className="p-1 rounded-lg hover:bg-gray-700/30"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Customer</div>
                  <div className="font-semibold text-sm mt-0.5">{selectedQ.customerName}</div>
                  {selectedQ.customerPhone && <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{selectedQ.customerPhone}</div>}
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Amount</div>
                  <div className="font-bold text-teal-500 text-base">{fmt(selectedQ.totalAmount)}</div>
                  <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Valid {selectedQ.validityDays} days</div>
                </div>
              </div>

              {selectedQ.linkedInvoiceId && (
                <div className={`p-3 rounded-xl border ${isDark ? "bg-teal-500/10 border-teal-500/30" : "bg-teal-50 border-teal-200"}`}>
                  <p className="text-xs text-teal-500 font-medium">Converted to Invoice</p>
                  <button onClick={() => router.push(`/sales`)} className="text-xs underline text-teal-400 mt-0.5">View Invoice →</button>
                </div>
              )}
              {selectedQ.linkedJobCardId && (
                <div className={`p-3 rounded-xl border ${isDark ? "bg-teal-500/10 border-teal-500/30" : "bg-teal-50 border-teal-200"}`}>
                  <p className="text-xs text-teal-500 font-medium">Converted to Job Card</p>
                  <button onClick={() => router.push(`/jobcards`)} className="text-xs underline text-teal-400 mt-0.5">View Job Card →</button>
                </div>
              )}

              {selectedQ.notes && (
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{selectedQ.notes}</p>
              )}

              {/* Action buttons */}
              {selectedQ.status === "DRAFT" && (
                <button
                  onClick={() => { handleStatusChange(selectedQ, "SENT"); setSelectedQ(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                >
                  <Send size={14} /> Mark as Sent
                </button>
              )}
              {selectedQ.status === "SENT" && (
                <button
                  onClick={() => { handleStatusChange(selectedQ, "ACCEPTED"); setSelectedQ(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium"
                >
                  <CheckCircle size={14} /> Mark as Accepted
                </button>
              )}
              {selectedQ.status === "ACCEPTED" && (
                <button
                  onClick={() => { setShowConvert(selectedQ); setSelectedQ(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium"
                >
                  <ArrowRightLeft size={14} /> Convert to Invoice / Job Card
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isCustomerModalOpen && (
        <CustomerModal
          onClose={() => setIsCustomerModalOpen(false)}
          onSuccess={(customer) => {
            setSelectedCustomer(customer);
            setIsCustomerModalOpen(false);
          }}
        />
      )}

      {/* ─── Quick Product Modal ───────────────────────────────────────────── */}
      {quickProduct !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl border shadow-2xl ${card}`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
              <h3 className="text-base font-semibold">New Product</h3>
              <button onClick={() => setQuickProduct(null)} className="p-1 rounded-lg hover:bg-gray-700/30">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickProduct} className="p-4 space-y-3">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Name *</label>
                <input
                  required
                  autoFocus
                  value={qpForm.name}
                  onChange={(e) => setQpForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Product name"
                  className={input}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Type</label>
                  <select
                    value={qpForm.type}
                    onChange={(e) => setQpForm((f) => ({ ...f, type: e.target.value as ProductType }))}
                    className={input}
                  >
                    <option value={ProductType.GOODS}>Goods</option>
                    <option value={ProductType.SPARE}>Spare Part</option>
                    <option value={ProductType.SERVICE}>Service</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>GST %</label>
                  <input
                    type="number"
                    min={0}
                    value={qpForm.gstRate === 0 ? "" : qpForm.gstRate}
                    placeholder="0"
                    onChange={(e) => setQpForm((f) => ({ ...f, gstRate: e.target.value === "" ? 0 : Number(e.target.value) }))}
                    className={input}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Sale Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={qpForm.salePrice === 0 ? "" : qpForm.salePrice}
                  placeholder="0"
                  onChange={(e) => setQpForm((f) => ({ ...f, salePrice: e.target.value === "" ? 0 : Number(e.target.value) }))}
                  className={input}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickProduct(null)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={qpSaving}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {qpSaving ? "Creating…" : "Create & Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
