"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getJobCard,
  updateJobCardStatus,
  reopenJobCard,
  addJobCardPart,
  removeJobCardPart,
  JobCard,
  JobStatus,
  createWarrantyJob,
  addJobCardAdvance,
  refundJobCardAdvance,
} from "@/services/jobcard.api";
import { useShop } from "@/context/ShopContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import {
  listProducts,
  ShopProduct,
  createProduct,
  ProductType,
  getStockLevels,
} from "@/services/products.api";
import { createPurchase } from "@/services/purchases.api";
import { AdvanceModal } from "./AdvanceModal";

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
};

import { RepairBillingModal } from "@/components/repair/RepairBillingModal";
import { generateRepairBill } from "@/services/jobcard.api";

export default function JobCardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { theme } = useTheme();
  const { authUser: user } = useAuth(); // To check role
  const { selectedShopId } = useShop();
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
    if (status === "CANCELLED") {
      if (
        !confirm(
          "Cancel this job? Any linked invoice will be voided. This action cannot be easily undone.",
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
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };
  
  const handleBillSubmit = async (dto: any) => {
      if (!job || !selectedShopId) return;
      try {
          await generateRepairBill(selectedShopId, job.id, dto);
          // Refresh to show invoice and new status
           reload();
           setIsBillingModalOpen(false);
      } catch (err: any) {
          alert(err.message || "Failed to generate bill");
      }
  };

  const handleReadyConfirm = async () => {
    if (!job || !selectedShopId) return;

    try {
      await updateJobCardStatus(selectedShopId, job.id, "READY");
      setIsReadyConfirmOpen(false);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to mark job READY");
    }
  };

  const handleReopen = async () => {
    if (!job || !selectedShopId) return;

    try {
      await reopenJobCard(selectedShopId, job.id);
      setIsReopenConfirmOpen(false);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to reopen job");
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (!confirm("Remove this part? Stock will be restored.")) return;
    try {
      await removeJobCardPart(selectedShopId!, job!.id, partId);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to remove part");
    }
  };

  const handleCreateWarranty = async () => {
    if (!job || !selectedShopId) return;
    try {
      const newJob = await createWarrantyJob(selectedShopId, job.id);
      setIsWarrantyConfirmOpen(false);
      // Redirect to new job
      router.push(`/jobcards/${newJob.id}?shopId=${selectedShopId}`);
    } catch (err: any) {
      alert(err.message || "Failed to create warranty job");
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
                (job.warrantyDuration || 0) > 0 && (
                  <button
                    onClick={() => setIsWarrantyConfirmOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition"
                    title="Create a free rework job under warranty"
                  >
                    🛡️ Warranty Job
                  </button>
                )}
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

              {job.status !== "DELIVERED" && job.status !== "RETURNED" && (
                <select
                  value={job.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as JobStatus)
                  }
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-bold cursor-pointer outline-none transition"
                >
                  <option value={job.status} disabled>
                    Change Status
                  </option>
                  {[
                    "RECEIVED",
                    "ASSIGNED",
                    "DIAGNOSING",
                    "WAITING_APPROVAL",
                    "APPROVED",
                    "WAITING_FOR_PARTS",
                    "IN_PROGRESS",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                  <option value="CANCELLED">CANCEL Job</option>
                </select>
              )}
               {job.status === "READY" && !job.invoices?.some(i => i.status !== "VOIDED") && (
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
              {[
                "RECEIVED",
                "ASSIGNED",
                "DIAGNOSING",
                "IN_PROGRESS",
                "WAITING_FOR_PARTS",
              ].includes(job.status) && (
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
                          <button
                            onClick={() => handleRemovePart(part.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove Part (Restores Stock)"
                          >
                            ✕
                          </button>
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
              <a
                href={`https://wa.me/91${job.customerPhone}?text=Hi ${job.customerName}, regarding job #${job.jobNumber}`}
                target="_blank"
                className="block w-full text-center py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition"
              >
                WhatsApp
              </a>
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
                <span>
                  ₹{balanceDue.toFixed(2)}
                </span>
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
                      ((job.parts?.reduce(
                        (sum, p) => sum + (p.costPrice || 0) * p.quantity,
                        0,
                      ) || 0) / 100)
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

function AddPartModal({
  shopId,
  jobId,
  onClose,
  onSuccess,
}: {
  shopId: string;
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Creation Mode State
  const [createMode, setCreateMode] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newSalePrice, setNewSalePrice] = useState(0);
  const [newCostPrice, setNewCostPrice] = useState(0);
  const [createPurchaseEntry, setCreatePurchaseEntry] = useState(false);
  const [supplierName, setSupplierName] = useState("");

  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1 && !createMode) {
      // 🛡️ Fetch stock levels separately for accurate display
      Promise.all([listProducts(shopId), getStockLevels(shopId)]).then(
        ([prodResponse, stockResponse]: [any, any]) => {
          const allProds = Array.isArray(prodResponse)
            ? prodResponse
            : (prodResponse as any).data;
          const allStock = Array.isArray(stockResponse)
            ? stockResponse
            : (stockResponse as any).data;

          const stockMap = new Map(
            (allStock as any[]).map((s) => [s.id, s.stockQty || 0]),
          );

          setProducts(
            (allProds as any[])
              .filter(
                (p) =>
                  p.type !== ProductType.SERVICE &&
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()),
              )
              .map((p) => ({
                ...p,
                stock: stockMap.get(p.id) || 0,
              })),
          );
          setShowDropdown(true);
        },
      );
    } else {
      setShowDropdown(false);
    }
  }, [searchTerm, shopId, createMode]);

  // UX: Focus quantity when product is selected
  useEffect(() => {
    if (selectedProduct || createMode) {
      setTimeout(() => qtyInputRef.current?.focus(), 100);
    }
  }, [selectedProduct, createMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let productId = selectedProduct?.id;

      if (createMode) {
        if (!newProductName || newSalePrice <= 0) {
          alert("Name and Selling Price are required.");
          setIsSubmitting(false);
          return;
        }

        if (createPurchaseEntry) {
          if (newCostPrice <= 0 || !supplierName) {
            alert(
              "Cost Price and Supplier Name are required for Purchase Entry.",
            );
            setIsSubmitting(false);
            return;
          }
        }

        // 1. Create Product
        const newProduct = await createProduct(shopId, {
          name: newProductName,
          type: ProductType.SPARE, // Default to SPARE for Job Cards
          salePrice: newSalePrice,
          costPrice: newCostPrice > 0 ? newCostPrice : undefined,
          isSerialized: false,
        });
        productId = newProduct.id;

        // 2. Create Purchase Entry (Optional)
        if (createPurchaseEntry) {
          await createPurchase({
            shopId,
            supplierName: supplierName,
            invoiceNumber: `JOB-AUTO-${Date.now().toString().slice(-6)}`,
            paymentMethod: "CASH" as any,
            status: "SUBMITTED" as any, // 🛡️ CRITICAL FIX: Mark as submitted to update stock
            items: [
              {
                shopProductId: productId,
                description: newProductName,
                quantity: quantity,
                purchasePrice: newCostPrice, // Purchase API expects Rupees (it converts to Paisa)
              },
            ],
          });
        }
      }

      if (!productId) {
        alert("Please select or create a product.");
        setIsSubmitting(false);
        return;
      }

      await addJobCardPart(shopId, jobId, productId, quantity);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to add part");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 dark:text-white">
          {createMode ? "Create Part" : "Add Part"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!createMode ? (
            <>
              {/* SEARCH MODE */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
                  Search Product
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Only physical parts shown. Service charges are calculated
                  separately.
                </p>
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Type product name..."
                    value={selectedProduct ? selectedProduct.name : searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedProduct(null);
                    }}
                  />
                  {searchTerm.length > 0 && !selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateMode(true);
                        setNewProductName(searchTerm);
                      }}
                      className="absolute right-2 top-2 text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded hover:bg-teal-200"
                    >
                      + Create New
                    </button>
                  )}
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setSearchTerm("");
                      }}
                      className="absolute right-12 top-2 text-gray-500 hover:text-red-500 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>

                  {/* Dropdown Results */}
                  {showDropdown && products.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {products.map((product) => (
                        <div
                          key={product.id}
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                          onClick={() => {
                            setSelectedProduct(product);
                            setSearchTerm(product.name);
                            setShowDropdown(false);
                          }}
                        >
                          <div className="font-semibold dark:text-white">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Stock: {product.stock || 0} • Price: ₹
                            {(product.salePrice / 100).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Create New Prompt (if no results) */}
                {!selectedProduct &&
                  searchTerm.length > 1 &&
                  products.length === 0 && (
                    <div className="mt-2 text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <p className="text-sm text-gray-500 mb-2">
                        Item not found.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateMode(true);
                          setNewProductName(searchTerm);
                        }}
                        className="text-teal-600 hover:text-teal-700 font-bold text-sm"
                      >
                        Create "{searchTerm}"
                      </button>
                    </div>
                  )}
              </div>
            </>
          ) : (
            <>
              {/* CREATE MODE */}
              <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-teal-800 dark:text-teal-300">
                    New Product Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateMode(false)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Back to Search
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Sale Price
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                        value={newSalePrice}
                        onChange={(e) =>
                          setNewSalePrice(parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">
                        Cost Price
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                        value={newCostPrice}
                        onChange={(e) =>
                          setNewCostPrice(parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* INTEGRATED PURCHASE ENTRY */}
              <div className="flex items-center gap-2 mt-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="createPurchase"
                  checked={createPurchaseEntry}
                  onChange={(e) => setCreatePurchaseEntry(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label
                  htmlFor="createPurchase"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Create Purchase Entry (Add Stock)
                </label>
              </div>

              {createPurchaseEntry && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-semibold mb-1 dark:text-gray-300">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g. Local Market"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* QUANTITY (Common) */}
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
              Quantity
            </label>
            <input
              ref={qtyInputRef}
              type="number"
              min="1"
              required
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition disabled:opacity-50"
            >
              {isSubmitting
                ? "Adding..."
                : createMode
                  ? "Create & Add"
                  : "Add Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
