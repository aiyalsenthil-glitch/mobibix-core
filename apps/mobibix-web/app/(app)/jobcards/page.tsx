"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listJobCards,
  updateJobCardStatus,
  deleteJobCard,
  type JobCard,
  type JobStatus,
} from "@/services/jobcard.api";
import { JobCardModal } from "./JobCardModal";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { NoShopsAlert } from "../components/NoShopsAlert";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";
import { JobCardsTabs } from "@/components/jobcards/JobCardsTabs";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";

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
};

/**
 * Valid state transitions matrix (mirrors backend validation)
 * Only these transitions are allowed per status
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ["ASSIGNED", "DIAGNOSING", "CANCELLED"],
  ASSIGNED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["WAITING_APPROVAL", "WAITING_FOR_PARTS", "IN_PROGRESS", "CANCELLED"],
  WAITING_APPROVAL: ["APPROVED", "CANCELLED"],
  APPROVED: ["WAITING_FOR_PARTS", "IN_PROGRESS", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "WAITING_FOR_PARTS", "CANCELLED"],
  READY: ["DELIVERED", "RETURNED", "IN_PROGRESS"],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  RETURNED: [], // Terminal state
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
    isLoadingShops,
    error: shopsError,
    selectShop,
    hasMultipleShops,
  } = useShop();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);

  // CRM Modals State
  const [timelineCustomerId, setTimelineCustomerId] = useState<string | null>(null);
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

  // Use modern hook for async data loading with built-in race condition prevention
  const {
    data: jobCards = [],
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(
      () =>
        selectedShopId ? listJobCards(selectedShopId) : Promise.resolve([]),
      [selectedShopId],
    ),
    [selectedShopId],
    [] as JobCard[], // Initial data
  );

  const handleStatusChange = async (job: JobCard, status: JobStatus) => {
    // 🚨 CRITICAL VALIDATION
    if (status === 'READY') {
      if (!job.finalCost && !job.estimatedCost) {
        alert("Cannot mark job READY without cost.\n\nPlease edit the job card and add Final Cost or Estimated Cost first.");
        return;
      }
    }

    // 💰 INTERCEPT DELIVERED STATUS FOR PAYMENT
    if (status === 'DELIVERED') {
      // Find valid invoice (not voided)
      // Note: Backend returns invoices array due to our recent change
      const invoice = job.invoices?.find(
        (i) => i.status !== 'VOIDED' && i.status !== 'PAID'
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
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handlePaymentSuccess = async () => {
     if (!deliveringJob) return;
     
     try {
       // After payment, update status to DELIVERED
       await updateJobCardStatus(selectedShopId, deliveringJob.job.id, 'DELIVERED');
       setDeliveringJob(null);
       reload();
     } catch (err: any) {
        alert("Payment collected, but failed to update status to DELIVERED: " + err.message);
     }
  };

  const handleDelete = async (jobCardId: string) => {
    if (!confirm("Are you sure you want to delete this job card?")) return;

    try {
      await deleteJobCard(selectedShopId, jobCardId);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to delete job card");
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

      {/* Shop Filter Section - Only show if multiple shops */}
      {isLoadingShops ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-black dark:text-stone-300">Loading shops...</div>
        </div>
      ) : shops.length === 0 ? null : (
        hasMultipleShops && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-stone-300" : "text-black"}`}
                >
                  Select Shop
                </label>
                <select
                  value={selectedShopId}
                  onChange={(e) => selectShop(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                    theme === "dark"
                      ? "bg-stone-900/40 border-white/20 text-white"
                      : "bg-white border-gray-300 text-black"
                  } border`}
                >
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )
      )}

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
                        const allowedTransitions = getAllowedTransitions(job.status);
                        const isTerminal = allowedTransitions.length === 0;
                        
                        return (
                          <select
                            value={job.status}
                            onChange={(e) =>
                              handleStatusChange(
                                job,
                                e.target.value as JobStatus,
                              )
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[job.status]} focus:outline-none ${isTerminal ? 'cursor-not-allowed' : 'cursor-pointer'} appearance-none`}
                            disabled={isTerminal}
                            title={isTerminal ? 'Terminal state - no further changes allowed' : 'Change status'}
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

                        <button
                          onClick={() => router.push(`/jobcards/${job.id}`)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition text-blue-600 dark:text-blue-400"
                          title="Open Details & Parts"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => {
                            setTimelineCustomerId(job.customerId || "");
                            setTimelineCustomerName(job.customerName || "Customer");
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                          title="View History"
                        >
                          🕒
                        </button>
                        <button
                          onClick={() => {
                            setFollowUpData({
                              customerId: job.customerId || "",
                              customerName: job.customerName || "Customer",
                              defaultPurpose: `Follow up on job card #${job.jobNumber} (${job.deviceBrand} ${job.deviceModel})`,
                              defaultType: "PHONE_CALL",
                            });
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                          title="Add Follow-up"
                        >
                          📋
                        </button>
                        <a
                          href={`/track/${job.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                          title="Public Track"
                        >
                          🔗
                        </a>
                        <a
                          href={`/print/jobcard/${job.id}?shopId=${selectedShopId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                          title="Print"
                        >
                          🖨️
                        </a>
                        {/* New Print Invoice Button */}
                        {(() => {
                          const invoice = job.invoices?.find((i) => i.status !== "VOIDED");
                          if (invoice) {
                            return (
                              <a
                                href={`/print/invoice/${invoice.id}?noQr=true`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                                title="Print Repair Invoice"
                              >
                                🧾
                              </a>
                            );
                          }
                          return null;
                        })()}
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-red-500/20 rounded-lg transition"
                          title="Delete"
                        >
                          🗑️
                        </button>
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
    </div>
  );
}
