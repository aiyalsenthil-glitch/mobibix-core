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

      <div className="container mx-auto max-w-4xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Privacy Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 1, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            Aiyal Groups Platform ("we," "us," or "our") respects your privacy. This Privacy Policy details how we collect, use, process, and protect your personal and business data when you use Mobibix, GymPilot, our websites, and related services.
          </p>
          
          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. Information We Collect</h2>
            <p>We collect information only to the extent necessary to provide our SaaS services.</p>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Account Information:</strong> Name, email address, phone number, and Firebase authentication identifiers.</li>
              <li><strong>Business Information:</strong> Legal entity name, GST (Goods and Services Tax) number, registered address, shop/branch locations, currency, and timezone.</li>
              <li><strong>Customer & Operational Data:</strong> Data entered into the Platform by the Tenant, including their customers' names, phone numbers, transaction histories, and repair logs. (We act as a Data Processor for this information).</li>
              <li><strong>Device & Usage Information:</strong> IP addresses, browser types, mobile device identifiers, app crash logs, and general platform usage analytics.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. How We Use Data</h2>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Service Delivery:</strong> To provision accounts, process transactions, generate invoices, and facilitate core SaaS features.</li>
              <li><strong>Security & Fraud Prevention:</strong> To verify identities, enforce role-based access control, and protect against unauthorized access.</li>
              <li><strong>Analytics & Improvement:</strong> To analyze system performance, troubleshoot bugs, and improve user experience.</li>
              <li><strong>Customer Support:</strong> To respond to inquiries and provide technical assistance.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. Legal Basis for Processing</h2>
            <p>We process data under the following legal bases:</p>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Contractual Necessity:</strong> To perform our obligations under the Terms & Conditions.</li>
              <li><strong>Consent:</strong> Where you have explicitly opted-in (e.g., for marketing communications).</li>
              <li><strong>Legal Obligation:</strong> To comply with applicable laws, including Indian tax and IT regulations.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">4. Marketing Consent</h2>
            <p><strong>Explicit Opt-In:</strong> We will only send promotional or marketing communications if you have explicitly opted in via a clear checkbox during onboarding or within your account settings.</p>
            <p><strong>Right to Opt-Out:</strong> You may withdraw your consent for marketing communications at any time by clicking the "unsubscribe" link in our emails or updating your preferences in the settings panel.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">5. Data Storage & Security</h2>
            <p>We implement robust security measures to protect your data. While we implement industry-standard security measures, no system is completely immune from risk.</p>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Data Localization:</strong> Data may be processed and stored on secure cloud infrastructure located in India.</li>
              <li><strong>Encrypted Transport:</strong> All data transit is secured using HTTPS/TLS encryption.</li>
              <li><strong>Authentication:</strong> We use Firebase Authentication for secure identity management.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">6. Data Sharing</h2>
            <p><strong>No Sale of Data:</strong> We do not and will not sell your personal, business, or customer data to third parties.</p>
            <p><strong>Service Providers:</strong> We may share securely limited data with trusted providers (e.g., AWS, Razorpay) strictly for the purpose of operating the Platform.</p>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Grievance Officer</h2>
            <p>In compliance with the Digital Personal Data Protection Act, 2023, the contact details are:</p>
            <div className="bg-muted p-6 rounded-2xl border border-border">
              <p className="font-bold text-foreground">Grievance Officer, Aiyal Groups</p>
              <p>Email: <a href="mailto:legal@aiyalgroups.com" className="text-teal-500 font-black hover:underline tracking-wide">legal@aiyalgroups.com</a></p>
              <p className="text-sm mt-2">Address: Aiyal Groups, Tech Park, OMR, Chennai, Tamil Nadu, 600119</p>
            </div>
            <p className="text-xs italic">We will acknowledge complaints within 24 hours and resolve them within 15 days of receipt.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
