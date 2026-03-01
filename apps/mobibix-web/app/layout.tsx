import "./globals.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import FacebookSDK from "../components/FacebookSDK";

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "MobiBix — Mobile Shop POS & Management Platform",
  description:
    "Run your mobile shop smarter. IMEI tracking, repair management, GST billing and customer records — all in one platform built for Indian mobile retailers.",
  metadataBase: new URL("https://REMOVED_DOMAIN"),
  alternates: { canonical: "/" },
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
        url: "/assets/mobibix-app-icon.png",
        width: 800,
        height: 600,
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MobiBix — Mobile Shop POS",
    description: "Complete OS for mobile retailers. Manage EMI, repairs, and GST billing.",
    images: ["/assets/mobibix-app-icon.png"],
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
      <body className="antialiased bg-background text-foreground transition-colors duration-200">
        <Providers>
          {children}
          <FacebookSDK />
        </Providers>
      </body>
    </html>
  );
}
