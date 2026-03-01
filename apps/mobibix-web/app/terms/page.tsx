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

      <div className="container mx-auto max-w-4xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Terms & Conditions</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 1, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            Welcome to the Aiyal Groups Platform, encompassing our suite of SaaS products including Mobibix (Retail POS & Repair SaaS) and GymPilot (Gym Management SaaS).
          </p>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-500">
              <li><strong>"Platform":</strong> Mobibix, GymPilot, their apps, websites, and infrastructure.</li>
              <li><strong>"Tenant":</strong> The business entity subscribing to the Platform.</li>
              <li><strong>"Owner":</strong> The primary individual who registers the Tenant account.</li>
              <li><strong>"Data":</strong> All information and records entered into the Platform by the Tenant.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-500">
              <li><strong>Accurate Information:</strong> You agree to provide true, accurate, and complete information during registration.</li>
              <li><strong>Security:</strong> The Owner is responsible for safeguarding credentials and all activity under the account.</li>
              <li><strong>Age:</strong> You must be at least 18 years of age to use the Services.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. Subscription & Billing</h2>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-500">
              <li><strong>Subscription Fees:</strong> Fees are billed in advance on a recurring basis.</li>
              <li><strong>Refund Policy:</strong> All fees are non-refundable unless required by law.</li>
              <li><strong>Right to Suspend:</strong> We reserve the right to suspend access if fees are past due.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">4. Acceptable Use</h2>
            <p>You agree not to use the Platform for any unlawful acts, tax fraud, or storing illegal data. Reverse engineering or bypassing security measures is strictly prohibited.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">5. Data Ownership</h2>
            <p><strong>Tenant Ownership:</strong> The Tenant retains full ownership of all business Data.</p>
            <p><strong>Processor Role:</strong> Aiyal Groups acts solely as a data processor. We do not claim ownership over your Data.</p>
            <p><strong>Retention:</strong> Upon cancellation, we retain Data for a 30-day grace period, after which it is permanently deleted.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">6. Limitation of Liability</h2>
            <p><strong>Tax & Regulatory:</strong> We are NOT responsible for the accuracy of tax filings or GST compliance.</p>
            <p><strong>Business Losses:</strong> Aiyal Groups is not liable for indirect, incidental, or consequential damages or loss of profits.</p>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Governing Law</h2>
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
