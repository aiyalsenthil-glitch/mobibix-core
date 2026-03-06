import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "MobiBix Features — IMEI Tracking, Job Cards, GST Billing & WhatsApp CRM",
  description: "Explore MobiBix features: complete mobile shop management, inventory tracking, GST billing, job cards, and WhatsApp CRM for Indian retailers.",
  alternates: { canonical: "https://REMOVED_DOMAIN/features" },
  openGraph: {
    title: "MobiBix Features",
    description: "Explore MobiBix features: complete mobile shop management, inventory tracking, GST billing, and WhatsApp CRM.",
    url: "https://REMOVED_DOMAIN/features",
    type: "website",
  }
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
