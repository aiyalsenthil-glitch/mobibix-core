
"use client";

import { AlertCircle, Zap } from "lucide-react";
import Link from "next/link";

interface SubscriptionBannerProps {
  daysLeft: number;
  status: string;
}

export function SubscriptionBanner({ daysLeft, status }: SubscriptionBannerProps) {
  if (status !== "ACTIVE" && status !== "TRIAL") return null;
  if (daysLeft > 7) return null;

  const isExpired = daysLeft <= 0;

  return (
    <div className={`w-full py-2 px-4 flex items-center justify-center gap-4 text-sm font-bold animate-in slide-in-from-top duration-500 ${
      isExpired 
        ? "bg-red-600 text-white" 
        : "bg-amber-500 text-white"
    }`}>
      <div className="flex items-center gap-2">
        {isExpired ? <AlertCircle size={16} /> : <Zap size={16} />}
        <span>
          {isExpired 
            ? "Your subscription has expired. Please renew to avoid service interruption." 
            : `Your ${status === 'TRIAL' ? 'trial' : 'subscription'} expires in ${daysLeft} days.`}
        </span>
      </div>
      <Link 
        href="/settings?tab=subscription"
        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/30 backdrop-blur-sm"
      >
        Renew Now
      </Link>
    </div>
  );
}
