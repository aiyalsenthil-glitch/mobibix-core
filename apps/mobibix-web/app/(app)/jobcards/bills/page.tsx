"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
  type PaymentStatus,
} from "@/services/sales.api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { JobCardsTabs } from "@/components/jobcards/JobCardsTabs";
import { Eye, Search, X, MoreVertical, IndianRupee, Printer, Share2, Ban, Edit, History, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  FINAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  CREDIT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  VOIDED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-200",
  UPI: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  CARD: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  BANK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CREDIT:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
};

export default function JobCardBillsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { authUser } = useAuth();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    selectShop,
    hasMultipleShops,
  } = useShop();

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 50;

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [collectingInvoice, setCollectingInvoice] =
    useState<SalesInvoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<{
    id: string;
    number: string;
  } | null>(null);

  // CRM Modals State (if needed, keeping it consistent with SalesPage)
  const [timelineCustomerId, setTimelineCustomerId] = useState<string | null>(null);
  const [timelineCustomerName, setTimelineCustomerName] = useState<string>("");
  const [followUpData, setFollowUpData] = useState<{
    customerId: string;
    customerName: string;
    defaultPurpose: string;
    defaultType: any;
  } | null>(null);

  const {
    data: invoicesData,
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(async () => {
      if (!selectedShopId) {
        return { data: [], total: 0 };
      }

      const result = await listInvoices(selectedShopId, true, {
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        customerName: debouncedSearchQuery || undefined,
      });

      if (Array.isArray(result)) {
        return { data: result, total: result.length };
      }
      return result;
    }, [selectedShopId, currentPage, statusFilter, debouncedSearchQuery]),
    [selectedShopId, currentPage, statusFilter, debouncedSearchQuery],
    { data: [], total: 0 },
  );

  const invoices = invoicesData?.data || [];

  const handleShare = (invoiceId: string, invoiceNumber: string) => {
    const shareUrl = `${window.location.origin}/print/invoice/${invoiceId}?shopId=${selectedShopId}`;
    const text = `Invoice ${invoiceNumber}`;
    if (navigator.share) {
      navigator.share({ title: text, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Invoice link copied to clipboard");
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Job Card Bills
        </h1>
      </div>

      <JobCardsTabs />

      {/* Filters Section */}
      <div
        className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-xl p-4 mb-6 shadow-sm`}
      >
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {hasMultipleShops && (
            <div className="flex-1 w-full">
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
              >
                Shop
              </label>
              <select
                value={selectedShopId}
                onChange={(e) => selectShop(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 border ${
                  theme === "dark"
                    ? "bg-stone-900 border-white/10 text-white"
                    : "bg-gray-50 border-gray-300 text-black"
                }`}
              >
                <option value="">-- Select Shop --</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="w-full md:w-48">
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
            >
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className={`${theme === "dark" ? "bg-stone-900 border-white/10 text-white" : "bg-gray-50 border-gray-300 text-black"}`}
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
                <SelectItem value="VOIDED">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-[2] w-full relative">
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
            >
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <Input
                placeholder="Search Invoice # or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-10 ${theme === "dark" ? "bg-stone-900 border-white/10 text-white placeholder:text-stone-600" : "bg-gray-50 border-gray-300 text-black"}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          className={`border px-4 py-3 rounded-lg mb-6 ${theme === "dark" ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-zinc-600 dark:text-stone-400">Loading bills...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-zinc-600 dark:text-stone-400">No bills found for job cards</div>
      ) : (
        <div
          className={`border rounded-lg overflow-hidden shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`border-b ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}
              >
                <tr>
                  {["Invoice #", "Customer", "Amount", "Status", "Date", "Actions"].map((header) => (
                    <th
                      key={header}
                      className={`text-left px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-stone-300" : "text-black"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === "dark" ? "divide-white/10" : "divide-gray-200"}`}>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <td className={`px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}>
                      {inv.invoiceNumber}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-300" : "text-black"}`}>
                      {inv.customerName || "-"}
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-white" : "text-black"}`}>
                      <div className="font-bold">₹{inv.totalAmount.toLocaleString()}</div>
                      {inv.balanceAmount && inv.balanceAmount > 0 && (
                        <div className="text-xs text-red-500 font-semibold">Bal: ₹{inv.balanceAmount.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}>
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/sales/${inv.id}?shopId=${selectedShopId}`)}
                          className="px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-500/30 transition flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition text-gray-500 dark:text-gray-400">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-stone-900 border-gray-200 dark:border-stone-800">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {inv.balanceAmount && inv.balanceAmount > 0 && (
                              <DropdownMenuItem onClick={() => setCollectingInvoice(inv)} className="text-green-600 dark:text-green-400 font-medium">
                                <IndianRupee className="w-4 h-4 mr-2" /> Collect Payment
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleShare(inv.id, inv.invoiceNumber)}>
                              <Share2 className="w-4 h-4 mr-2" /> Share Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/print/invoice/${inv.id}?shopId=${selectedShopId}`)}>
                              <Printer className="w-4 h-4 mr-2" /> Print Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {collectingInvoice && (
        <CollectPaymentModal
          invoiceId={collectingInvoice.id}
          balanceAmount={collectingInvoice.balanceAmount || 0}
          customerName={collectingInvoice.customerName || "Customer"}
          isOpen={!!collectingInvoice}
          onClose={() => setCollectingInvoice(null)}
          onSuccess={() => {
            setCollectingInvoice(null);
            reload();
          }}
        />
      )}

      {cancellingInvoice && (
        <CancelInvoiceModal
          isOpen={!!cancellingInvoice}
          invoiceId={cancellingInvoice.id}
          invoiceNumber={cancellingInvoice.number}
          onClose={() => setCancellingInvoice(null)}
          onSuccess={() => {
            setCancellingInvoice(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
