"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Trophy, Pencil } from "lucide-react";
import { SetTargetModal } from "./SetTargetModal";

function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`w-full h-2.5 rounded-full bg-muted overflow-hidden ${className ?? ""}`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}

interface RevenueTargetCardProps {
  shopId: string;
  currentRevenue: number;  // in paisa
  targetRevenue: number;   // in paisa
  isLoading?: boolean;
  canEdit?: boolean;
  onTargetUpdated?: (newTarget: number) => void;
}

const formatINR = (paisa: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paisa / 100);

export function RevenueTargetCard({
  shopId,
  currentRevenue,
  targetRevenue,
  isLoading,
  canEdit = false,
  onTargetUpdated,
}: RevenueTargetCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localTarget, setLocalTarget] = useState(targetRevenue);

  const effective = localTarget || targetRevenue;
  const percent = effective > 0
    ? Math.min(100, Math.round((currentRevenue / effective) * 100))
    : 0;
  const remaining = Math.max(0, effective - currentRevenue);

  const statusColor = () => {
    if (percent >= 100) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (percent >= 75) return "text-sky-500 bg-sky-500/10 border-sky-500/20";
    if (percent >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-muted-foreground bg-muted border-border";
  };

  const progressBarColor = () => {
    if (percent >= 100) return "#10b981"; // emerald-500
    if (percent >= 75) return "#0ea5e9";  // sky-500
    if (percent >= 50) return "#f59e0b";  // amber-500
    return undefined;
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-10 w-3/4 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded-full" />
        <div className="h-4 w-full bg-muted rounded" />
      </div>
    );
  }

  if (effective === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[160px] border-dashed">
        <Target className="w-8 h-8 text-muted-foreground/50" />
        <div>
          <p className="font-semibold text-foreground text-sm">No Revenue Target Set</p>
          <p className="text-xs text-muted-foreground mt-0.5">Set a monthly goal to track your shop's progress</p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)} className="mt-1">
            <Target className="w-3.5 h-3.5 mr-1.5" /> Set Goal
          </Button>
        )}
        {isModalOpen && (
          <SetTargetModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            shopId={shopId}
            onSuccess={(val) => {
              setLocalTarget(val);
              onTargetUpdated?.(val);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute -right-6 -top-6 opacity-[0.04] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
        <Target size={130} />
      </div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${statusColor()}`}>
            {percent >= 100 ? <Trophy className="w-4 h-4" /> : <Target className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">Monthly Target</h3>
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date())}
            </p>
          </div>
        </div>

        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsModalOpen(true)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-black text-foreground tracking-tight">
              {formatINR(currentRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              of {formatINR(effective)} goal
            </p>
          </div>
          <div className={`text-3xl font-black ${percent >= 100 ? "text-emerald-500" : "text-foreground"}`}>
            {percent}%
          </div>
        </div>

        <div className="space-y-2">
          <ProgressBar value={percent} color={progressBarColor()} />
          <div className="flex items-center justify-between text-xs font-medium">
            {percent >= 100 ? (
              <span className="text-emerald-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Exceeded by {formatINR(currentRevenue - effective)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {formatINR(remaining)} to go
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[11px] border ${statusColor()}`}>
              {percent >= 100 ? "🎉 Target Met" : percent >= 75 ? "On Track" : percent >= 50 ? "Halfway" : "Behind"}
            </span>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <SetTargetModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          shopId={shopId}
          initialTargetInPaisa={effective}
          onSuccess={(val) => {
            setLocalTarget(val);
            onTargetUpdated?.(val);
          }}
        />
      )}
    </div>
  );
}
