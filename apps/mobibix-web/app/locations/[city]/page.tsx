import type { Metadata } from "next";
import { HeroSlidesClient } from "@/components/landing/HeroSlidesClient";
import Link from "next/link";

export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const city = params.city.charAt(0).toUpperCase() + params.city.slice(1).replace("-", " ");
  
  return {
    title: `Best Mobile Shop POS Software in ${city} | MobiBix`,
    description: `Leading mobile repair and IMEI tracking software for retail shops in ${city}. Streamline your GST billing, inventory, and WhatsApp CRM today.`,
    alternates: {
      canonical: `https://REMOVED_DOMAIN/locations/${params.city.toLowerCase()}`
    }
  };
}

export default function LocationPage({ params }: { params: { city: string } }) {
  const city = params.city.charAt(0).toUpperCase() + params.city.slice(1).replace("-", " ");
  
  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white min-h-[50vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-3xl pt-24 pb-16">
          <span className="inline-block py-1 px-3 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-purple-400 mb-6">
            Local Retail Software
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
            The #1 Mobile Shop Software in <span className="text-teal-400">{city}</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Hundreds of mobile retailers and repair centers across India trust MobiBix to handle their IMEI inventory, GST compliance, and customer follow-ups.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/" className="px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold transition-colors">
              Explore MobiBix Features
            </Link>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <HeroSlidesClient />
      </div>
    </>
  );
}
