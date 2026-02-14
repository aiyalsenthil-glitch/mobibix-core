"use client";

import { useEffect, useState } from "react";
import { getTenantUsage, type TenantUsageResponse } from "@/services/tenant.api";
import { AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubscriptionAlert() {
  const [status, setStatus] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // efficient check, maybe cache this?
    getTenantUsage().then((data) => {
      setStatus(data.status);
      setDaysLeft(data.daysLeft);
    }).catch(() => {
      // silent fail
    });
  }, [pathname]); // Re-check on navigation

  if (status !== "PAST_DUE" && status !== "EXPIRED") return null;

  const isExpired = status === "EXPIRED";

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-between gap-4 ${
      isExpired ? "bg-red-600 text-white" : "bg-amber-500 text-white"
    }`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <div className="text-sm font-medium">
          {isExpired 
            ? "Your subscription has expired. Access to features is restricted." 
            : "Your subscription is past due. Please update your payment method to avoid interruption."}
        </div>
      </div>
      <Link 
        href="/settings"
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded text-sm font-bold transition"
      >
        <CreditCard className="h-4 w-4" />
        {isExpired ? "Renew Now" : "Pay Now"}
      </Link>
    </div>
  );
}
