import Link from "next/link";

export function HeroSectionStatic() {
  return (
    <div className="h-svh w-screen flex flex-col items-center justify-start relative px-5 shrink-0 overflow-hidden bg-background">
      <div className="h-28 md:h-44 w-full shrink-0" />
      <div className="relative z-10 w-full max-w-5xl text-center opacity-100">
        <div className="mb-6 md:mb-10 inline-flex items-center gap-3 px-4 md:px-5 py-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-3xl shadow-2xl shadow-primary/10">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.25em] md:tracking-[0.3em] text-primary">
            Trusted by 500+ Mobile Retailers
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl md:text-[8rem] font-black mb-6 md:mb-10 tracking-tighter leading-[0.85] md:leading-[0.8] text-foreground uppercase italic">
          All-in-One <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-500 to-indigo-500 drop-shadow-2xl">
            POS for Mobile Shops.
          </span>
        </h2>

        <p className="text-muted-foreground text-base md:text-xl lg:text-2xl font-bold max-w-2xl mx-auto mb-8 md:mb-16 leading-relaxed italic opacity-80">
          Manage sales, repairs, IMEI tracking, and customers in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8">
          <Link
            href="/auth"
            className="group relative w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest transition-all shadow-2xl shadow-primary/20 overflow-hidden text-sm md:text-base"
          >
            <span className="relative z-10">Start Free Trial</span>
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-6 rounded-2xl border-2 border-border text-foreground text-center font-black uppercase tracking-widest hover:bg-muted transition-all backdrop-blur-md text-sm md:text-base"
          >
            Pricing Plans
          </Link>
        </div>
      </div>

      <div className="absolute top-[20%] -left-[10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] -right-[10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-blue-500/20 rounded-full blur-[180px] pointer-events-none" />
    </div>
  );
}
