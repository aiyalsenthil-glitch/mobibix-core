"use client";

import Link from "next/link";
import Image from "next/image";

export function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t border-border bg-background relative z-10 transition-colors duration-300 ${compact ? "py-10 px-6" : "py-20 px-6"}`}>
      <div className="container mx-auto max-w-7xl">
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-16 ${compact ? "mb-10" : "mb-20"}`}>
          <div className="md:col-span-2 space-y-4 md:space-y-8">
            <div className="flex items-center gap-4">
              <Image src="/assets/mobibix-main-logo.png" alt="Mobibix" width={100} height={32} className="h-8 w-auto opacity-90 dark:brightness-200" />
              <span className="text-xl font-black tracking-tighter uppercase text-foreground">Mobibix</span>
            </div>
            {!compact && (
              <p className="text-muted-foreground font-medium text-lg max-w-sm leading-relaxed">
                The OS for modern Indian retail. Built to empower local shop owners with global-grade tools.
              </p>
            )}
            {compact && (
               <p className="text-muted-foreground font-bold text-xs max-w-sm leading-relaxed">
                The OS for modern Indian retail.
              </p>
            )}
          </div>
          
          <div className="col-span-1">
            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground/50 mb-6 font-mono">Company</h4>
            <div className={`flex flex-col gap-3 ${compact ? "text-xs" : "text-sm"} font-bold text-muted-foreground`}>
              <Link href="/features" className="hover:text-primary transition-colors">Features</Link>
              <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
              <Link href="/partner" className="hover:text-primary transition-colors">Partner Program</Link>
              <Link href="/partner/tiers" className="hover:text-primary transition-colors">Partner Tiers</Link>
              <Link href="/support" className="hover:text-primary transition-colors">Support</Link>
            </div>
          </div>

          <div className="col-span-1 mt-8 md:mt-0">
            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground/50 mb-6 font-mono">Compare</h4>
            <div className={`flex flex-col gap-3 ${compact ? "text-xs" : "text-sm"} font-bold text-muted-foreground`}>
              <Link href="/compare/repairdesk" className="hover:text-primary transition-colors">vs RepairDesk</Link>
              <Link href="/compare/repairshopr" className="hover:text-primary transition-colors">vs RepairShopr</Link>
              <Link href="/compare/fixably" className="hover:text-primary transition-colors">vs Fixably</Link>
              <Link href="/compare/vyapar" className="hover:text-primary transition-colors">vs Vyapar</Link>
              <Link href="/compare/khatabook" className="hover:text-primary transition-colors">vs KhataBook</Link>
              <Link href="/compare/tally" className="hover:text-primary transition-colors">vs TallyPrime</Link>
              <Link href="/compare/busy" className="hover:text-primary transition-colors">vs Busy</Link>
            </div>
          </div>

          <div className="col-span-1 mt-8 md:mt-0">
            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground/50 mb-6 font-mono">Regions</h4>
            <div className={`flex flex-col gap-3 ${compact ? "text-xs" : "text-sm"} font-bold text-muted-foreground`}>
              <Link href="/regions/india" className="hover:text-primary transition-colors">India</Link>
              <Link href="/regions/uae" className="hover:text-primary transition-colors">UAE</Link>
              <Link href="/regions/saudi-arabia" className="hover:text-primary transition-colors">Saudi Arabia</Link>
              <Link href="/regions/malaysia" className="hover:text-primary transition-colors">Malaysia</Link>
              <Link href="/regions/indonesia" className="hover:text-primary transition-colors">Indonesia</Link>
            </div>
          </div>

          <div className="col-span-1 mt-8 md:mt-0">
            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground/50 mb-6 font-mono">Cities</h4>
            <div className={`flex flex-col gap-3 ${compact ? "text-xs" : "text-sm"} font-bold text-muted-foreground`}>
              <Link href="/locations/mumbai" className="hover:text-primary transition-colors">Mumbai</Link>
              <Link href="/locations/delhi" className="hover:text-primary transition-colors">Delhi</Link>
              <Link href="/locations/bangalore" className="hover:text-primary transition-colors">Bangalore</Link>
              <Link href="/locations/hyderabad" className="hover:text-primary transition-colors">Hyderabad</Link>
              <Link href="/locations/chennai" className="hover:text-primary transition-colors">Chennai</Link>
              <Link href="/locations/pune" className="hover:text-primary transition-colors">Pune</Link>
              <Link href="/locations/ahmedabad" className="hover:text-primary transition-colors">Ahmedabad</Link>
              <Link href="/locations/jaipur" className="hover:text-primary transition-colors">Jaipur</Link>
            </div>
          </div>

          <div className="col-span-1 mt-8 md:mt-0">
            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground/50 mb-6 font-mono">Legal</h4>
            <div className={`flex flex-col gap-3 ${compact ? "text-xs" : "text-sm"} font-bold text-muted-foreground`}>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
              <Link href="/cancellation-and-refund" className="hover:text-primary transition-colors">Cancellation & Refund</Link>
              <Link href="/shipping-and-exchange" className="hover:text-primary transition-colors">Shipping & Exchange</Link>
              <Link href="/contact-us" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>

        <div className={`${compact ? "pt-6" : "pt-8"} border-t border-border flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8`}>
          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-muted-foreground">
            © 2026 Mobibix
          </div>
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] uppercase font-black tracking-widest text-primary font-mono tracking-tighter">Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
