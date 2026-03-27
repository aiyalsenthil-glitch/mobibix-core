import type { Metadata } from 'next';
import { FeatureDetail } from '../../../components/features/FeatureDetail';

export const metadata: Metadata = {
  title: "Repair Job Pipeline — Manage Mobile Repairs with Mobibix",
  description:
    "Track repair statuses, assign technicians, manage parts, and notify customers via WhatsApp. The ultimate mobile repair management pipeline for retail shops.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/features/repair-pipeline"
  },
  openGraph: {
    title: "Mobibix Repair Pipeline — Status Tracking & Part Management",
    description: "Real-time repair tracking from intake to delivery. Automated WhatsApp updates and inventory sync.",
    url: "https://REMOVED_DOMAIN/features/repair-pipeline",
  }
};

const capabilities = [
  {
    title: "5-Stage Tracking",
    desc: "Move jobs through Received, In-Progress, Waiting for Parts, Ready, and Delivered stages with a single click."
  },
  {
    title: "Technician Assignment",
    desc: "Assign jobs to specific technicians and track their performance, turnaround time, and repair success rates."
  },
  {
    title: "Parts Inventory Sync",
    desc: "Deduct spare parts directly from your inventory. Cost prices are snapshotted at the time of repair for accurate profit reporting."
  },
  {
    title: "Advance & Refund",
    desc: "Securely track advance payments and manage refunds for cancelled jobs with integrated financial accounting."
  },
  {
    title: "Warranty Rework",
    desc: "Handle repair returns professionally. Create linked rework jobs with one click, keeping original history intact."
  },
  {
    title: "WhatsApp Status Alerts",
    desc: "Automatically notify customers when their device is ready, or if more time is needed for parts."
  }
];

const benefits = [
  "Zero Paperwork",
  "Real-time Tracking",
  "No Missing Parts",
  "Automated Alerts",
  "Technician Accountability",
  "QR Code Intake",
  "Revenue Protection",
  "Happy Customers"
];

export default function RepairPipelinePage() {
  return (
    <FeatureDetail
      title="Repair Pipeline"
      subtitle="Engineering the perfect workflow for your service center."
      description="The Mobibix Repair Job Pipeline is built specifically for the chaos of mobile repairs. From tracking complex part movements to managing customer expectations via automated WhatsApp updates, we handle the workflow while you focus on fixing."
      image="/assets/features/repair-pipeline.png"
      capabilities={capabilities}
      benefits={benefits}
    />
  );
}
