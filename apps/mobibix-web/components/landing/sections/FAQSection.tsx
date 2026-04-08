"use client";

import { motion } from "framer-motion";

interface FAQSectionProps {
  activeSection: number;
}

export function FAQSection({ activeSection }: FAQSectionProps) {
  const faqs = [
    { q: "Is this built for mobile shops?", a: "Yes, specifically. We have native support for IMEI tracking and repair job-cards which generic billing apps lack." },
    { q: "Can I track repairs and pending jobs?", a: "Absolutely. You can see live status of every repair and even send automatic updates to customers on WhatsApp." },
    { q: "Is it easy to use for shop managers?", a: "MobiBix is built with a focus on speed. Generating a full GST-compliant invoice takes only 5-10 seconds." },
    { q: "Can I import my existing product data?", a: "Yes. You can upload your current stock via Excel and start your first sale within 5 minutes of setup." },
  ];

  return (
    <div className="h-svh w-screen flex flex-col items-center justify-start px-5 md:px-6 shrink-0 bg-background relative overflow-hidden transition-colors duration-500 overflow-y-auto">
      <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="h-28 md:h-44 w-full shrink-0" />
      <div className="w-full max-w-4xl relative z-10 max-h-[90svh] pb-10">
        <div className="mb-8 md:mb-16 text-center">
          <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-3 block">
            Operations Mastery
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-[6rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.85] md:leading-[0.8] mb-4 md:mb-8">
            The FAQ.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 md:gap-x-20 gap-y-8 md:gap-y-16">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              animate={activeSection === 7 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ delay: i * 0.1 }}
              className="group border-l-4 border-primary/20 pl-5 md:pl-8 hover:border-primary transition-colors"
            >
              <h3 className="text-base md:text-xl font-black text-foreground mb-2 md:mb-4 group-hover:text-primary transition-colors uppercase italic leading-tight">
                {faq.q}
              </h3>
              <p className="text-muted-foreground font-bold text-[10px] md:text-xs uppercase tracking-widest leading-loose opacity-60">
                {faq.a}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
