import type { Metadata } from 'next';
import { FeatureDetail } from '../../../components/features/FeatureDetail';

export const metadata: Metadata = {
  title: "Multi-Shop Synchronization — Run Multiple Branches with Mobibix",
  description:
    "Centralize multiple shop locations into a single dashboard. Real-time stock sync, consolidated profit reports, and role-based staff access.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/features/multi-shop"
  },
  openGraph: {
    title: "Multi-Location POS Software — Sync Multiple Mobile Shops",
    description: "Run 2 or 20 locations from one account. Unified inventory and centralized owner oversight.",
    url: "https://REMOVED_DOMAIN/features/multi-shop",
  }
};

const capabilities = [
  {
    title: "Owner-Level Oversight",
    desc: "A single dashboard to monitor sales, repairs, and cash flow across all your branches in real-time."
  },
  {
    title: "Inter-Branch Stock Transfer",
    desc: "Move inventory between shops with full audit logs and transfer tracking. Low stock alerts for specific locations."
  },
  {
    title: "Location Performance",
    desc: "Compare revenue, margins, and technician performance across all locations with consolidated reporting."
  },
  {
    title: "Staff Role Isolation",
    desc: "Assign staff to specific locations with strict access controls while you keep the big picture view."
  },
  {
    title: "Global Product Master",
    desc: "Centrally manage products, prices, and taxes. Apply changes to all shops or specific locations instantly."
  },
  {
    title: "Consolidated Tax Returns",
    desc: "Generate tax reports for the whole organization or individual locations for seamless GST filing."
  }
];

const benefits = [
  "Uniform Pricing",
  "Central Inventory",
  "Branch Comparisons",
  "Role-Based Access",
  "Real-time Sync",
  "Lower Shrinkage",
  "Scale Faster",
  "Unified Master Data"
];

export default function MultiShopPage() {
  return (
    <FeatureDetail
      title="Multi-Shop Sync"
      subtitle="Your Entire Retail Empire, In One Dashboard."
      description="Running multiple shops Shouldn't mean multiple headaches. Mobibix syncs every branch, every sale, and every stock movement to a central hub. Whether your stores are across the street or across the country, you're always in control."
      image="/assets/features/multi-shop.png"
      capabilities={capabilities}
      benefits={benefits}
    />
  );
}
