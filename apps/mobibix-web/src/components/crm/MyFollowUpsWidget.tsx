"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getMyFollowUps,
  updateFollowUpStatus,
  type FollowUp,
  type FollowUpStatus,
} from "@/services/crm.api";

const PAGE_SIZE = 50;

export function MyFollowUpsWidget() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalFollowUps, setTotalFollowUps] = useState(0);

  const loadFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMyFollowUps({
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE,
      });

      // Handle both paginated and non-paginated responses
      if (Array.isArray(result)) {
        setFollowUps(result);
        setTotalFollowUps(result.length);
      } else {
        setFollowUps(result.data);
        setTotalFollowUps(result.total);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  async function markAsDone(followUpId: string) {
    try {
      await updateFollowUpStatus(followUpId, "DONE");
      // Update local state
      setFollowUps((prev) =>
        prev.map((item) =>
          item.id === followUpId ? { ...item, status: "DONE" } : item,
        ),
      );
    } catch (err: any) {
      alert(err.message || "Failed to update follow-up");
    }
  }

  // Group follow-ups
  const overdue = followUps.filter(
    (f) => f.status === "PENDING" && new Date(f.followUpAt) < new Date(),
  );
  const dueToday = followUps.filter((f) => {
    if (f.status !== "PENDING") return false;
    const date = new Date(f.followUpAt);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  });
  const upcoming = followUps.filter(
    (f) =>
      f.status === "PENDING" &&
      new Date(f.followUpAt) > new Date() &&
      !dueToday.includes(f),
  );

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
        <button
          onClick={loadFollowUps}
          className="mt-3 text-sm text-teal-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">📋 My Follow-ups</h3>
        <button
          onClick={loadFollowUps}
          className="text-sm text-teal-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {followUps.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">
          No follow-ups assigned
        </p>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-400 font-medium text-sm">⚠️ Overdue</span>
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
              {overdue.length}
            </span>
          </div>
          <div className="space-y-2">
            {overdue.map((item) => (
              <FollowUpCard
                key={item.id}
                item={item}
                onMarkDone={markAsDone}
                variant="overdue"
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400 font-medium text-sm">
              📅 Due Today
            </span>
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
              {dueToday.length}
            </span>
          </div>
          <div className="space-y-2">
            {dueToday.map((item) => (
              <FollowUpCard
                key={item.id}
                item={item}
                onMarkDone={markAsDone}
                variant="today"
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-400 font-medium text-sm">
              📆 Upcoming
            </span>
            <span className="bg-white/10 text-gray-400 text-xs px-2 py-1 rounded">
              {upcoming.length}
            </span>
          </div>
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((item) => (
              <FollowUpCard
                key={item.id}
                item={item}
                onMarkDone={markAsDone}
                variant="upcoming"
              />
            ))}
            {upcoming.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                +{upcoming.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalFollowUps > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-between px-4 py-3 rounded-lg border border-white/10 bg-white/5">
          <div className="text-sm text-gray-400">
            Showing {currentPage * PAGE_SIZE + 1} to{" "}
            {Math.min((currentPage + 1) * PAGE_SIZE, totalFollowUps)} of{" "}
            {totalFollowUps} follow-ups
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentPage === 0
                  ? "bg-white/5 text-stone-600 cursor-not-allowed"
                  : "bg-white/10 hover:bg-white/20 text-stone-300"
              }`}
            >
              Previous
            </button>
            <span className="px-4 py-2 text-stone-300">
              Page {currentPage + 1} of {Math.ceil(totalFollowUps / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={(currentPage + 1) * PAGE_SIZE >= totalFollowUps}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                (currentPage + 1) * PAGE_SIZE >= totalFollowUps
                  ? "bg-white/5 text-stone-600 cursor-not-allowed"
                  : "bg-white/10 hover:bg-white/20 text-stone-300"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface FollowUpCardProps {
  item: FollowUp;
  onMarkDone: (id: string) => void;
  variant: "overdue" | "today" | "upcoming";
}

function FollowUpCard({ item, onMarkDone, variant }: FollowUpCardProps) {
  const borderColor =
    variant === "overdue"
      ? "border-red-500/30"
      : variant === "today"
        ? "border-yellow-500/30"
        : "border-white/10";

  return (
    <div
      className={`bg-white/5 border ${borderColor} rounded-lg p-3 hover:border-white/20 transition-colors`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white mb-1">{item.purpose}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>👤 {item.customerName || "Unknown"}</span>
            <span>•</span>
            <span>{formatDate(item.followUpAt)}</span>
            <span>•</span>
            <span>{formatType(item.type)}</span>
          </div>
        </div>
        <button
          onClick={() => onMarkDone(item.id)}
          className="text-xs bg-teal-500/20 text-teal-400 px-3 py-1.5 rounded hover:bg-teal-500/30 transition-colors whitespace-nowrap"
        >
          Mark Done
        </button>
      </div>
    </div>
  );
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatType(type: string): string {
  const map: Record<string, string> = {
    PHONE_CALL: "📞 Call",
    EMAIL: "📧 Email",
    VISIT: "🚶 Visit",
    SMS: "💬 SMS",
    WHATSAPP: "📱 WhatsApp",
  };
  return map[type] || type;
}
