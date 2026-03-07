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

export function AiQuotaBadge({ className = "" }: { className?: string }) {
  const [quota, setQuota] = useState<AiQuotaData | null>(null);

  useEffect(() => {
    getAiQuota().then(setQuota);
  }, []);

  if (!quota || quota.aiTokensLimit === 0) return null;

  const pct = Math.min(
    100,
    Math.round((quota.aiTokensUsed / quota.aiTokensLimit) * 100)
  );
  const isNearLimit = pct >= 80;
  const isExhausted = pct >= 100;

  const barColor = isExhausted
    ? "bg-red-500"
    : isNearLimit
    ? "bg-amber-400"
    : "bg-indigo-500";

  const textColor = isExhausted
    ? "text-red-600"
    : isNearLimit
    ? "text-amber-600"
    : "text-slate-600";

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🤖</span>
          <span className="font-semibold text-slate-700">AI Tokens</span>
        </div>
        <span className={`font-bold ${textColor}`}>
          {quota.aiTokensUsed.toLocaleString()} / {quota.aiTokensLimit.toLocaleString()}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isExhausted ? (
        <p className="text-red-600 font-medium">
          AI quota exhausted.{" "}
          <a href="/pricing" className="underline hover:no-underline">
            Upgrade to continue.
          </a>
        </p>
      ) : (
        <p className={textColor}>
          {pct}% used
          {quota.resetAt && ` · Resets ${new Date(quota.resetAt).toLocaleDateString("en-IN")}`}
        </p>
      )}
    </div>
  );
}
