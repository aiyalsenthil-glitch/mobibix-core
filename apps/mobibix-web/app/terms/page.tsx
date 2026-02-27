import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | MobiBix",
  description: "Terms of Service for MobiBix Mobile Shop OS.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-3xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter">Terms of Service</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: February 26, 2026</p>
        
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-gray-400 font-medium leading-relaxed">
          <p className="text-lg text-white font-bold">
            These Terms of Service constitute a legally binding agreement made between you and MobiBix,
            concerning your access to and use of the REMOVED_DOMAIN website as well as any other
            media form, media channel, mobile website or mobile application related, linked, or
            otherwise connected thereto.
          </p>
          
          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing the Site, you agree that you have read, understood, and agree to be bound by
              all of these Terms of Service. If you do not agree with all of these Terms of Service,
              then you are expressly prohibited from using the Site and you must discontinue use immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">2. Intellectual Property Rights</h2>
            <p>
              Unless otherwise indicated, the Site and Software are our proprietary property and all
              source code, databases, functionality, software, website designs, audio, video, text,
              photographs, and graphics on the Site are owned or controlled by us or licensed to us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">3. User Representations</h2>
            <p>
              By using the Site, you represent and warrant that all registration information you submit
              will be true, accurate, current, and complete. You agree to maintain the accuracy of such
              information and promptly update such registration information as necessary.
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Contact Us</h2>
            <p>
              In order to resolve a complaint regarding the Site or to receive further information
              regarding use of the Site, please contact us at:
              <br />
              <a href="mailto:support@REMOVED_DOMAIN" className="text-teal-500 hover:text-teal-400 font-black tracking-wide">
                support@REMOVED_DOMAIN
              </a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
