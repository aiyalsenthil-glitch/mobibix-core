import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HeroSlidesClient } from "../../../components/landing/HeroSlidesClient";

const competitors: Record<string, { name: string, weakness: string }> = {
  "vyapar": { name: "Vyapar", weakness: "generic stock tracking, not built for IMEI and mobile repairs" },
  "khatabook": { name: "Khatabook", weakness: "simple ledger, lacks advanced GST repair invoices" },
  "mybillbook": { name: "MyBillBook", weakness: "general retail, no WhatsApp CRM for mobile warranty" }
};

export async function generateMetadata({ params }: { params: { competitor: string } }): Promise<Metadata> {
  const competitor = competitors[params.competitor.toLowerCase()];
  if (!competitor) return { title: "Compare" };
  
  return {
    title: `MobiBix vs ${competitor.name} | Best POS for Mobile Shops`,
    description: `Why mobile repair shops are switching from ${competitor.name} to MobiBix. MobiBix is built specifically for IMEI tracking and repairs, unlike ${competitor.name} which is generic.`,
    alternates: {
      canonical: `https://REMOVED_DOMAIN/compare/${params.competitor.toLowerCase()}`
    }
  };
}

export default function ComparePage({ params }: { params: { competitor: string } }) {
  const competitor = competitors[params.competitor.toLowerCase()];
  if (!competitor) {
    notFound();
  }

  return (
    <>
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white min-h-[50vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 max-w-3xl pt-24 pb-16">
          <span className="inline-block py-1 px-3 rounded-full border border-white/10 bg-white/5 text-[10px] uppercase tracking-widest text-teal-400 mb-6">
            Software Comparison
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
            MobiBix vs <span className="text-stone-400">{competitor.name}</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            {competitor.name} is a great app for general stores. But for a mobile shop? You need IMEI tracking, repair job cards, and warranty CRM. That's why mobile retailers switch to MobiBix.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/" className="px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold transition-colors">
              See How MobiBix Works
            </Link>
          </div>
        </div>
      </div>
      
      {/* We reuse the HeroSlidesClient to drive home the mobile-first feature set */}
      <div className="relative">
        <HeroSlidesClient />
      </div>
    </>
  );
}
