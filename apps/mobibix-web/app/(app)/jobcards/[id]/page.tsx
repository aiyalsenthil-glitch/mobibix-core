"use client";

import { useCallback, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getJobCard,
  updateJobCardStatus,
  reopenJobCard,
  removeJobCardPart,
  JobStatus,
  createWarrantyJob,
  type RepairBillDto,
} from "@/services/jobcard.api";
import { useShop } from "@/context/ShopContext";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { sendWhatsAppMessage } from "@/services/whatsapp.api";
import { AdvanceModal } from "./AdvanceModal";
import { AddPartModal } from "../AddPartModal";

// Helper for status colors (reused)
const STATUS_COLORS: Record<JobStatus, string> = {
  RECEIVED:
    "bg-teal-200 text-teal-900 border-teal-400 dark:bg-teal-500/20 dark:text-teal-200",
  ASSIGNED:
    "bg-indigo-200 text-indigo-900 border-indigo-400 dark:bg-indigo-500/20 dark:text-indigo-200",
  DIAGNOSING:
    "bg-purple-200 text-purple-900 border-purple-400 dark:bg-purple-500/20 dark:text-purple-200",
  WAITING_APPROVAL:
    "bg-yellow-200 text-yellow-900 border-yellow-400 dark:bg-yellow-500/20 dark:text-yellow-200",
  APPROVED:
    "bg-blue-200 text-blue-900 border-blue-400 dark:bg-blue-500/20 dark:text-blue-200",
  WAITING_FOR_PARTS:
    "bg-amber-200 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-200",
  IN_PROGRESS:
    "bg-orange-200 text-orange-900 border-orange-400 dark:bg-orange-500/20 dark:text-orange-200",
  READY:
    "bg-green-200 text-green-900 border-green-400 dark:bg-green-500/20 dark:text-green-200",
  DELIVERED:
    "bg-gray-300 text-gray-900 border-gray-500 dark:bg-gray-500/20 dark:text-gray-300",
  CANCELLED:
    "bg-rose-200 text-rose-900 border-rose-400 dark:bg-rose-500/20 dark:text-rose-200",
  RETURNED:
    "bg-pink-200 text-pink-900 border-pink-400 dark:bg-pink-500/20 dark:text-pink-200",
  SCRAPPED:
    "bg-stone-300 text-stone-900 border-stone-500 dark:bg-stone-500/20 dark:text-stone-300",
};

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ["ASSIGNED", "DIAGNOSING", "CANCELLED"],
  ASSIGNED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["WAITING_APPROVAL", "WAITING_FOR_PARTS", "IN_PROGRESS", "CANCELLED"],
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

function getAllowedTransitions(currentStatus: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

import { RepairBillingModal } from "@/components/repair/RepairBillingModal";
import { generateRepairBill } from "@/services/jobcard.api";

export default function JobCardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { authUser: user } = useAuth(); // To check role
  const { selectedShopId, selectedShop } = useShop();
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [isReadyConfirmOpen, setIsReadyConfirmOpen] = useState(false);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [isWarrantyConfirmOpen, setIsWarrantyConfirmOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Advance Modals
  const [isAddAdvanceModalOpen, setIsAddAdvanceModalOpen] = useState(false);
  const [isRefundAdvanceModalOpen, setIsRefundAdvanceModalOpen] =
    useState(false);

  const isOwner = user?.role?.toLowerCase() === "owner";
  const isPro = user?.planCode === "MOBIBIX_PRO" || user?.planCode === "GYM_PRO";

  // Load Job Details
  const {
    data: job,
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(
      () =>
        selectedShopId && params.id
          ? getJobCard(selectedShopId, params.id as string)
          : Promise.resolve(null),
      [selectedShopId, params.id],
    ),
    [selectedShopId, params.id],
    null,
  );

  // FINANCIAL CALCULATIONS
  const partsTotal =
    (job?.parts?.reduce(
      (sum, p) => sum + (p.product?.salePrice || 0) * p.quantity,
      0,
    ) || 0) / 100;

  // Use finalCost (Invoice Total) if available, otherwise use Estimated + Parts
  const totalRevenue = job?.finalCost
    ? job.finalCost / 100
    : (job?.estimatedCost || 0) + partsTotal;

  // Derived Labor Cost: If billed, it's (Final - Parts), otherwise Estimated
  const laborCost = job?.finalCost
    ? totalRevenue - partsTotal
    : job?.estimatedCost || 0;

  const balanceDue = totalRevenue - (job?.advancePaid || 0);

  const handleStatusChange = async (status: JobStatus) => {
    if (!job || !selectedShopId) return;

    // 🛡️ CANCEL CONFIRMATION
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
        } catch (err: any) {
          alert(err.message || "Failed to update status");
        }
        return;
      }

      if (
        !confirm(
          `Move job to ${status}? Any linked invoice will be voided. This action cannot be easily undone.`
        )
      ) {
        return;
      }
    }

    // 🛡️ READY INTERCEPTION: Show confirmation first (which then opens billing)
    if (status === "READY") {
      setIsReadyConfirmOpen(true);
      return;
    }

    // 🛑 DELIVERY GUARD: Ensure invoice exists
    if (status === "DELIVERED") {
      const validInvoice = job.invoices?.find((i) => i.status !== "VOIDED");

      if (!validInvoice) {
        setIsBillingModalOpen(true);
        return;
      }

      if (validInvoice.status === "UNPAID") {
        router.push(`/sales/${validInvoice.id}?shopId=${selectedShopId}`);
        return;
      }
    }

    try {
      await updateJobCardStatus(selectedShopId, job.id, status);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleBillSubmit = async (dto: RepairBillDto) => {
    if (!job || !selectedShopId) return;
    try {
      await generateRepairBill(selectedShopId, job.id, dto);
      // Refresh to show invoice and new status
      reload();
      setIsBillingModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate bill");
    }
  };

  const handleReopen = async () => {
    if (!job || !selectedShopId) return;

    try {
      await reopenJobCard(selectedShopId, job.id);
      setIsReopenConfirmOpen(false);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reopen job");
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!confirm("Remove this part? Stock will be restored.")) return;
    try {
      await removeJobCardPart(selectedShopId!, job!.id, partId);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove part");
    }
  };

  const handleCreateWarranty = async () => {
    if (!job || !selectedShopId) return;
    try {
      const newJob = await createWarrantyJob(selectedShopId, job.id);
      setIsWarrantyConfirmOpen(false);
      // Redirect to new job
      router.push(`/jobcards/${newJob.id}?shopId=${selectedShopId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create warranty job");
      setIsWarrantyConfirmOpen(false);
    }
  };

  if (isLoading)
    return <div className="p-8 text-center">Loading job details...</div>;
  if (error || !job)
    return (
      <div className="p-8 text-center text-red-500">
        Error: {error || "Job not found"}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="flex items-center gap-2 text-3xl font-bold dark:text-white">
              Job #{job.jobNumber}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold border ${STATUS_COLORS[job.status] || "bg-gray-200"}`}
            >
              {job.status.replace(/_/g, " ")}
            </span>
            {job.notes?.includes("Warranty rework") && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 border border-purple-300 rounded-full text-xs font-bold uppercase tracking-wider">
                Warranty Rework
              </span>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {job.deviceBrand} {job.deviceModel} • {job.customerName}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/jobcards")}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/10 dark:text-white transition"
          >
            Back
          </button>
          <a
            href={`/print/jobcard/${job.id}?shopId=${selectedShopId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
          >
            Print Job Card
          </a>
          {/* WhatsApp Send Button - Only allow for PRO users if status is READY and not already sent */}
          {isPro && job.status === "READY" && !job.whatsappSent && (
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              onClick={async () => {
                const variables = [
                  job.customerName,
                  job.shopName ?? "",
                  job.jobNumber,
                  job.deviceModel,
                ];
                try {
                  await sendWhatsAppMessage({
                    phone: job.customerPhone,
                    templateId: "job_status_ready_v1", // Assuming this is the ID for the templateKey
                    parameters: variables,
                  });
                  alert("WhatsApp alert sent!");
                  reload();
                } catch (err: unknown) {
                  alert(
                    err instanceof Error
                      ? err.message
                      : "Failed to send WhatsApp alert",
                  );
                }
              }}
            >
              📲 Send WhatsApp
            </button>
          )}
          {job.status === "CANCELLED" ? (
            <button
              onClick={() => setIsReopenConfirmOpen(true)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition"
            >
              ♻️ Reopen Job
            </button>
          ) : (
            <>
              {job.status === "DELIVERED" &&
                (job.warrantyDuration || 0) > 0 &&
                (() => {
                  const isWarrantyEnabled = (selectedShop as any)?.headerConfig?.enableWarrantyJobs;
                  if (!isWarrantyEnabled) return null;
                  
                  const deliveredAt = (job as any).deliveredAt ? new Date((job as any).deliveredAt) : null;
                  if (deliveredAt) {
                    const expiryDate = new Date(deliveredAt);
                    expiryDate.setDate(expiryDate.getDate() + (job.warrantyDuration || 0));
                    if (new Date() > expiryDate) return null; // Expired
                  }
                  
                  return (
                    <button
                      onClick={() => setIsWarrantyConfirmOpen(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition"
                      title="Create a free rework job under warranty"
                    >
                      🛡️ Warranty Job
                    </button>
                  );
                })()}
              {job.status !== "READY" &&
                job.status !== "DELIVERED" &&
                job.status !== "RETURNED" && (
                  <button
                    onClick={() => setIsReadyConfirmOpen(true)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition flex items-center gap-1.5 text-sm"
                  >
                    <span>✅</span> Mark Ready
                  </button>
                )}

              {job.status !== "DELIVERED" && job.status !== "RETURNED" && job.status !== "SCRAPPED" && job.status !== "CANCELLED" && (
                (() => {
                  const allowedTransitions = getAllowedTransitions(job.status);
                  if (allowedTransitions.length === 0) return null;
                  
                  return (
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold cursor-pointer outline-none transition"
                    >
                      <option value={job.status} disabled>
                        Change Status
                      </option>
                      {allowedTransitions.map((s) => (
                        <option key={s} value={s}>
                          {s === "CANCELLED" || s === "SCRAPPED" || s === "RETURNED" ? `${s} Job` : (s as string).replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  );
                })()
              )}
              {job.status === "READY" &&
                !job.invoices?.some((i) => i.status !== "VOIDED") && (
                  <button
                    onClick={() => setIsBillingModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition flex items-center gap-2"
                  >
                    <span>📜</span> Generate Bill
                  </button>
                )}
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Job Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* ISSUES CARD */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 dark:text-white">
              Diagnosis & Issues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs uppercase font-bold text-gray-500">
                  Complaint
                </label>
                <p className="mt-1 dark:text-gray-300">
                  {job.customerComplaint}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-gray-500">
                  Condition
                </label>
                <p className="mt-1 dark:text-gray-300">
                  {job.physicalCondition || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-gray-500">
                  Access
                </label>
                <p className="mt-1 dark:text-gray-300">
                  Password: {job.devicePassword || "None"}
                </p>
              </div>
              <div>
                <label className="text-xs uppercase font-bold text-gray-500">
                  Serial/IMEI
                </label>
                <p className="mt-1 dark:text-gray-300">
                  {job.deviceSerial || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* PARTS MANAGEMENT */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold dark:text-white">
                Parts & Material
              </h2>
              {!["READY", "DELIVERED", "CANCELLED", "RETURNED", "SCRAPPED"].includes(job.status) && (
                <button
                  onClick={() => setIsAddPartModalOpen(true)}
                  className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-sm font-semibold hover:bg-teal-100 transition"
                >
                  + Add Part
                </button>
              )}
            </div>

            {!job.parts || job.parts.length === 0 ? (
              <p className="text-gray-500 text-sm italic py-4 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                No parts added yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {job.parts.map((part) => (
                      <tr
                        key={part.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                      >
                        <td className="px-4 py-3 font-medium dark:text-gray-200">
                          {part.product?.name || "Unknown Product"}
                        </td>
                        <td className="px-4 py-3 dark:text-gray-300">
                          {part.quantity}
                        </td>
                        <td className="px-4 py-3 text-right dark:text-gray-300">
                          ₹{((part.product?.salePrice || 0) / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium dark:text-white">
                          ₹
                          {(
                            ((part.product?.salePrice || 0) / 100) *
                            part.quantity
                          ).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!["READY", "DELIVERED", "CANCELLED", "RETURNED", "SCRAPPED"].includes(job.status) && (
                            <button
                              onClick={() => handleRemovePart(part.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Remove Part (Restores Stock)"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* INVOICES */}
          {job.invoices && job.invoices.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4 dark:text-white">
                Invoices
              </h2>
              <div className="space-y-2">
                {job.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 transition"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          inv.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : inv.status === "VOIDED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold dark:text-white">
                        ₹{(inv.totalAmount / 100).toFixed(2)}
                      </span>
                      {inv.status !== "VOIDED" && (
                        <a
                          href={`/print/invoice/${inv.id}?noQr=true`}
                          target="_blank"
                          className="text-indigo-600 hover:underline text-sm"
                        >
                          Print
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Customer & Financials */}
        <div className="space-y-8">
          {/* CUSTOMER CARD */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Customer</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xl">
                {job.customerName.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg dark:text-white">
                  {job.customerName}
                </h3>
                <p className="text-gray-500 text-sm">{job.customerPhone}</p>
              </div>
            </div>
            <div className="pt-4 border-t dark:border-gray-800">
              <a
                href={`tel:${job.customerPhone}`}
                className="block w-full text-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 transition mb-2"
              >
                Start Call
              </a>
              {isPro && (
                <a
                  href={`https://wa.me/91${job.customerPhone}?text=Hi ${job.customerName}, regarding job #${job.jobNumber}`}
                  target="_blank"
                  className="block w-full text-center py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* FINANCIAL SUMMARY (VISIBLE TO ALL) */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4 dark:text-white">
              Financials
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <span>Labor Cost</span>
                <span className="font-semibold dark:text-gray-200">
                  ₹{laborCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <span>Parts Total</span>
                <span className="font-semibold dark:text-gray-200">
                  ₹{partsTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-teal-600 dark:text-teal-400">
                <span>Advance Paid</span>
                <span className="font-bold">
                  ₹{job.advancePaid?.toFixed(2) || "0.00"}
                </span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
              <div className="flex justify-between items-center text-lg font-bold text-gray-900 dark:text-white">
                <span>Balance Due</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsAddAdvanceModalOpen(true)}
                className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-bold hover:bg-green-100 transition flex items-center justify-center gap-1"
              >
                <span>💰</span> Add Advance
              </button>
              <button
                onClick={() => setIsRefundAdvanceModalOpen(true)}
                disabled={(job.advancePaid || 0) <= 0}
                className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                <span>💸</span> Refund
              </button>
            </div>
          </div>

          {/* PROFIT CARD (OWNER ONLY) */}
          {isOwner && job.profit !== undefined && (
            <div className="bg-linear-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">
                💰
              </div>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span>Job Profitability</span>
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded">
                  Private
                </span>
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-gray-300">
                  <span>Total Revenue</span>
                  <span className="font-medium text-white">
                    ₹{totalRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>Parts Cost</span>
                  <span className="font-medium text-red-200">
                    - ₹
                    {(
                      (job.parts?.reduce(
                        (sum, p) => sum + (p.costPrice || 0) * p.quantity,
                        0,
                      ) || 0) / 100
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-white/20 my-2"></div>
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Net Profit</span>
                  <span className="text-green-400">
                    ₹
                    {(
                      totalRevenue -
                      (job.parts?.reduce(
                        (sum, p) => sum + (p.costPrice || 0) * p.quantity,
                        0,
                      ) || 0) /
                        100
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Add Part Modal */}
      {isAddPartModalOpen && (
        <AddPartModal
          shopId={selectedShopId!}
          jobId={job.id}
          onClose={() => setIsAddPartModalOpen(false)}
          onSuccess={reload}
        />
      )}
      {/* Add Advance Modal */}
      {isAddAdvanceModalOpen && (
        <AdvanceModal
          type="ADD"
          shopId={selectedShopId!}
          jobId={job.id}
          currentAdvance={job.advancePaid || 0}
          onClose={() => setIsAddAdvanceModalOpen(false)}
          onSuccess={reload}
        />
      )}
      {/* Refund Advance Modal */}
      {isRefundAdvanceModalOpen && (
        <AdvanceModal
          type="REFUND"
          shopId={selectedShopId!}
          jobId={job.id}
          currentAdvance={job.advancePaid || 0}
          onClose={() => setIsRefundAdvanceModalOpen(false)}
          onSuccess={reload}
        />
      )}
      {/* READY CONFIRMATION MODAL */}
      {isReadyConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-md mx-4">
            <h2 className="text-xl font-bold dark:text-white mb-4">
              Ready to Mark Job Complete?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Before marking READY, do you need to add any spare parts to this
              job? You can also review and edit the labor charges in the next
              step.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 italic">
              Once the bill is generated, the job will be marked as READY or
              DELIVERED.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsReadyConfirmOpen(false);
                  setIsAddPartModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                + Add Parts
              </button>
              <button
                onClick={() => {
                  setIsReadyConfirmOpen(false);
                  setIsBillingModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
              >
                Proceed to Billing
              </button>
              <button
                onClick={() => setIsReadyConfirmOpen(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* REOPEN CONFIRMATION MODAL */}
      {isReopenConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-md mx-4">
            <h2 className="text-xl font-bold dark:text-white mb-4">
              Reopen This Job?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This job will be moved back to <strong>IN_PROGRESS</strong>{" "}
              status.
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400 mb-6 font-semibold bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg">
              ⚠️ A new invoice will be created if you mark it READY again. The
              old invoice remains voided.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsReopenConfirmOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReopen}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition"
              >
                Reopen Job
              </button>
            </div>
          </div>
        </div>
      )}{" "}
      {/* WARRANTY CONFIRMATION MODAL */}
      {isWarrantyConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-md mx-4">
            <h2 className="text-xl font-bold dark:text-white mb-4">
              Create Warranty Rework Job?
            </h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-400 mb-6 text-sm">
              <p>You are about to create a warranty claim for this repair.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  A <strong>NEW</strong> Job Card will be created.
                </li>
                <li>Original Invoice remains unchanged.</li>
                <li>
                  Service Charges will be <strong>Free (₹0)</strong> by default.
                </li>
                <li>Parts can be billed if needed.</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsWarrantyConfirmOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWarranty}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition shadow-lg shadow-purple-200 dark:shadow-purple-900/20"
              >
                Create Warranty Job
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BILLING MODAL */}
      <RepairBillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onSubmit={handleBillSubmit}
        job={job}
        shopId={selectedShopId!}
      />
    </div>
  );
}


