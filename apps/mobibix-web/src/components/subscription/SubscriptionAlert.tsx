"use client";

import { useEffect, useState } from "react";
import { getTenantUsage, type TenantUsageResponse } from "@/services/tenant.api";
import { AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubscriptionAlert() {
  const [usage, setUsage] = useState<TenantUsageResponse | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    getTenantUsage().then((data) => {
      setUsage(data);
    }).catch(() => {
      // silent fail
    });
  }, [pathname]);

  if (!usage) return null;

  const { status, membersUsed, membersLimit, plan, isLifetime } = usage;
  if (isLifetime) return null; // Free lifetime plan — no alerts
  const isExpired = status === "EXPIRED";
  const isPastDue = status === "PAST_DUE";

  // Check for limit violations (Downgrade Bypass detection)
  const isOverLimit = (
    (membersLimit !== null && membersUsed > membersLimit) ||
    (plan?.maxStaff !== null && usage.plan?.maxStaff !== undefined && usage.membersUsed > (usage.plan.memberLimit ?? Infinity)) || // Wait, let's use the actual fields from TenantUsageResponse
    (plan?.maxStaff !== null && plan?.maxStaff !== undefined && (usage as any).staffUsed > plan.maxStaff) || 
    (plan?.maxShops !== null && plan?.maxShops !== undefined && (usage as any).shopsUsed > plan.maxShops)
  );
  
  // Refined limit check logic based on TenantUsageResponse structure
  const hasLimitIssue = 
    (membersLimit !== null && membersUsed > membersLimit) ||
    (plan?.maxStaff !== null && (usage as any).staffUsed > (plan?.maxStaff ?? Infinity)) ||
    (plan?.maxShops !== null && (usage as any).shopsUsed > (plan?.maxShops ?? Infinity));

  if (!isExpired && !isPastDue && !hasLimitIssue) return null;

  let message = "";
  let bgColor = "bg-amber-500";
  
  if (isExpired) {
    message = "Your subscription has expired. Access to features is restricted.";
    bgColor = "bg-red-600";
  } else if (isPastDue) {
    message = "Your subscription is past due. Please update payment to avoid interruption.";
    bgColor = "bg-amber-500";
  } else if (hasLimitIssue) {
    message = "You are exceeding your plan limits. Some features may be blocked. Please upgrade.";
    bgColor = "bg-purple-600"; // Use purple for limit issues to distinguish from payment issues
  }

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-between gap-4 text-white ${bgColor} transition-colors duration-300`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div className="text-sm font-medium">
          {message}
        </div>
      </div>
      <Link 
        href="/pricing"
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm font-bold transition whitespace-nowrap"
      >
        <CreditCard className="h-4 w-4" />
        {isExpired || hasLimitIssue ? "Upgrade / Renew" : "Pay Now"}
      </Link>
    </div>
  );
}
