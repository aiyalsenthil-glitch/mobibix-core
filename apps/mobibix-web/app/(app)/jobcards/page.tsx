"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  listJobCards,
  updateJobCardStatus,
  deleteJobCard,
  type JobCard,
  type JobStatus,
} from "@/services/jobcard.api";
import { hasSessionHint } from "@/services/auth.api";
import { JobCardModal } from "./JobCardModal";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { NoShopsAlert } from "../components/NoShopsAlert";
import { RepairBillingModal } from "@/components/repair/RepairBillingModal";
import { generateRepairBill } from "@/services/jobcard.api";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";
import { JobCardsTabs } from "@/components/jobcards/JobCardsTabs";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
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
  Trash2,
  Edit,
  Phone,
  ExternalLink,
  History,
  FileText,
  PlusCircle,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { AddPartModal } from "./AddPartModal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS: JobStatus[] = [
  "RECEIVED",
  "ASSIGNED",
  "DIAGNOSING",
  "WAITING_APPROVAL",
  "APPROVED",
  "WAITING_FOR_PARTS",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "SCRAPPED",
];

const STATUS_COLORS: Record<JobStatus, string> = {
  RECEIVED:
    "bg-teal-200 text-teal-900 border-teal-400 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-500/50",
  ASSIGNED:
    "bg-indigo-200 text-indigo-900 border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/50",
  DIAGNOSING:
    "bg-purple-200 text-purple-900 border-purple-400 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/50",
  WAITING_APPROVAL:
    "bg-yellow-200 text-yellow-900 border-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/50",
  APPROVED:
    "bg-blue-200 text-blue-900 border-blue-400 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/50",
  WAITING_FOR_PARTS:
    "bg-amber-200 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/50",
  IN_PROGRESS:
    "bg-orange-200 text-orange-900 border-orange-400 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/50",
  READY:
    "bg-green-200 text-green-900 border-green-400 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/50",
  DELIVERED:
    "bg-gray-300 text-gray-900 border-gray-500 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/50",
  CANCELLED:
    "bg-rose-200 text-rose-900 border-rose-400 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/50",
  RETURNED:
    "bg-pink-200 text-pink-900 border-pink-400 dark:bg-pink-500/20 dark:text-pink-200 dark:border-pink-500/50",
  SCRAPPED:
    "bg-stone-300 text-stone-900 border-stone-500 dark:bg-stone-500/20 dark:text-stone-300 dark:border-stone-500/50",
};

/**
 * Valid state transitions matrix (mirrors backend validation)
 * Only these transitions are allowed per status
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ["ASSIGNED", "DIAGNOSING", "CANCELLED"],
  ASSIGNED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: [
    "WAITING_APPROVAL",
    "WAITING_FOR_PARTS",
    "IN_PROGRESS",
    "CANCELLED",
  ],
  WAITING_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["WAITING_FOR_PARTS", "IN_PROGRESS", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "WAITING_FOR_PARTS", "CANCELLED", "SCRAPPED"],
  READY: ["DELIVERED", "RETURNED", "IN_PROGRESS", "SCRAPPED"],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  RETURNED: [], // Terminal state
  SCRAPPED: [], // Terminal state
};

/**
 * Get allowed status transitions for a given current status
 */
function getAllowedTransitions(currentStatus: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

export default function JobCardsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    shops,
    selectedShopId,
    selectedShop,
    isLoadingShops,
    error: shopsError,
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [selectedJobForPart, setSelectedJobForPart] = useState<JobCard | null>(
    null,
  );

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

  // Payment Collection State
  const [deliveringJob, setDeliveringJob] = useState<{
    job: JobCard;
    invoiceId: string;
    balanceAmount: number;
  } | null>(null);

  const [billingJob, setBillingJob] = useState<JobCard | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [customerNameFilter, setCustomerNameFilter] = useState<string>("");
  const [debouncedCustomerName, setDebouncedCustomerName] = useState("");

  // Simple debounce for customer name
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerName(customerNameFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [customerNameFilter]);

  // Stable empty initial data to prevent re-render loops
  const initialData: JobCard[] = [];

  // Use modern hook for async data loading with built-in race condition prevention
  const {
    data: jobCards = [],
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(
      () =>
        selectedShopId
          ? listJobCards(selectedShopId, {
              status: statusFilter === "ALL" ? undefined : (statusFilter as JobStatus),
              customerName: debouncedCustomerName || undefined,
            })
          : Promise.resolve([]),
      [selectedShopId, statusFilter, debouncedCustomerName],
    ),
    [selectedShopId, statusFilter, debouncedCustomerName],
    initialData,
  );

  const handleStatusChange = async (job: JobCard, status: JobStatus) => {
    // 💸 ADVANCE REFUND CHECK FOR CANCELLATION
    if (["CANCELLED", "RETURNED", "SCRAPPED"].includes(status)) {
      const advancePaid = job.advancePaid || 0;
      if (advancePaid > 0) {
        const refundConfirm = confirm(
          `This job has an active advance of ₹${advancePaid}. To move it to ${status}, the advance must be refunded.\n\nClick OK to automatically log a CASH refund of ₹${advancePaid} and proceed.`
        );
        if (!refundConfirm) return;
        try {
          await updateJobCardStatus(selectedShopId, job.id, status, { amount: advancePaid, mode: "CASH" });
          reload();
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : "Failed to update status");
        }
        return;
      }
    }
    // 🚨 CRITICAL VALIDATION
    if (status === "READY") {
      if (!job.finalCost && !job.estimatedCost) {
        alert(
          "Cannot mark job READY without cost.\n\nPlease edit the job card and add Final Cost or Estimated Cost first.",
        );
        return;
      }
    }

    // 💰 INTERCEPT DELIVERED STATUS FOR PAYMENT
    if (status === "DELIVERED") {
      // Find valid invoice (not voided)
      // Note: Backend returns invoices array due to our recent change
      const invoice = job.invoices?.find(
        (i) => i.status !== "VOIDED" && i.status !== "PAID",
      );

      if (invoice) {
        // Redirect to Invoice Page for Billing/Payment
        router.push(`/sales/${invoice.id}?shopId=${selectedShopId}`);
        return;
      }
      // If no valid invoice found (shouldn't happen if READY), proceed or let backend block
    }

    try {
      await updateJobCardStatus(selectedShopId, job.id, status);
      // Reload job cards after status change
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handlePaymentSuccess = async () => {
    if (!deliveringJob || !selectedShopId) return;

    try {
      await updateJobCardStatus(
        selectedShopId,
        deliveringJob.job.id,
        "DELIVERED",
      );
      setDeliveringJob(null);
      reload();
    } catch (err: unknown) {
      alert(
        "Payment collected, but failed to update status to DELIVERED: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  const handleBillSubmit = async (dto: any) => {
    if (!billingJob || !selectedShopId) return;
    try {
      await generateRepairBill(selectedShopId, billingJob.id, dto);
      setBillingJob(null);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate bill");
    }
  };

  const handleDelete = async (jobCardId: string) => {
    if (!confirm("Are you sure you want to delete this job card?")) return;

    try {
      await deleteJobCard(selectedShopId, jobCardId);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete job card");
    }
  };

  const handleAddNew = () => {
    router.push("/jobcards/create");
  };

  const handleEdit = (jobCard: JobCard) => {
    setSelectedJobCard(jobCard);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedJobCard(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Job Cards
        </h1>
        <button
          onClick={handleAddNew}
          disabled={!selectedShopId}
          className="px-6 py-2 bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg"
        >
          + Create New Job Card
        </button>
      </div>

      <JobCardsTabs />

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
                value={selectedShopId || ""}
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

          {/* Status Filter */}
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
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
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
                placeholder="Search Customer Name..."
                value={customerNameFilter}
                onChange={(e) => setCustomerNameFilter(e.target.value)}
                className={`pl-10 pr-10 ${theme === "dark" ? "bg-stone-900 border-white/10 text-white placeholder:text-stone-600" : "bg-gray-50 border-gray-300 text-black"}`}
              />
              {customerNameFilter && (
                <button
                  onClick={() => setCustomerNameFilter("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {(statusFilter !== "ALL" || customerNameFilter) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setCustomerNameFilter("");
              }}
              className="px-4 py-2 text-sm font-medium text-teal-500 hover:text-teal-400 transition-colors whitespace-nowrap mb-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>


      {(error || shopsError) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          {error || shopsError}
        </div>
      )}

      {shops.length === 0 ? (
        <div className="mb-6">
          <NoShopsAlert variant="compact" />
        </div>
      ) : !selectedShopId ? (
        <div className="text-center py-12">
          <p className="text-black dark:text-stone-400 font-medium mb-4">
            Select a shop from the filter above to view job cards
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-black dark:text-stone-400 font-medium">
          Loading job cards...
        </div>
      ) : !jobCards || jobCards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-black dark:text-stone-400 font-medium mb-4">
            No job cards found
          </p>
          <button
            onClick={handleAddNew}
            className="px-6 py-2 bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-lg font-bold transition shadow-lg"
          >
            Create your first job card
          </button>
        </div>
      ) : (
        <div
          className={`bg-white dark:bg-white/5 border ${theme === "dark" ? "border-white/10" : "border-gray-300"} rounded-lg overflow-hidden shadow-sm`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-200 border-gray-300"} border-b`}
              >
                <tr>
                  {[
                    "Job No.",
                    "Customer Name",
                    "Phone",
                    "Device",
                    "Status",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`text-left px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-stone-200" : "text-black"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={`divide-y ${theme === "dark" ? "divide-white/10" : "divide-gray-300"}`}
              >
                {(jobCards || []).map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition"
                  >
                    <td
                      className={`px-4 py-3 text-sm font-medium ${theme === "dark" ? "text-white" : "text-black"}`}
                    >
                      {job.jobNumber}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-200" : "text-black"}`}
                    >
                      {job.customerName}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-black"}`}
                    >
                      {job.customerPhone}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-200" : "text-black"}`}
                    >
                      {job.deviceBrand} {job.deviceModel}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const allowedTransitions = getAllowedTransitions(
                          job.status,
                        );
                        const isTerminal = allowedTransitions.length === 0;

                        return (
                          <select
                            value={job.status || ""}
                            onChange={(e) =>
                              handleStatusChange(
                                job,
                                e.target.value as JobStatus,
                              )
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[job.status]} focus:outline-none ${isTerminal ? "cursor-not-allowed" : "cursor-pointer"} appearance-none`}
                            disabled={isTerminal}
                            title={
                              isTerminal
                                ? "Terminal state - no further changes allowed"
                                : "Change status"
                            }
                          >
                            {/* Current status always shown */}
                            <option
                              value={job.status}
                              className="bg-white dark:bg-stone-900 text-black dark:text-white"
                            >
                              {job.status.replace(/_/g, " ")}
                            </option>

                            {/* Only show allowed transitions */}
                            {allowedTransitions.map((status) => (
                              <option
                                key={status}
                                value={status}
                                className="bg-white dark:bg-stone-900 text-black dark:text-white"
                              >
                                → {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-black dark:text-white">
                        {/* Primary Action: View */}
                        <button
                          onClick={() => router.push(`/jobcards/${job.id}`)}
                          className="px-3 py-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-500/30 transition flex items-center gap-2"
                          title="Open Details"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>

                        {/* Quick Action: Add Part */}
                        {![
                          "READY",
                          "DELIVERED",
                          "CANCELLED",
                          "RETURNED",
                          "SCRAPPED",
                        ].includes(job.status) && (
                          <button
                            onClick={() => setSelectedJobForPart(job)}
                            className="px-2 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 rounded-md text-xs font-bold hover:bg-orange-200 dark:hover:bg-orange-500/30 transition flex items-center gap-1"
                            title="Add Part"
                          >
                            <PlusCircle className="w-3 h-3" /> Part
                          </button>
                        )}

                        {/* Quick Action: Mark Ready */}
                        {![
                          "READY",
                          "DELIVERED",
                          "CANCELLED",
                          "RETURNED",
                          "SCRAPPED",
                        ].includes(job.status) && (
                          <button
                            onClick={() => setBillingJob(job)}
                            className="px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-md text-xs font-bold hover:bg-green-200 dark:hover:bg-green-500/30 transition flex items-center gap-1"
                            title="Mark Ready & Generate Bill"
                          >
                            <span>✅</span> Ready
                          </button>
                        )}

                        {/* Secondary Actions: Dropdown */}
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

                            <DropdownMenuItem onClick={() => handleEdit(job)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Job
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setTimelineCustomerId(job.customerId || "");
                                setTimelineCustomerName(
                                  job.customerName || "Customer",
                                );
                              }}
                            >
                              <History className="w-4 h-4 mr-2" />
                              View History
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => setSelectedJobForPart(job)}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              <span>Add Part</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setBillingJob(job);
                              }}
                            >
                              <ReceiptText className="mr-2 h-4 w-4" />
                              <span>Generate Bill</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setFollowUpData({
                                  customerId: job.customerId || "",
                                  customerName: job.customerName || "Customer",
                                  defaultPurpose: `Follow up on job card #${job.jobNumber} (${job.deviceBrand} ${job.deviceModel})`,
                                  defaultType: "PHONE_CALL",
                                });
                              }}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Add Follow-up
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild>
                              <a
                                href={`/track/${job.publicToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Public Track
                              </a>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <a
                                href={`/print/jobcard/${job.id}?shopId=${selectedShopId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center"
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print Job Card
                              </a>
                            </DropdownMenuItem>

                            {(() => {
                              const invoice = job.invoices?.find(
                                (i) => i.status !== "VOIDED",
                              );
                              if (invoice) {
                                return (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={`/print/invoice/${invoice.id}?noQr=true`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center"
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      Print Invoice
                                    </a>
                                  </DropdownMenuItem>
                                );
                              }
                              return null;
                            })()}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDelete(job.id)}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

      {/* Floating Action Button */}
      {selectedShopId && (
        <button
          onClick={handleAddNew}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition flex items-center justify-center text-xl font-bold z-40"
          title="Create new job card"
        >
          +
        </button>
      )}

      {isModalOpen && (
        <JobCardModal
          shopId={selectedShopId}
          jobCard={selectedJobCard}
          onClose={handleModalClose}
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
          customerId={followUpData.customerId}
          customerName={followUpData.customerName}
          defaultPurpose={followUpData.defaultPurpose}
          defaultType={followUpData.defaultType}
          onClose={() => setFollowUpData(null)}
          onSuccess={() => {
            // refresh something if needed
          }}
        />
      )}

      {/* Payment Collection Modal */}
      {deliveringJob && (
        <CollectPaymentModal
          isOpen={true}
          invoiceId={deliveringJob.invoiceId}
          balanceAmount={deliveringJob.balanceAmount}
          customerName={deliveringJob.job.customerName}
          onClose={() => setDeliveringJob(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Interactive Billing Modal */}
      {billingJob && (
        <RepairBillingModal
          isOpen={!!billingJob}
          onClose={() => setBillingJob(null)}
          onSubmit={handleBillSubmit}
          job={billingJob}
          shopId={selectedShopId!}
        />
      )}
      {selectedJobForPart && selectedShopId && (
        <AddPartModal
          shopId={selectedShopId}
          jobId={selectedJobForPart.id}
          onClose={() => setSelectedJobForPart(null)}
          onSuccess={() => {
            reload();
            setSelectedJobForPart(null);
          }}
        />
      )}
    </div>
  );
}
