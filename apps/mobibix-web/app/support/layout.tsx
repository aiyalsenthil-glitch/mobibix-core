import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Support & Help — MobiBix POS",
  description: "Get 24/7 help with MobiBix. Contact us via email, WhatsApp CRM, or browse our knowledge base for guides on mobile shop management.",
  alternates: { canonical: "https://REMOVED_DOMAIN/support" },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
