import "./globals.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { Providers } from "./providers";
import FacebookSDK from "../components/FacebookSDK";

export const metadata = {
  title: "MobiBix – Digital Retail Platform",
  description: "Mobile shop ERP & repair management platform",
  icons: {
    icon: "/assets/mobibix-app-icon.png",
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
