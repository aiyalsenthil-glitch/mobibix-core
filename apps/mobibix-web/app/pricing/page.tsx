import type { Metadata } from "next";
import { PricingToggleClient } from "../../components/pricing/PricingToggleClient";

export const metadata: Metadata = {
  title: "Pricing — MobiBix Mobile Shop POS Software",
  description:
    "Simple, transparent pricing for Indian mobile shop owners. Start free for 14 days — no credit card required.",
};

interface PricingCycle {
  cycle: string;
  price: number;
  priceFormatted: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  level: number;
  tagline: string;
  description: string;
  features: string[];
  pricing: PricingCycle[];
  limits: {
    maxStaff: number | null;
    maxShops: number | null;
    whatsappUtilityQuota: number;
    whatsappMarketingQuota: number;
  };
  savings: {
    yearly: number;
    yearlyPercent: number;
    yearlyFormatted: string;
  };
}

async function fetchPricing(): Promise<Plan[]> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";
    const res = await fetch(
      `${apiBase}/plans/public/pricing?module=MOBILE_SHOP`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.MOBILE_SHOP ?? [];
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const plans = await fetchPricing();
  return <PricingToggleClient plans={plans} />;
}
