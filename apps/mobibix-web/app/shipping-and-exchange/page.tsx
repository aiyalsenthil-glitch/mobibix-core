import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Shipping & Exchange Policy | MobiBix",
  description: "Shipping and exchange policy for MobiBix digital SaaS services.",
};

export default function ShippingExchangePage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-4xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Shipping & Exchange Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 3, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            MobiBix provides purely digital software services. This policy clarifies the nature of our service delivery.
          </p>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. Nature of Product</h2>
            <p>
              MobiBix is a cloud-based "Software as a Service" (SaaS) platform for retail businesses. 
              We do not sell, ship, or deliver any physical goods, hardware, or tangible items.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. Service Delivery</h2>
            <p>
              Since our products are digital, no physical shipping is involved. 
              Access is delivered electronically in the following ways:
            </p>
            <ul className="list-disc pl-6 space-y-2 marker:text-teal-500">
              <li>Immediate access via the web portal (app.REMOVED_DOMAIN) upon account registration or subscription.</li>
              <li>Login credentials provided to the registered email address.</li>
              <li>Mobile application access via the Google Play Store or Apple App Store.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. No Exchange Policy</h2>
            <p>
              As there are no physical goods delivered, there is no possibility of "exchange" in the traditional sense. 
              However, users can switch between different subscription plans (Upgrade/Downgrade) as detailed in our <strong>Terms & Conditions</strong>.
            </p>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Digital Service Declaration</h2>
            <p>
              By subscribing to MobiBix, you acknowledge that you are purchasing a digital subscription and that 
              no physical delivery will take place.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
