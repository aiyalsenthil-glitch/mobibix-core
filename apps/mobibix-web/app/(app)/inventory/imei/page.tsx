"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getImeiList,
  updateImeiStatus,
  transferImei,
  reserveImei,
  releaseImeiReserve,
  type ImeiRecord,
  type ImeiStatus,
} from "@/services/stock.api";
import { useShop } from "@/context/ShopContext";

const STATUS_COLORS: Record<ImeiStatus, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  RESERVED: "bg-yellow-100 text-yellow-700",
  SOLD: "bg-blue-100 text-blue-700",
  RETURNED: "bg-orange-100 text-orange-700",
  RETURNED_GOOD: "bg-teal-100 text-teal-700",
  RETURNED_DAMAGED: "bg-red-100 text-red-700",
  DAMAGED: "bg-red-100 text-red-700",
  TRANSFERRED: "bg-purple-100 text-purple-700",
  LOST: "bg-gray-200 text-gray-600",
  SCRAPPED: "bg-gray-200 text-gray-500",
};

const STATUS_OPTIONS: ImeiStatus[] = [
  "IN_STOCK",
  "RESERVED",
  "SOLD",
  "RETURNED",
  "RETURNED_GOOD",
  "RETURNED_DAMAGED",
  "DAMAGED",
  "LOST",
  "SCRAPPED",
];

// Valid transitions per status (mirrors backend)
const ALLOWED_TRANSITIONS: Partial<Record<ImeiStatus, ImeiStatus[]>> = {
  SOLD: ["RETURNED", "RETURNED_GOOD", "RETURNED_DAMAGED"],
  IN_STOCK: ["DAMAGED", "LOST", "SCRAPPED"],
  RESERVED: ["IN_STOCK"],
  RETURNED: ["IN_STOCK", "DAMAGED", "SCRAPPED"],
  RETURNED_GOOD: ["IN_STOCK"],
  RETURNED_DAMAGED: ["DAMAGED", "SCRAPPED"],
};

export default function ImeiTrackerPage() {
  const { selectedShop, shops } = useShop();

  const [items, setItems] = useState<ImeiRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<ImeiStatus | "">("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Action modal state
  const [actionImei, setActionImei] = useState<ImeiRecord | null>(null);
  const [actionType, setActionType] = useState<"status" | "transfer" | null>(null);
  const [actionStatus, setActionStatus] = useState<ImeiStatus>("RETURNED");
  const [actionNotes, setActionNotes] = useState("");
  const [targetShopId, setTargetShopId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getImeiList({
        shopId: selectedShop?.id,
        status: filterStatus || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || "Failed to load IMEIs");
    } finally {
      setLoading(false);
    }
  }, [selectedShop?.id, filterStatus, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const openStatusAction = (item: ImeiRecord) => {
    setActionImei(item);
    setActionType("status");
    const allowed = ALLOWED_TRANSITIONS[item.status];
    setActionStatus(allowed?.[0] ?? "RETURNED");
    setActionNotes("");
    setActionError(null);
  };

  const openTransferAction = (item: ImeiRecord) => {
    setActionImei(item);
    setActionType("transfer");
    setTargetShopId("");
    setActionError(null);
  };

  const closeModal = () => {
    setActionImei(null);
    setActionType(null);
    setActionError(null);
  };

  const handleReserve = async (item: ImeiRecord) => {
    try {
      await reserveImei(item.imei);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReleaseReserve = async (item: ImeiRecord) => {
    try {
      await releaseImeiReserve(item.imei);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const submitAction = async () => {
    if (!actionImei) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (actionType === "status") {
        await updateImeiStatus(actionImei.imei, actionStatus, actionNotes || undefined);
      } else if (actionType === "transfer") {
        if (!targetShopId) { setActionError("Select a target shop"); setActionLoading(false); return; }
        await transferImei(actionImei.imei, targetShopId);
      }
      closeModal();
      load();
    } catch (e: any) {
      setActionError(e.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const needsNotes = ["DAMAGED", "RETURNED_DAMAGED", "LOST"].includes(actionStatus);
  const allowedNext = actionImei ? (ALLOWED_TRANSITIONS[actionImei.status] || []) : [];

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">IMEI Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {total} device{total !== 1 ? "s" : ""} tracked
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search IMEI..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white w-52 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </form>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as ImeiStatus | ""); setPage(1); }}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">IMEI</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Product</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Invoice</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Sold At</th>
              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Loading...</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No IMEIs found</td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                <td className="px-4 py-3 font-mono text-gray-900 dark:text-white text-xs">{item.imei}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.product?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
                    {item.status.replace(/_/g, " ")}
                  </span>
                  {item.damageNotes && (
                    <div className="text-[10px] text-red-500 mt-0.5 truncate max-w-[120px]" title={item.damageNotes}>
                      {item.damageNotes}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                  {item.invoice?.invoiceNumber ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                  {item.invoice?.customerName ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {item.soldAt
                    ? new Date(item.soldAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {ALLOWED_TRANSITIONS[item.status]?.length ? (
                      <button
                        onClick={() => openStatusAction(item)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                      >
                        Update
                      </button>
                    ) : null}
                    {(item.status === "IN_STOCK" || item.status === "RESERVED") && shops && shops.length > 1 && (
                      <button
                        onClick={() => openTransferAction(item)}
                        className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                      >
                        Transfer
                      </button>
                    )}
                    {item.status === "IN_STOCK" && (
                      <button
                        onClick={() => handleReserve(item)}
                        className="text-xs px-2 py-1 rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition"
                      >
                        Reserve
                      </button>
                    )}
                    {item.status === "RESERVED" && (
                      <button
                        onClick={() => handleReleaseReserve(item)}
                        className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition"
                      >
                        Release
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-3 py-1">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionImei && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {actionType === "status" ? "Update IMEI Status" : "Transfer IMEI"}
            </h2>
            <p className="text-xs text-gray-500 mb-4 font-mono">{actionImei.imei}</p>

            {actionType === "status" && (
              <>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">
                  New Status
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as ImeiStatus)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {allowedNext.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>

                {needsNotes && (
                  <>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">
                      Notes {actionStatus === "LOST" ? "(Reason)" : "(Damage Details)"}
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      rows={2}
                      placeholder={actionStatus === "LOST" ? "Reason for loss..." : "Describe damage..."}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                  </>
                )}
              </>
            )}

            {actionType === "transfer" && (
              <>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">
                  Target Shop
                </label>
                <select
                  value={targetShopId}
                  onChange={(e) => setTargetShopId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select shop...</option>
                  {shops
                    ?.filter((s) => s.id !== actionImei.shopId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </>
            )}

            {actionError && (
              <p className="text-xs text-red-600 mb-3">{actionError}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                disabled={actionLoading}
                className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition disabled:opacity-60"
              >
                {actionLoading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
