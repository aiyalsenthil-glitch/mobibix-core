import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | MobiBix",
  description: "Privacy policy for MobiBix Mobile Shop OS.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-4xl flex flex-col items-center justify-start pb-20 px-6 relative z-10">
        <div className="h-28 md:h-44 w-full shrink-0" />
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Privacy Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 3, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            At MobiBix (Aiyal Groups), we are committed to protecting your privacy and ensuring the security of your business and personal data.
          </p>
          
          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. Data We Collect</h2>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Account Information:</strong> Name, business name, email, and phone number for authentication and service delivery.</li>
              <li><strong>Business Data:</strong> GST details, shop addresses, and operational records required for the POS/SaaS functionality.</li>
              <li><strong>Usage Information:</strong> Device logs, IP addresses, and browser types for security and performance monitoring.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. Payment Processing</h2>
            <p>
              We use <strong>Razorpay</strong> as our third-party payment gateway for processing subscriptions and recurring payments. 
            </p>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>No Card Storage:</strong> MobiBix does not store your credit card, debit card, or bank account details on our servers. All sensitive payment information is handled directly by Razorpay in compliance with PCI-DSS standards.</li>
              <li><strong>eMandate Authorization:</strong> For recurring subscriptions, payment tokens are securely managed by Razorpay to facilitate auto-debit based on your authorization.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. Data Security Measures</h2>
            <p>
              We implement industry-standard security protocols to protect your data, including:
            </p>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li>End-to-end encryption for data in transit (SSL/TLS).</li>
              <li>Secure cloud infrastructure with restricted access.</li>
              <li>Firebase Authentication for robust identity management.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">4. Third-Party Integrations</h2>
            <p>
              We only share data with trusted partners (such as Razorpay for payments and AWS for hosting) to the extent necessary to provide our services. We never sell your data to third parties.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">5. User Rights (DPDP Act)</h2>
            <p>
              In compliance with the Digital Personal Data Protection Act (2023), you have the right to access, correct, or request the deletion of your personal data. You may also withdraw your consent for recurring payments at any time.
            </p>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Grievance Officer</h2>
            <p>For any privacy-related queries or complaints, please contact our Grievance Officer:</p>
            <div className="bg-muted p-6 rounded-2xl border border-border">
              <p className="font-bold text-foreground">Grievance Officer, Velan Kumar</p>
              <p>Email: <a href="mailto:aiyalgroups@gmail.com" className="text-teal-500 font-black hover:underline tracking-wide">aiyalgroups@gmail.com</a></p>
              <p className="text-sm mt-2">Address: No-6, Arun Arcade Complex, Ayothiypattanam, Salem, Tamilnadu, india 636103</p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
