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

const STATUS_OPTIONS: JobStatus[] = [
  "RECEIVED",
  "DIAGNOSED",
  "PARTS_ORDERED",
  "IN_REPAIR",
  "QUALITY_CHECK",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_COLORS: Record<JobStatus, string> = {
  RECEIVED:
    "bg-teal-200 text-teal-900 border-teal-400 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-500/50",
  DIAGNOSED:
    "bg-purple-200 text-purple-900 border-purple-400 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/50",
  PARTS_ORDERED:
    "bg-amber-200 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/50",
  IN_REPAIR:
    "bg-orange-200 text-orange-900 border-orange-400 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/50",
  QUALITY_CHECK:
    "bg-sky-200 text-sky-900 border-sky-400 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/50",
  READY:
    "bg-green-200 text-green-900 border-green-400 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/50",
  DELIVERED:
    "bg-gray-300 text-gray-900 border-gray-500 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/50",
  CANCELLED:
    "bg-rose-200 text-rose-900 border-rose-400 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/50",
};

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

  const handleStatusChange = async (jobCardId: string, status: JobStatus) => {
    try {
      await updateJobCardStatus(selectedShopId, jobCardId, status);
      // Reload job cards after status change
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
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
      ) : jobCards.length === 0 ? (
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
                      <select
                        value={job.status}
                        onChange={(e) =>
                          handleStatusChange(
                            job.id,
                            e.target.value as JobStatus,
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[job.status]} focus:outline-none cursor-pointer appearance-none`}
                        disabled={
                          job.status === "DELIVERED" ||
                          job.status === "CANCELLED"
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="bg-white dark:bg-stone-900 text-black dark:text-white"
                          >
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-black dark:text-white">
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                          title="View/Edit"
                        >
                          👁️
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
                          href={`/jobcards/print/${job.id}?shopId=${selectedShopId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition"
                          title="Print"
                        >
                          🖨️
                        </a>
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
    </div>
  );
}
