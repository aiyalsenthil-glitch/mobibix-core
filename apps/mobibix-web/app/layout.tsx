import "./globals.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import FacebookSDK from "@/components/FacebookSDK";
import ReferralTracker from "@/components/ReferralTracker";
import { Suspense } from "react";
import Script from "next/script";
import { Metadata, Viewport } from 'next';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
  ],
};


export const metadata: Metadata = {
  title: "Mobibix — The Retail OS for Mobile Shops",
  description:
    "Run your mobile shop smarter. IMEI tracking, repair management, GST billing and customer records — all in one platform built for Indian mobile retailers.",
  // CRITICAL: metadataBase must be non-www to match Vercel normalization and sitemap URLs
  metadataBase: new URL("https://REMOVED_DOMAIN"),
  applicationName: "Mobibix",
  manifest: "/manifest.json",
  icons: { 
    icon: "/assets/mobibix-icon.png",
    shortcut: "/assets/mobibix-icon.png",
    apple: "/assets/mobibix-icon.png"
  },
  openGraph: {
    title: "Mobibix — The Retail OS for Indian Mobile Shops",
    description: "Track IMEI, manage repairs, generate GST bills and run your mobile shop from anywhere.",
    url: "https://REMOVED_DOMAIN",
    siteName: "Mobibix",
    images: [
      {
        url: "/assets/og-banner.png",
        width: 1200,
        height: 630,
        alt: "Mobibix — The Modern OS for Mobile Retailers",
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobibix — The Retail OS for Indian Mobile Shops",
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
  display: "swap",
});

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  preload: true,
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
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "Organization",
               "name": "Mobibix",
               "url": "https://REMOVED_DOMAIN",
               "logo": "https://REMOVED_DOMAIN/logo.png"
             })
          }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "SoftwareApplication",
               "name": "Mobibix POS",
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
        {/* Google AdSense — plain script tag so Google crawler finds it in static HTML */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9978470190162608"
          crossOrigin="anonymous"
          suppressHydrationWarning
        />
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-D8LB3XZ1XQ"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-D8LB3XZ1XQ');
          `}
        </Script>
        <link rel="preconnect" href="https://gym-saas-prod.REMOVED_AUTH_PROVIDERapp.com" crossOrigin="anonymous" />
      </head>
      <body 
        className="antialiased bg-background text-foreground transition-colors duration-200"
        suppressHydrationWarning
      >
        <Providers>
          <Suspense fallback={null}>
            <ReferralTracker />
          </Suspense>
          {children}
          <FacebookSDK />
          <SpeedInsights />
          <Analytics />
        </Providers>
      </body>

    </html>
  );
}
