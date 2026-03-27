import type { Metadata } from 'next';
import { FeatureDetail } from '../../../components/features/FeatureDetail';

export const metadata: Metadata = {
  title: "Advanced Profit Analytics — Understand Your Margins with Mobibix",
  description:
    "Real-time profit reporting, sales trend analysis, payment mode distribution, and inventory valuation for mobile shops with Mobibix.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/features/profit-analytics"
  },
  openGraph: {
    title: "Profit Tracking Software — Built for Mobile Retailers",
    description: "Real-time margins on repairs and sales. Customer lifecycle value and payment distributions.",
    url: "https://REMOVED_DOMAIN/features/profit-analytics",
  }
};

const capabilities = [
  {
    title: "Owner-Centric KPIs",
    desc: "Dashboards designed to monitor your sales, cash flow, and pending payables at a single glance."
  },
  {
    title: "Real-time Profit",
    desc: "Automatically calculate net profit on sales and repairs. Our system snapshots cost at time of sale for precision."
  },
  {
    title: "Payment Trends",
    desc: "Track UPI, Cash, and Card distributions. Identify payment modes with high collection rates or friction."
  },
  {
    title: "Inventory Valuation",
    desc: "Monitor your current stock value and identify dead stock items sitting on your shelves."
  },
  {
    title: "Customer Insights",
    desc: "Track top spending customers and identify those at risk of churn with lifecycle reporting."
  },
  {
    title: "Sales Trend Analysis",
    desc: "Visualize daily, weekly, and monthly trends to predict your busy seasons and scale accordingly."
  }
];

const benefits = [
  "Accurate Margins",
  "Zero Guesswork",
  "Cash Flow Health",
  "Better Sourcing",
  "Growth Trends",
  "Lower dead stock",
  "Net Worth Insight",
  "Data-Led Growth"
];

export default function ProfitAnalyticsPage() {
  return (
    <FeatureDetail
      title="Profit Analytics"
      subtitle="Data-Driven Decisions for Retail Growth."
      description="Stop guessing your margins. Mobibix captures the cost of every part used and every device sold to give you a true picture of your profit. With automated dashboards for cash flow and stock value, you're always leading with data."
      image="/assets/features/profit-analytics.png"
      capabilities={capabilities}
      benefits={benefits}
    />
  );
}
