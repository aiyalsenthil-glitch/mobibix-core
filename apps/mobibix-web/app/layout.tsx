import "./globals.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import FacebookSDK from "../components/FacebookSDK";
import ReferralTracker from "../components/ReferralTracker";
import { Suspense } from "react";
import Script from "next/script";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "MobiBix — Mobile Shop POS & Management Platform",
  description:
    "Run your mobile shop smarter. IMEI tracking, repair management, GST billing and customer records — all in one platform built for Indian mobile retailers.",
  metadataBase: new URL("https://REMOVED_DOMAIN"),
  applicationName: "MobiBix",
  manifest: "/manifest.json",
  icons: { 
    icon: "/assets/mobibix-app-icon.png",
    apple: "/assets/mobibix-app-icon.png"
  },
  openGraph: {
    title: "MobiBix — The Retail OS for Indian Mobile Shops",
    description: "Track IMEI, manage repairs, generate GST bills and run your mobile shop from anywhere.",
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
    creator: "@mobibix",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "format-detection": "telephone=no",
  },
};
export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "Organization",
               "name": "MobiBix",
               "url": "https://REMOVED_DOMAIN",
               "logo": "https://REMOVED_DOMAIN/assets/mobibix-app-icon.png",
               "contactPoint": {
                 "@type": "ContactPoint",
                 "contactType": "customer support"
               }
             })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "SoftwareApplication",
               "name": "MobiBix POS",
               "operatingSystem": "Web",
               "applicationCategory": "BusinessApplication",
               "offers": {
                 "@type": "Offer",
                 "price": "999",
                 "priceCurrency": "INR"
               }
             })
          }}
        />
        <Script 
          async 
          src="https://www.googletagmanager.com/gtag/js?id=G-D8LB3XZ1XQ" 
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-D8LB3XZ1XQ');
          `}
        </Script>
      </head>
      <body className="antialiased bg-background text-foreground transition-colors duration-200">
        <Providers>
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
          {children}
          <FacebookSDK />
        </Providers>
      </body>
    </html>
  );
}
