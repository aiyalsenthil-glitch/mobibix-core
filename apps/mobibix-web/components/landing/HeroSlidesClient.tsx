"use client";

import "../../app/animations.css";
import { useEffect, useState, useRef } from "react";
import { Header } from "../layout/Header";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Footer = dynamic(() => import("../layout/Footer").then((m) => m.Footer));
import { BlogSection } from "./BlogSection";
import { TestimonialsSection } from "./TestimonialsSection";

// Import atomic sections
import { HeroSection } from "./sections/HeroSection";
import { ProblemSection } from "./sections/ProblemSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { ShowcaseSection } from "./sections/ShowcaseSection";
import { PricingSection } from "./sections/PricingSection";
import { FAQSection } from "./sections/FAQSection";
import { CTASection } from "./sections/CTASection";

export function HeroSlidesClient({ posts }: { posts: any[] }) {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollCooldown = useRef(0);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const sections = [
    { id: "hero", label: "Hero" },
    { id: "problem", label: "The Problem" },
    { id: "features", label: "Solution" },
    { id: "stats", label: "Showcase" },
    { id: "blog", label: "Insights" },
    { id: "testimonials", label: "Trust" },
    { id: "pricing", label: "Pricing" },
    { id: "faq", label: "FAQ" },
    { id: "cta", label: "Start" },
    { id: "footer", label: "Links" },
  ];

  const goNext = () => setActiveSection(prev => Math.min(prev + 1, sections.length - 1));
  const goPrev = () => setActiveSection(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 900) return;
      if (e.deltaY > 50 && activeSection < sections.length - 1) {
        goNext();
        scrollCooldown.current = now;
      } else if (e.deltaY < -50 && activeSection > 0) {
        goPrev();
        scrollCooldown.current = now;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      else if (e.key === "ArrowUp") goPrev();
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - scrollCooldown.current < 700) return;
      const dy = touchStartY.current - e.changedTouches[0].clientY;
      const dx = Math.abs(touchStartX.current - e.changedTouches[0].clientX);
      if (Math.abs(dy) < 50 || dx > Math.abs(dy)) return;
      if (dy > 0) {
        goNext();
      } else {
        goPrev();
      }
      scrollCooldown.current = now;
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [activeSection]);

  if (!mounted) return null;

  return (
    <div className="relative h-svh w-screen overflow-hidden bg-background">
      <Header />
      
      <div 
        className="flex flex-col h-full transition-transform duration-[1200ms] cubic-bezier(0.23, 1, 0.32, 1)"
        style={{ transform: `translateY(-${activeSection * 100}svh)` }}
      >
        {/* Slide 0: Hero */}
        <HeroSection activeSection={activeSection} />

        {/* Slide 1: Problem */}
        {Math.abs(activeSection - 1) <= 1 ? (
          <ProblemSection activeSection={activeSection} />
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 2: Features */}
        {Math.abs(activeSection - 2) <= 1 ? (
          <FeaturesSection activeSection={activeSection} />
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 3: Showcase */}
        {Math.abs(activeSection - 3) <= 1 ? (
          <ShowcaseSection activeSection={activeSection} />
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 4: Blog */}
        {Math.abs(activeSection - 4) <= 1 ? (
          <div className="h-svh w-screen flex flex-col items-center justify-start px-4 md:px-6 shrink-0 bg-background relative overflow-hidden overflow-y-auto scrollbar-none">
            <div className="h-28 md:h-44 w-full shrink-0" />
            <motion.div
              animate={activeSection === 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              className="w-full max-w-7xl pb-10 overflow-y-auto scrollbar-none flex-1"
            >
              <BlogSection posts={posts} />
            </motion.div>
          </div>
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 5: Trust */}
        {Math.abs(activeSection - 5) <= 1 ? (
          <div className="h-svh w-screen flex flex-col items-center justify-start shrink-0 bg-background transition-colors duration-500 overflow-y-auto scrollbar-none">
            <div className="h-28 md:h-44 w-full shrink-0" />
            <motion.div
              animate={activeSection === 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              className="w-full flex flex-col items-center flex-1"
            >
              <TestimonialsSection />
            </motion.div>
          </div>
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 6: Pricing */}
        {Math.abs(activeSection - 6) <= 1 ? (
          <PricingSection activeSection={activeSection} />
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 7: FAQ */}
        {Math.abs(activeSection - 7) <= 1 ? (
          <FAQSection activeSection={activeSection} />
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 8: CTA */}
        {Math.abs(activeSection - 8) <= 1 ? (
          <CTASection activeSection={activeSection} />
        ) : (
          <div className="h-svh w-screen shrink-0" />
        )}

        {/* Slide 9: Footer */}
        <div className="h-svh w-screen flex flex-col relative shrink-0 bg-background overflow-y-auto">
          <div className="mt-auto mb-auto w-full py-6 md:py-10">
            <Footer compact={false} />
          </div>
        </div>
      </div>

      {/* Section Rail — Desktop */}
      <div className="fixed right-6 lg:right-10 top-1/2 -translate-y-1/2 z-[100] hidden lg:flex flex-col items-center gap-5">
        {sections.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSection(index)}
            className="relative group flex items-center justify-center w-12 py-2"
            aria-label={`Go to section ${index + 1}`}
          >
            <div className={`w-[3px] transition-all duration-700 ease-out rounded-full shadow-lg
              ${activeSection === index
                ? "h-12 bg-primary shadow-[0_0_25px_rgba(20,184,166,1)]"
                : "h-3 bg-foreground/10 group-hover:bg-foreground/30"}
            `} />
          </button>
        ))}
      </div>

      {/* Progress Dots — Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] lg:hidden flex items-center px-3 py-1 rounded-full bg-background/60 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="flex gap-1">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveSection(index)}
              aria-label={`Go to section ${index + 1}`}
              className="px-2 py-4"
            >
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${activeSection === index ? "w-8 bg-primary" : "w-2 bg-foreground/20"}`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
