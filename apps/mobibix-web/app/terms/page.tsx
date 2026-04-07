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

      <div className="container mx-auto max-w-4xl flex flex-col items-center justify-start pb-20 px-6 relative z-10">
        <div className="h-28 md:h-44 w-full shrink-0" />
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Terms & Conditions</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 3, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            Welcome to MobiBix, a subscription-based SaaS platform operated by Aiyal Groups. By using our services, you agree to the following terms.
          </p>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. Description of Service</h2>
            <p>
              MobiBix provides a "Software as a Service" (SaaS) platform designed for retail POS and repair center management. 
              The service is delivered electronically via our web and mobile applications. As a digital service, no physical goods 
              are shipped or delivered.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. Subscription Plans & Billing</h2>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Plan Selection:</strong> We offer monthly and yearly subscription plans. Pricing details are available on our pricing page and are inclusive/exclusive of taxes as specified.</li>
              <li><strong>Auto-Renewal:</strong> All subscriptions are set to auto-renew at the end of the billing cycle (monthly or yearly) unless cancelled.</li>
              <li><strong>Recurring Charges (eMandate):</strong> By subscribing and providing payment details, you explicitly authorize Aiyal Groups to charge your payment method (Credit Card, Debit Card, or UPI) on a recurring basis via Razorpay eMandate/Subscription services.</li>
              <li><strong>Authorization:</strong> This authorization remains in effect until you cancel your subscription through the platform settings or by contacting support.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. Upgrade/Downgrade Terms</h2>
            <p>
              Users may upgrade or downgrade their plans at any time. Upgrades will be processed immediately with prorated charges. 
              Downgrades will take effect from the next billing cycle. No partial refunds are provided for downgrades mid-cycle.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">4. Cancellation & Termination</h2>
            <p>
              You may cancel your subscription at any time via the billing section of your dashboard. Upon cancellation, you will 
              retain access until the end of your current paid billing period. We reserve the right to terminate accounts for 
              violations of these terms or non-payment.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">5. Data Ownership & Privacy</h2>
            <p>
              You retain ownership of all data entered into the platform. Our use of your data is governed by our Privacy Policy. 
              We act as a data processor for your customer information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Aiyal Groups shall not be liable for any indirect, incidental, 
              or consequential damages arising from the use of our SaaS platform. Our total liability for any claim 
              shall not exceed the amount paid by you for the service in the 12 months preceding the claim.
            </p>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">7. Governing Law</h2>
            <p>
              These Terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive 
              jurisdiction of the competent courts in <strong>Salem, Tamil Nadu, India</strong>.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
