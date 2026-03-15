"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    const promo = searchParams.get("promo");

    if (ref) {
      sessionStorage.setItem("mb_ref", ref);
      console.log("📍 Captured referral code:", ref);
    }
    
    if (promo) {
      sessionStorage.setItem("mb_promo", promo);
      console.log("📍 Captured promo code:", promo);
    }
  }, [searchParams]);

  return null;
}
