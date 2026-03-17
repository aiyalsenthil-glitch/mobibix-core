import type { Metadata } from 'next';
import { SupportClient } from '../../components/support/SupportClient';

export const metadata: Metadata = {
  title: "Support — MobiBix Help Center",
  description:
    "Get 24/7 assistance for your mobile shop. Access our knowledge base, contact email support, or get direct WhatsApp help for your retail business.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/support"
  }
};

export default function SupportPage() {
  return <SupportClient />;
}
