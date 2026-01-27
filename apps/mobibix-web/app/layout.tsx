import "./globals.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { Providers } from "./providers";

export const metadata = {
  title: "MobiBix – Digital Retail Platform",
  description: "Mobile shop ERP & repair management platform",
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
      <body className="antialiased bg-gray-50 dark:bg-gray-950 text-black dark:text-white transition-colors duration-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
