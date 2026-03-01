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
            These Terms &amp; Conditions constitute a legally binding agreement made between you and Aiyal Groups Platform concerning your access to and use of MobiBix (Retail POS &amp; Repair SaaS).
          </p>
          
          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">1. Account Registration</h2>
            <p>
              You agree to provide true, accurate, and complete information during registration. The Owner is responsible for safeguarding credentials and all activity under the Tenant account. You must be at least 18 years of age to use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">2. Subscription &amp; Billing</h2>
            <p>
              Subscription fees are billed in advance and are non-refundable. We reserve the right to suspend access if fees are past due. Cancellation takes effect at the end of the current billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">3. Data Ownership &amp; Liability</h2>
            <p>
              The Tenant retains full ownership of business Data. Aiyal Groups acts solely as a data processor. We are NOT responsible for the accuracy of tax filings, GST compliance, or regulatory reporting errors made using our tools.
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in Chennai, Tamil Nadu, India.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
