import type { Metadata } from 'next';
import { FeaturesClient } from '../../components/features/FeaturesClient';

export const metadata: Metadata = {
  title: "Core Features — Mobibix Mobile Shop OS",
  description:
    "Explore the industry-leading features of Mobibix, including IMEI tracking, repair job pipelines, GST cloud billing, and automated WhatsApp CRM.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/features"
  },
  openGraph: {
    title: "Mobibix Features — Engineered for Retail Excellence",
    description: "IMEI management, GST billing, and WhatsApp notifications built for Indian mobile shops.",
    url: "https://REMOVED_DOMAIN/features",
  }
};

export default function FeaturesPage() {
  return <FeaturesClient />;
}
