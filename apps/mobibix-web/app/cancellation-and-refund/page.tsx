import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | MobiBix",
  description: "Cancellation and refund policy for MobiBix SaaS subscriptions.",
};

export default function CancellationRefundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-4xl flex flex-col items-center justify-start pb-20 px-6 relative z-10">
        <div className="h-28 md:h-44 w-full shrink-0" />
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Cancellation & Refund Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 3, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            We value your business and aim to provide a transparent cancellation and refund process for our SaaS subscribers.
          </p>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. Cancellation Process</h2>
            <p>
              You can cancel your MobiBix subscription at any time. To cancel, please follow these steps:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-500">
              <li>Log in to your MobiBix dashboard.</li>
              <li>Navigate to <strong>Settings &gt; Billing & Subscription</strong>.</li>
              <li>Click on <strong>Cancel Subscription</strong>.</li>
            </ul>
            <p className="mt-4">
              Upon cancellation, your subscription will remain active until the end of the current paid billing period. 
              No future charges will be processed after the cancellation date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. Refund Eligibility</h2>
            <p>
              As MobiBix provides a digital SaaS product with immediate access upon subscription, we generally do not offer refunds once a billing cycle has commenced. 
              However, refunds may be considered in the following exceptional circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-500">
              <li><strong>Double Billing:</strong> If you were accidentally charged twice for the same billing period.</li>
              <li><strong>Technical Failure:</strong> If a confirmed technical issue on our end prevented you from using the service for more than 48 consecutive hours.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. Refund Processing</h2>
            <p>
              Eligible refund requests must be submitted to <strong>aiyalgroups@gmail.com</strong> within 7 days of the transaction. 
              Once approved, refunds are processed back to the original payment method through Razorpay within <strong>5-7 working days</strong>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">4. No Partial Refunds</h2>
            <p>
              We do not provide partial refunds or credits for unused days in a billing cycle if you choose to cancel early. 
              You will continue to have full access to the Pro features until your current term expires.
            </p>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Contact Support</h2>
            <p>
              If you have any questions about your billing or need assistance with cancellation, please reach out:
            </p>
            <div className="bg-muted p-6 rounded-2xl border border-border">
              <p className="font-bold text-foreground">MobiBix Billing Support</p>
              <p>Email: <a href="mailto:aiyalgroups@gmail.com" className="text-teal-500 font-black hover:underline tracking-wide">aiyalgroups@gmail.com</a></p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
