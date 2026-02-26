import { HeroSlidesClient } from "../components/landing/HeroSlidesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MobiBix — Mobile Shop POS, IMEI Tracking & Repair Management Software",
  description:
    "Run your mobile shop smarter. Manage IMEI stock, repair jobs, GST billing, and customer records — all in one platform built for Indian mobile retailers.",
  keywords: [
    "mobile shop software",
    "mobile shop POS India",
    "IMEI tracking software",
    "mobile repair management",
    "GST billing mobile shop",
    "mobile shop ERP India",
  ],
  openGraph: {
    title: "MobiBix — The Retail OS for Indian Mobile Shops",
    description:
      "Track IMEI, manage repairs, generate GST bills and run your mobile shop from anywhere.",
    url: "https://REMOVED_DOMAIN",
    siteName: "MobiBix",
    locale: "en_IN",
    type: "website",
  },
};

export default function HomePage() {
  return <HeroSlidesClient />;
}
