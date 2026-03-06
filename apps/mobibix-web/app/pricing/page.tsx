import type { Metadata } from "next";
import { PricingToggleClient } from "../../components/pricing/PricingToggleClient";

export const metadata: Metadata = {
  title: "Pricing — MobiBix Mobile Shop OS",
  description:
    "Simple, transparent pricing for Indian mobile shop owners. Start free for 14 days — no credit card required.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/pricing"
  }
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
    const json = await res.json();
    // Wrap handling: Backend returns { success: true, data: { MOBILE_SHOP: [...] } }
    const plans = json?.data?.MOBILE_SHOP ?? json?.MOBILE_SHOP ?? [];
    return plans;
  } catch {
    return [];
  }
}

export default async function PricingPage() {
  const plans = await fetchPricing();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Does MobiBix support WhatsApp Business API for repair updates?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! We integrate officially via WhatsApp Cloud API allowing automated repair tickets, job card delivery, and digital GST invoices instantly sent to your customers."
        }
      },
      {
        "@type": "Question",
        "name": "Can I track mobile serial numbers and IMEI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. Our platform is built specifically for electronic shops, so IMEI tracking is native to every purchase, sale, and stock transfer with complete history lookup."
        }
      },
      {
        "@type": "Question",
        "name": "Are there any hidden costs for multi-shop synchronization?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Multi-location synchronization is fully baked into all pro levels. Extra locations simply run on per-seat pricing scaling linearly."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <PricingToggleClient plans={plans} />
    </>
  );
}
