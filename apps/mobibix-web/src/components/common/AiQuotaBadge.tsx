"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch, extractData, unwrapStandardResponse } from "@/services/auth.api";

interface AiQuotaData {
  aiTokensUsed: number;
  aiTokensLimit: number;
  resetAt: string | null;
}

async function getAiQuota(): Promise<AiQuotaData | null> {
  try {
    const res = await authenticatedFetch("/tenant/ai-quota");
    if (!res.ok) return null;
    const json = await extractData<AiQuotaData>(res);
    return unwrapStandardResponse<AiQuotaData>(json);
  } catch {
    return null;
  }
}

import { useTheme } from "@/context/ThemeContext";
import { Zap } from "lucide-react";

export function AiQuotaBadge({ className = "" }: { className?: string }) {
  const [quota, setQuota] = useState<AiQuotaData | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    getAiQuota().then(setQuota);
  }, []);

  // Hydration safety since useTheme uses window
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !quota || quota.aiTokensLimit === 0) return null;

  const isUnlimited = quota.aiTokensLimit === -1;
  const pct = isUnlimited
    ? 0
    : Math.min(100, Math.round((quota.aiTokensUsed / quota.aiTokensLimit) * 100));

  const isNearLimit = !isUnlimited && pct >= 80;
  const isExhausted = !isUnlimited && pct >= 100;
  const isDark = theme === "dark";

  const barColor = isExhausted
    ? "bg-rose-500"
    : isNearLimit
    ? "bg-amber-500"
    : "bg-gradient-to-r from-indigo-500 to-purple-500";

  const textColor = isExhausted
    ? isDark ? "text-rose-400" : "text-rose-600"
    : isNearLimit
    ? isDark ? "text-amber-400" : "text-amber-600"
    : isDark ? "text-indigo-400" : "text-indigo-600";

  return (
    <div className={`rounded-xl p-3.5 flex flex-col gap-2.5 transition-colors shadow-sm ${isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white border border-slate-200"} ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Zap size={14} className={textColor} strokeWidth={2.5} />
          <span className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>AI Tokens</span>
        </div>
        <span className={`text-[11px] font-bold ${textColor}`}>
          {quota.aiTokensUsed.toLocaleString()} / {isUnlimited ? "Unlimited" : quota.aiTokensLimit.toLocaleString()}
        </span>
      </div>
      
      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className={`text-[10px] sm:text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        {isExhausted ? (
          <span className="text-rose-500">
            Quota exhausted.{" "}
            <a href="/pricing" className="underline hover:no-underline">Upgrade</a>
          </span>
        ) : (
          <div className="flex justify-between items-center">
            <span>{isUnlimited ? "Pro Plan: Unlimited" : `${pct}% used`}</span>
            {quota.resetAt && <span>Renews {new Date(quota.resetAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
