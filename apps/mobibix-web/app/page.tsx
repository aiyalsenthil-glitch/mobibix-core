import { HeroSlidesClient } from "../components/landing/HeroSlidesClient";
import { WhatsAppWidget } from "../components/landing/WhatsAppWidget";
import type { Metadata } from "next";
import { getAllPosts } from "../lib/blog";
import { BlogSection } from "../components/landing/BlogSection";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";

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
  const posts = getAllPosts();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MobiBix",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
    description:
      "Mobile Shop POS and Retail OS for Indian mobile retailers. Manage IMEI tracking, repairs, and GST billing.",
    url: "https://REMOVED_DOMAIN",
    inLanguage: "en-IN",
    publisher: {
      "@type": "Organization",
      name: "MobiBix",
      url: "https://REMOVED_DOMAIN",
    },
  };

  return (
    <main className="min-h-screen bg-background transition-colors duration-500 overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSlidesClient posts={posts} />
      <WhatsAppWidget />
    </main>
  );
}
