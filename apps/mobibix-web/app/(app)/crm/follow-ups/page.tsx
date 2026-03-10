"use client";

import { useState, useEffect, useCallback } from "react";
import { MyFollowUpsWidget, AddFollowUpModal } from "@/components/crm";
import { CustomerTabs } from "@/components/crm/CustomerTabs";
import {
  getAllFollowUps,
  updateFollowUpStatus,
  type FollowUp,
  type FollowUpStatus,
} from "@/services/crm.api";
import { useAuth } from "@/hooks/useAuth";

type ViewTab = "mine" | "all";

export default function FollowUpsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("mine");
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allLoading, setAllLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const result = await getAllFollowUps({ take: 100 });
      setAllFollowUps(result.data);
      setAllTotal(result.total);
    } catch {
      // silently fail
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner && activeTab === "all") {
      loadAll();
    }
  }, [isOwner, activeTab, loadAll]);

  async function handleStatusChange(id: string, status: FollowUpStatus) {
    await updateFollowUpStatus(id, status);
    loadAll();
  }

  return (
    <div className="space-y-6">
      <CustomerTabs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Follow-ups</h1>
          <p className="text-gray-500 mt-1">
            Manage customer follow-up tasks
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
        >
          + Add Follow-up
        </button>
      </div>

      {/* Owner view tabs */}
      {isOwner && (
        <div className="flex gap-1 border-b dark:border-gray-800">
          {(["mine", "all"] as ViewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t
                  ? "border-teal-500 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              {t === "mine" ? "My Tasks" : `All Tasks${allTotal ? ` (${allTotal})` : ""}`}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === "mine" || !isOwner ? (
        <MyFollowUpsWidget />
      ) : (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
          {allLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : allFollowUps.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No follow-ups found</p>
          ) : (
            <ul className="space-y-2">
              {allFollowUps.map((fu) => (
                <AllFollowUpRow
                  key={fu.id}
                  followUp={fu}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <AddFollowUpModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          if (activeTab === "all") loadAll();
        }}
      />
    </div>
  );
}

function AllFollowUpRow({
  followUp,
  onStatusChange,
}: {
  followUp: FollowUp;
  onStatusChange: (id: string, status: FollowUpStatus) => void;
}) {
  const isOverdue =
    followUp.status === "PENDING" &&
    new Date(followUp.followUpAt) < new Date();

  return (
    <li className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/4 border border-gray-100 dark:border-white/8">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase">
            {followUp.type?.replace("_", " ")}
          </span>
          {isOverdue && (
            <span className="text-xs font-semibold text-red-500">OVERDUE</span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 truncate">
          {followUp.purpose}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span>
            {new Date(followUp.followUpAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {followUp.assignedToUserName && (
            <span>→ {followUp.assignedToUserName}</span>
          )}
        </div>
      </div>
      {followUp.status === "PENDING" && (
        <button
          onClick={() => onStatusChange(followUp.id, "DONE")}
          className="text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition-colors flex-shrink-0"
        >
          Done
        </button>
      )}
      {followUp.status !== "PENDING" && (
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-500 rounded flex-shrink-0">
          {followUp.status}
        </span>
      )}
    </li>
  );
}
