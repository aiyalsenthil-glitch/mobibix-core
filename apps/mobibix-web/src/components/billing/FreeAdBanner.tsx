"use client";

import { useEffect, useRef, useState } from "react";
import { getTenantUsage } from "@/services/tenant.api";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Renders a Google AdSense unit — ONLY for FREE forever plan users.
 * showAds flag comes from /tenant/usage (backend: plan.isLifetime && plan.level === 0).
 * Trial and paid users never see this component.
 *
 * TODO: Replace data-ad-slot with your real Ad Unit ID from https://adsense.google.com
 * Publisher: ca-pub-9978470190162608
 */
export function FreeAdBanner() {
  const [showAds, setShowAds] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    getTenantUsage()
      .then((data) => setShowAds(!!data.showAds))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showAds || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet — safe to ignore
    }
  }, [showAds]);

  if (!showAds) return null;

  return (
    <div className="mx-4 lg:mx-8 mt-3 mb-1 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-9978470190162608"
        data-ad-slot="TODO_REPLACE_WITH_AD_SLOT_ID"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
