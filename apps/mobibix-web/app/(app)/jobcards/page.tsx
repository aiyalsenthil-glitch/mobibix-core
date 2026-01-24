"use client";

import { useEffect, useState } from "react";
import {
  listJobCards,
  updateJobCardStatus,
  deleteJobCard,
  type JobCard,
  type JobStatus,
} from "@/services/jobcard.api";
import { listShops, type Shop } from "@/services/shops.api";
import { JobCardModal } from "./JobCardModal";

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
  RECEIVED: "bg-blue-500/20 text-blue-300",
  DIAGNOSED: "bg-purple-500/20 text-purple-300",
  PARTS_ORDERED: "bg-yellow-500/20 text-yellow-300",
  IN_REPAIR: "bg-orange-500/20 text-orange-300",
  QUALITY_CHECK: "bg-cyan-500/20 text-cyan-300",
  READY: "bg-green-500/20 text-green-300",
  DELIVERED: "bg-gray-500/20 text-gray-300",
  CANCELLED: "bg-red-500/20 text-red-300",
};

export default function JobCardsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);

  // Load shops on component mount
  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        setError(null);
        const data = await listShops();
        setShops(data);
        // Auto-select first shop
        if (data.length > 0) {
          setSelectedShopId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error loading shops:", err);
        setError(err.message || "Failed to load shops");
      } finally {
        setIsLoadingShops(false);
      }
    };

    loadShops();
  }, []);

  const loadJobCards = async () => {
    if (!selectedShopId) {
      setError("Please select a shop");
      setJobCards([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`Loading job cards for shop: ${selectedShopId}`);
      const data = await listJobCards(selectedShopId);
      console.log(`Loaded ${data.length} job cards`, data);
      setJobCards(data);
    } catch (err: any) {
      console.error("Error loading job cards:", err);
      setError(err.message || "Failed to load job cards");
      setJobCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (jobCardId: string, status: JobStatus) => {
    try {
      await updateJobCardStatus(selectedShopId, jobCardId, status);
      await loadJobCards();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDelete = async (jobCardId: string) => {
    if (!confirm("Are you sure you want to delete this job card?")) return;

    try {
      await deleteJobCard(selectedShopId, jobCardId);
      await loadJobCards();
    } catch (err: any) {
      alert(err.message || "Failed to delete job card");
    }
  };

  const handleAddNew = () => {
    setSelectedJobCard(null);
    setIsModalOpen(true);
  };

  const handleEdit = (jobCard: JobCard) => {
    setSelectedJobCard(jobCard);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedJobCard(null);
    loadJobCards();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Job Cards</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
        >
          + Add New
        </button>
      </div>

      {/* Shop Filter Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-stone-400 mb-2">
              Select Shop
            </label>
            {isLoadingShops ? (
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-stone-400">
                Loading shops...
              </div>
            ) : shops.length === 0 ? (
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-stone-400">
                No shops available
              </div>
            ) : (
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Select a shop --</option>
                {shops.map((shop) => (
                  <option
                    key={shop.id}
                    value={shop.id}
                    className="bg-stone-900"
                  >
                    {shop.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={loadJobCards}
            disabled={!selectedShopId || isLoading}
            className="mt-6 px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg font-medium transition"
          >
            {isLoading ? "Loading..." : "List"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-stone-400">
          Loading job cards...
        </div>
      ) : jobCards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 mb-4">
            {selectedShopId
              ? "No job cards found"
              : "Select a shop and click List"}
          </p>
          {selectedShopId && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
            >
              Create your first job card
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Job No.
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Customer Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Device
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {jobCards.map((job) => (
                  <tr key={job.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {job.jobNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">
                      {job.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">
                      {job.customerPhone}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">
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
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[job.status]} bg-transparent border-0 focus:outline-none cursor-pointer`}
                        disabled={
                          job.status === "DELIVERED" ||
                          job.status === "CANCELLED"
                        }
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option
                            key={status}
                            value={status}
                            className="bg-stone-900"
                          >
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 hover:bg-white/10 rounded-lg transition"
                          title="View/Edit"
                        >
                          👁️
                        </button>
                        <a
                          href={`/track/${job.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-lg transition"
                          title="Public Track"
                        >
                          🔗
                        </a>
                        <a
                          href={`/jobcards/print/${job.id}?shopId=${selectedShopId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-lg transition"
                          title="Print"
                        >
                          🖨️
                        </a>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition"
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
