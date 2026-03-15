"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
  type PaymentStatus,
} from "@/services/sales.api";
import { hasSessionHint } from "@/services/auth.api";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { NoShopsAlert } from "../components/NoShopsAlert";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Printer,
  Edit,
  Phone,
  Share2,
  History,
  Ban,
  IndianRupee,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 50;

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  FINAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  CREDIT:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400", // Changed from amber to indigo for credit to differentiate from partial
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

export default function SalesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { authUser } = useAuth();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    error: shopError,
    selectShop,
    refreshShops,
    hasMultipleShops,
  } = useShop();

  // Retry loading shops exactly once if empty (race condition fix)
  const hasRetried = useRef(false);
  useEffect(() => {
    if (!isLoadingShops && shops.length === 0 && hasSessionHint()) {
      if (!hasRetried.current) {
        hasRetried.current = true;
        refreshShops();
      }
    }
  }, [isLoadingShops, shops.length, refreshShops]);

  // Get user role for permission checks
  const userRole = authUser?.role;
  const isOwner = userRole === "owner";

  // URL Syncing
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filters State initializing from URL
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "ALL");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchParams.get("search") || "");

  // Pagination state initializing from URL
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1") - 1);

  // Helper to update URL params
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "ALL" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Sync state with URL if URL changes (back button support)
  useEffect(() => {
    const page = parseInt(searchParams.get("page") || "1") - 1;
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";
    
    if (page !== currentPage) setCurrentPage(page);
    if (status !== statusFilter) setStatusFilter(status);
    if (search !== searchQuery) {
      setSearchQuery(search);
      setDebouncedSearchQuery(search);
    }
  }, [searchParams]);

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      if (searchQuery !== (searchParams.get("search") || "")) {
        updateUrl({ search: searchQuery, page: "1" }); // Reset to page 1 on search
        setCurrentPage(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, updateUrl, searchParams]);

  // Stable empty initial data to prevent re-render loops
  const initialData = { data: [] as SalesInvoice[], total: 0 };

  const {
    data: invoicesData,
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(async () => {
      // Fetch as soon as we have the required data (don't wait for loading flags)
      if (!authUser?.tenantId || !selectedShopId) {
        return { data: [], total: 0 };
      }

      const result = await listInvoices(selectedShopId, undefined, {
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        customerName: debouncedSearchQuery || undefined,
      });

      // Handle both paginated and non-paginated responses
      if (Array.isArray(result)) {
        return { data: result, total: result.length };
      }
      return result;
    }, [selectedShopId, currentPage, authUser?.tenantId, statusFilter, debouncedSearchQuery]),
    [selectedShopId, currentPage, authUser?.tenantId, statusFilter, debouncedSearchQuery],
    initialData,
  );

  const invoices = invoicesData?.data || [];



  // Reload invoices when page becomes visible (e.g., after creating an invoice)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedShopId && authUser?.tenantId) {
        reload();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedShopId, authUser?.tenantId, reload]);

  // Transform error messages for better UX
  const displayError = error
    ? error.includes("Invalid shop")
      ? "This shop doesn't belong to your account. The shop may belong to a different tenant or you may need to log in with the correct account."
      : error.includes("Unauthorized") || error.includes("401")
        ? "Your session has expired. Please log in again."
        : error
    : null;

  const [collectingInvoice, setCollectingInvoice] =
    useState<SalesInvoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<{
    id: string;
    number: string;
  } | null>(null);

  // CRM Modals State
  const [timelineCustomerId, setTimelineCustomerId] = useState<string | null>(
    null,
  );
  const [timelineCustomerName, setTimelineCustomerName] = useState<string>("");
  const [followUpData, setFollowUpData] = useState<{
    customerId: string;
    customerName: string;
    defaultPurpose: string;
    defaultType: FollowUpType;
  } | null>(null);

  const handleCreateInvoice = () => {
    if (!selectedShopId) {
      alert("Please select a shop first");
      return;
    }
    router.push(`/sales/create?shopId=${selectedShopId}`);
  };



  const handleShare = (invoiceId: string, invoiceNumber: string) => {
    const shareUrl = `${window.location.origin}/print/invoice/${invoiceId}?shopId=${selectedShopId}`;
    const text = `Invoice ${invoiceNumber}`;
    if (navigator.share) {
      navigator.share({ title: text, url: shareUrl });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert("Invoice link copied to clipboard");
    }
  };

  const handleEdit = (invoiceId: string) => {
    if (!isOwner) {
      alert("Only owner can edit invoices");
      return;
    }
    router.push(`/sales/${invoiceId}/edit?shopId=${selectedShopId}`);
  };

  const handleCancel = (invoiceId: string, invoiceNumber: string) => {
    if (!isOwner) {
      alert("Only owner can cancel invoices");
      return;
    }
    setCancellingInvoice({ id: invoiceId, number: invoiceNumber });
  };

  const handleCollectPayment = (invoice: SalesInvoice) => {
    setCollectingInvoice(invoice);
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
          Sales
        </h1>
        <button
          onClick={handleCreateInvoice}
          disabled={!selectedShopId}
          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg"
        >
          + Create Invoice
        </button>
      </div>

      {/* Filters Section */}
      <div
        className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-xl p-4 mb-6 shadow-sm`}
      >
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* Shop Selector (Only if multiple) */}
          {hasMultipleShops && (
            <div className="flex-1 w-full">
              <label
                className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
              >
                Shop
              </label>
              <select
                value={selectedShopId}
                onChange={(e) => {
                  const newShopId = e.target.value;
                  selectShop(newShopId);
                  setCurrentPage(0);
                  setStatusFilter("ALL");
                  setSearchQuery("");
                  updateUrl({ page: "1", status: null, search: null });
                }}
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

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <label
              className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
            >
              Status
            </label>
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                updateUrl({ status: val, page: "1" }); // Reset to page 1 on filter change
                setCurrentPage(0);
              }}
            >
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

          {/* Search Input */}
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

          {(statusFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
                setCurrentPage(0);
                updateUrl({ status: null, search: null, page: "1" });
              }}
              className="px-4 py-2 text-sm font-medium text-teal-500 hover:text-teal-400 transition-colors whitespace-nowrap mb-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          className={`border px-4 py-3 rounded-lg mb-6 ${theme === "dark" ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {displayError}
        </div>
      )}
      {shopError && (
        <div
          className={`border px-4 py-3 rounded-lg mb-4 ${theme === "dark" ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {shopError}
        </div>
      )}
      {shops.length === 0 ? (
        <div className="mb-6">
          <NoShopsAlert variant="compact" />
        </div>
      ) : !selectedShopId ? (
        <div className="text-center py-12">
          <p
            className={`mb-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
          >
            Please select a shop from the filter above to view invoices
          </p>
        </div>
      ) : isLoading ? (
        <div
          className={`text-center py-12 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
        >
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <p
            className={`mb-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
          >
            No invoices found
          </p>
          <button
            onClick={handleCreateInvoice}
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold transition shadow-lg"
          >
            Create your first invoice
          </button>
        </div>
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
                  {[
                    "Invoice #",
                    "Customer",
                    "Amount",
                    "Payment",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`text-left px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-stone-300" : "text-black"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={`divide-y ${theme === "dark" ? "divide-white/10" : "divide-gray-200"}`}
              >
                {invoices.map((inv) => {
                  // Determine if row should have highlight (has balance > 0)
                  const hasBalance = inv.balanceAmount && inv.balanceAmount > 0;
                  const rowBgClass = hasBalance
                    ? theme === "dark"
                      ? "bg-amber-500/5 hover:bg-amber-500/10"
                      : "bg-amber-50 hover:bg-amber-100/50"
                    : theme === "dark"
                      ? "hover:bg-white/5"
                      : "hover:bg-gray-50";

                  return (
                    <tr key={inv.id} className={`transition ${rowBgClass}`}>
                      <td
                        className={`px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
                      >
                        {inv.invoiceNumber}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-300" : "text-black"}`}
                      >
                        {inv.customerName || "-"}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-white" : "text-black"}`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold">
                            ₹
                            {inv.totalAmount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {inv.paidAmount !== undefined && (
                            <div
                              className={`text-xs ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                            >
                              Paid: ₹
                              {inv.paidAmount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                          {inv.balanceAmount !== undefined && (
                            <div
                              className={`text-xs font-semibold ${
                                inv.balanceAmount > 0
                                  ? theme === "dark"
                                    ? "text-red-400"
                                    : "text-red-600"
                                  : theme === "dark"
                                    ? "text-green-400"
                                    : "text-green-600"
                              }`}
                            >
                              Balance: ₹
                              {inv.balanceAmount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_BADGES[inv.paymentMode]}`}
                        >
                          {inv.paymentMode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            inv.status === "VOIDED"
                              ? STATUS_COLORS["VOIDED"]
                              : inv.paymentStatus
                                ? PAYMENT_STATUS_COLORS[inv.paymentStatus]
                                : STATUS_COLORS[inv.status]
                          }`}
                        >
                          {inv.status === "VOIDED"
                            ? "VOIDED"
                            : inv.paymentStatus || inv.status}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                      >
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Primary Action: View */}
                          <button
                            onClick={() =>
                              router.push(
                                `/sales/${inv.id}?shopId=${selectedShopId}`,
                              )
                            }
                            title="View Invoice"
                            className="px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-500/30 transition flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>

                          {/* Secondary Action: Print (Inline) */}
                          {inv.status !== "VOIDED" && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/print/invoice/${inv.id}?shopId=${selectedShopId}`,
                                )
                              }
                              title="Print Invoice"
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition text-gray-600 dark:text-stone-400"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {/* More Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition text-gray-500 dark:text-gray-400">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-white dark:bg-stone-900 border-gray-200 dark:border-stone-800"
                            >
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Collect Payment */}
                              {inv.balanceAmount && inv.balanceAmount > 0 ? (
                                <DropdownMenuItem
                                  onClick={() => handleCollectPayment(inv)}
                                  className="text-green-600 dark:text-green-400 font-medium"
                                >
                                  <IndianRupee className="w-4 h-4 mr-2" />
                                  Collect Payment
                                </DropdownMenuItem>
                              ) : null}

                              {/* Share */}
                              {inv.status !== "VOIDED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleShare(inv.id, inv.invoiceNumber)
                                  }
                                >
                                  <Share2 className="w-4 h-4 mr-2" />
                                  Share Invoice
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* CRM Actions */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setTimelineCustomerId(inv.customerId || "");
                                  setTimelineCustomerName(
                                    inv.customerName || "Customer",
                                  );
                                }}
                              >
                                <History className="w-4 h-4 mr-2" />
                                View History
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setFollowUpData({
                                    customerId: inv.customerId || "",
                                    customerName:
                                      inv.customerName || "Customer",
                                    defaultPurpose: `Follow up on invoice ${inv.invoiceNumber}`,
                                    defaultType: "PHONE_CALL",
                                  });
                                }}
                              >
                                <Phone className="w-4 h-4 mr-2" />
                                Add Follow-up
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Admin Actions */}
                              {isOwner &&
                                (inv.status === "PAID" ||
                                  inv.status === "CREDIT") && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleEdit(inv.id)}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleCancel(inv.id, inv.invoiceNumber)
                                      }
                                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Cancel Invoice
                                    </DropdownMenuItem>
                                  </>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {(invoicesData?.total || 0) > PAGE_SIZE && (
            <div
              className={`mt-4 flex items-center justify-between px-4 py-3 rounded-lg border ${
                theme === "dark"
                  ? "border-white/10 bg-white/5"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div
                className={`text-sm ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}
              >
                Showing {currentPage * PAGE_SIZE + 1} to{" "}
                {Math.min((currentPage + 1) * PAGE_SIZE, invoicesData?.total || 0)} of{" "}
                {invoicesData?.total || 0} invoices
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const next = Math.max(0, currentPage - 1);
                    setCurrentPage(next);
                    updateUrl({ page: (next + 1).toString() });
                  }}
                  disabled={currentPage === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    currentPage === 0
                      ? theme === "dark"
                        ? "bg-white/5 text-stone-600 cursor-not-allowed"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : theme === "dark"
                        ? "bg-white/10 hover:bg-white/20 text-stone-300"
                        : "bg-white hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}>
                    Page
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={Math.ceil((invoicesData?.total || 0) / PAGE_SIZE)}
                    defaultValue={currentPage + 1}
                    key={currentPage}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        const maxPages = Math.ceil((invoicesData?.total || 0) / PAGE_SIZE);
                        if (!isNaN(val) && val >= 1 && val <= maxPages) {
                          setCurrentPage(val - 1);
                          updateUrl({ page: val.toString() });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      const maxPages = Math.ceil((invoicesData?.total || 0) / PAGE_SIZE);
                      if (!isNaN(val) && val >= 1 && val <= maxPages) {
                        setCurrentPage(val - 1);
                        updateUrl({ page: val.toString() });
                      } else {
                        e.target.value = (currentPage + 1).toString();
                      }
                    }}
                    className={`w-16 px-2 py-1 text-center rounded border focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                      theme === "dark"
                        ? "bg-stone-900 border-white/10 text-stone-200"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  />
                  <span className={`text-sm ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}>
                    of {Math.ceil((invoicesData?.total || 0) / PAGE_SIZE)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const next = currentPage + 1;
                    setCurrentPage(next);
                    updateUrl({ page: (next + 1).toString() });
                  }}
                  disabled={(currentPage + 1) * PAGE_SIZE >= (invoicesData?.total || 0)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    (currentPage + 1) * PAGE_SIZE >= (invoicesData?.total || 0)
                      ? theme === "dark"
                        ? "bg-white/5 text-stone-600 cursor-not-allowed"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : theme === "dark"
                        ? "bg-white/10 hover:bg-white/20 text-stone-300"
                        : "bg-white hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectingInvoice && (
        <CollectPaymentModal
          invoiceId={collectingInvoice.id}
          balanceAmount={collectingInvoice.balanceAmount || 0}
          customerName={collectingInvoice.customerName || "Customer"}
          isOpen={!!collectingInvoice}
          onClose={() => setCollectingInvoice(null)}
          onSuccess={() => {
            reload();
          }}
        />
      )}

      {/* Cancel Invoice Modal */}
      {cancellingInvoice && (
        <CancelInvoiceModal
          invoiceId={cancellingInvoice.id}
          invoiceNumber={cancellingInvoice.number}
          isOpen={!!cancellingInvoice}
          onClose={() => setCancellingInvoice(null)}
          onSuccess={() => {
            setCancellingInvoice(null);
            reload();
          }}
        />
      )}

      {/* CRM Modals */}
      <CustomerTimelineDrawer
        isOpen={!!timelineCustomerId}
        customerId={timelineCustomerId || ""}
        customerName={timelineCustomerName}
        onClose={() => {
          setTimelineCustomerId(null);
          setTimelineCustomerName("");
        }}
      />

      {followUpData && (
        <AddFollowUpModal
          isOpen={!!followUpData}
          customerId={followUpData.customerId || ""}
          customerName={followUpData.customerName || "Customer"}
          defaultPurpose={followUpData.defaultPurpose}
          defaultType={followUpData.defaultType}
          onClose={() => setFollowUpData(null)}
          onSuccess={() => {
            // refresh something if needed
          }}
        />
      )}
    </div>
  );
}
