import type { Metadata } from 'next';
import { FeatureDetail } from '../../../components/features/FeatureDetail';

export const metadata: Metadata = {
  title: "GST Cloud Billing — Professional GST Invoices for Mobile Shops",
  description:
    "Generate GST-compliant invoices in 5 seconds. Automate CGST, SGST, IGST calculations and HSN/SAC reporting with Mobibix.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/features/gst-billing"
  },
  openGraph: {
    title: "GST Invoicing Software — Built for India Mobile Shops",
    description: "Generate professional tax invoices, manage GSTIN-registered customers, and file GSTR-1 & GSTR-2 easily.",
    url: "https://REMOVED_DOMAIN/features/gst-billing",
  }
};

const capabilities = [
  {
    title: "5-Second Billing",
    desc: "Generate professional tax invoices in seconds. Pre-filled customer data and rapid search make billing a breeze."
  },
  {
    title: "GST Calculation",
    desc: "Automated SGST, CGST, and IGST calculations based on customer location and product GST rates."
  },
  {
    title: "HSN/SAC Management",
    desc: "Pre-loaded HSN/SAC codes for mobile devices, accessories, and repair services for accurate tax reporting."
  },
  {
    title: "GSTR-1 & GSTR-2 Reports",
    desc: "Export B2B and B2C summaries directly as CSV for easy filing with the GST portal."
  },
  {
    title: "Professional Print Layouts",
    desc: "Thermal or A4 invoice prints with your logo, shop details, and custom terms & conditions."
  },
  {
    title: "E-Way Bill Ready",
    desc: "Export necessary data for E-Way bill generation on the fly for high-value shipments."
  }
];

const benefits = [
  "No Tax Mistakes",
  "Easy GSTR Filing",
  "Professional Branding",
  "Paperless Record",
  "Automated Calculations",
  "ITC Tracking",
  "Compliance Shield",
  "Quick Billing"
];

export default function GstBillingPage() {
  return (
    <FeatureDetail
      title="GST Billing"
      subtitle="Cloud-Powered, Compliance-First Invoicing."
      description="Billing should be the fastest part of your day, not the most stressful. Mobibix automates the complexity of Indian GST law so you can focus on sales. From B2B invoices with GSTIN validation to B2C retail summaries, we handle it all with zero effort."
      image="/assets/features/gst-billing.png"
      capabilities={capabilities}
      benefits={benefits}
    />
  );
}
