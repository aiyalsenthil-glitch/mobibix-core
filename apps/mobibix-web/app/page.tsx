import { HeroSlidesClient } from "../components/landing/HeroSlidesClient";
import { WhatsAppWidget } from "../components/landing/WhatsAppWidget";
import type { Metadata } from "next";
import { getAllPosts } from "../lib/blog";
import { BlogSection } from "../components/landing/BlogSection";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";

export const metadata: Metadata = {
  title: "Mobibix — The Retail OS for Mobile Shops",
  description:
    "India's best mobile shop POS. Manage IMEI tracking, repair jobs, GST billing, and inventory. Trusted by 5000+ Indian mobile retailers. Start your free trial today.",
  keywords: [
    "mobile shop software",
    "mobile shop POS India",
    "IMEI tracking software",
    "mobile repair management",
    "GST billing mobile shop",
    "mobile shop ERP India",
    "cell phone store software",
    "mobile shop inventory management",
    "billing app for mobile shop",
    "mobile distributor software India",
    "B2B wholesale platform mobile shops",
    "distributor network mobile shop",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "MobiBix — The Retail OS for Indian Mobile Shops",
    description:
      "Track IMEI, manage repairs, generate GST bills and run your mobile shop from anywhere. Start 14-day free trial.",
    url: "https://REMOVED_DOMAIN",
    siteName: "MobiBix",
    images: [
      {
        url: "/assets/og-banner.png",
        width: 1200,
        height: 630,
        alt: "MobiBix — The Modern OS for Mobile Retailers",
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MobiBix — The Retail OS for Indian Mobile Shops",
    description: "WhatsApp notifications, GST billing, and IMEI tracking for modern mobile shops.",
    images: ["/assets/og-banner.png"],
  },
};

export default function HomePage() {
  const posts = getAllPosts();
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mobibix",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    offers: { "@type": "Offer", priceCurrency: "INR", price: "0" },
    description:
      "Mobile Shop POS and Retail OS for Indian mobile retailers. Manage IMEI tracking, repairs, and GST billing.",
    url: "https://REMOVED_DOMAIN",
    inLanguage: "en-IN",
    publisher: {
      "@type": "Organization",
      name: "Mobibix",
      url: "https://REMOVED_DOMAIN",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://REMOVED_DOMAIN",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://REMOVED_DOMAIN/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Mobibix?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Mobibix is a complete Operating System for Indian mobile retailers, providing IMEI tracking, repair management, GST billing, and inventory control."
        }
      },
      {
        "@type": "Question",
        "name": "Does Mobibix support IMEI tracking?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Mobibix offers serial-perfect IMEI tracking to help you manage stock and prevent theft with 100% accuracy."
        }
      },
      {
        "@type": "Question",
        "name": "Can I generate GST bills with Mobibix?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. Mobibix allows you to generate professional, GST-compliant invoices in just 5 seconds."
        }
      },
      {
        "@type": "Question",
        "name": "Does Mobibix provide WhatsApp integration?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Mobibix automates payment reminders and repair status updates via WhatsApp to help you get paid faster."
        }
      },
      {
        "@type": "Question",
        "name": "Does Mobibix support distributor and wholesale management?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Mobibix includes a free Distributor Network for mobile parts wholesalers. Distributors can publish a catalog, receive purchase orders, and track retailer stock visibility. ERP users can link to multiple distributors and control what each one can see."
        }
      }
    ]
  };

  return (
    <main className="min-h-screen bg-background transition-colors duration-500 overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <HeroSlidesClient posts={posts} />
      <WhatsAppWidget />
    </main>
  );
}
