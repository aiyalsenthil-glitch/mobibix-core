"use client";

import { useEffect, useState } from "react";
import {
  getCustomerTimeline,
  type TimelineItem,
  type TimelineSource,
} from "@/services/crm.api";

interface CustomerTimelineProps {
  customerId: string;
  defaultSource?: TimelineSource;
  showFilter?: boolean;
}

export function CustomerTimeline({
  customerId,
  defaultSource,
  showFilter = true,
}: CustomerTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>(
    defaultSource || "ALL",
  );

  useEffect(() => {
    loadTimeline();
  }, [customerId, selectedSource]);

  async function loadTimeline() {
    try {
      setLoading(true);
      setError(null);
      const source = selectedSource === "ALL" ? undefined : selectedSource;
      const response = await getCustomerTimeline(customerId, source);
      setItems(response.items);
    } catch (err: any) {
      setError(err.message || "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      {showFilter && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <FilterButton
            label="All"
            active={selectedSource === "ALL"}
            onClick={() => setSelectedSource("ALL")}
          />
          <FilterButton
            label="Jobs"
            active={selectedSource === "JOB"}
            onClick={() => setSelectedSource("JOB")}
          />
          <FilterButton
            label="Invoices"
            active={selectedSource === "INVOICE"}
            onClick={() => setSelectedSource("INVOICE")}
          />
          <FilterButton
            label="Follow-ups"
            active={selectedSource === "CRM"}
            onClick={() => setSelectedSource("CRM")}
          />
          <FilterButton
            label="WhatsApp"
            active={selectedSource === "WHATSAPP"}
            onClick={() => setSelectedSource("WHATSAPP")}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-lg p-4 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
          <button
            onClick={loadTimeline}
            className="mt-2 text-sm text-teal-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-sm">No activity yet</p>
        </div>
      )}

      {/* Timeline Items */}
      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <TimelineItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TimelineItemCardProps {
  item: TimelineItem;
}

function TimelineItemCard({ item }: TimelineItemCardProps) {
  const icon = getSourceIcon(item.source);
  const color = getSourceColor(item.source);

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}
        >
          <span className="text-lg">{icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-white">{item.eventType}</p>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDate(item.createdAt)}
            </span>
          </div>
          <p className="text-sm text-gray-300 line-clamp-2">
            {item.description}
          </p>

          {/* Metadata (optional) */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(item.metadata)
                .slice(0, 3)
                .map(([key, value]) => (
                  <span
                    key={key}
                    className="text-xs bg-white/5 px-2 py-1 rounded"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
          : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function getSourceIcon(source: TimelineSource): string {
  switch (source) {
    case "JOB":
      return "🔧";
    case "INVOICE":
      return "🧾";
    case "CRM":
      return "📋";
    case "WHATSAPP":
      return "💬";
    default:
      return "📄";
  }
}

function getSourceColor(source: TimelineSource): string {
  switch (source) {
    case "JOB":
      return "bg-blue-500/20 text-blue-400";
    case "INVOICE":
      return "bg-green-500/20 text-green-400";
    case "CRM":
      return "bg-purple-500/20 text-purple-400";
    case "WHATSAPP":
      return "bg-teal-500/20 text-teal-400";
    default:
      return "bg-gray-500/20 text-gray-400";
  }
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}
