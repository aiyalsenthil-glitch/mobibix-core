import "./main.css";
import "./globals.css";
import "./tailwind.css";
import { Playfair_Display } from "next/font/google";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";

export const metadata = {
  title: "MobiBix – Run Your Mobile Shop Smarter",
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
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
