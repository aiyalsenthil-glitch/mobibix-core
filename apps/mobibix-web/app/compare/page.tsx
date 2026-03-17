import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import Link from "next/link";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Compare MobiBix — Best Mobile Repair Software Comparison",
  description: "See how MobiBix compares against RepairDesk, RepairShopr, Vyapar, and Tally. Choose the best POS and Billing software for your mobile shop.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/compare"
  }
};

export default function CompareIndexPage() {
  const competitors = [
    { name: "RepairDesk", slug: "repairdesk", desc: "Global high-end repair software" },
    { name: "RepairShopr", slug: "repairshopr", desc: "US-focused ticketing system" },
    { name: "Fixably", slug: "fixably", desc: "Authorised service provider tool" },
    { name: "Vyapar", slug: "vyapar", desc: "Generic Indian billing app" },
    { name: "Tally", slug: "tally", desc: "Powerful Indian accounting ERP" },
    { name: "Busy", slug: "busy", desc: "Feature-rich business ERP" },
    { name: "KhataBook", slug: "khatabook", desc: "Basic digital ledger" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter italic">Comparison Hub</h1>
          <p className="text-xl text-muted-foreground font-bold">See how MobiBix stacks up against the world's leading repair shop software.</p>
        </div>

        <div className="container mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {competitors.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`} className="group p-8 rounded-[2.5rem] bg-card border border-border hover:border-primary transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-2 group-hover:text-primary">MobiBix vs {c.name}</h3>
                <p className="text-muted-foreground font-medium">{c.desc}</p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                View Comparison
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
