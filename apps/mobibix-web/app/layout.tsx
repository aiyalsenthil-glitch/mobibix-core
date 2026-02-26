import "./globals.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import FacebookSDK from "../components/FacebookSDK";

export const metadata = {
  title: "MobiBix — Mobile Shop POS & Management Platform",
  description:
    "Run your mobile shop smarter. IMEI tracking, repair management, GST billing and customer records — all in one platform built for Indian mobile retailers.",
  metadataBase: new URL("https://REMOVED_DOMAIN"),
  alternates: { canonical: "/" },
  icons: { icon: "/assets/mobibix-app-icon.png" },
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
