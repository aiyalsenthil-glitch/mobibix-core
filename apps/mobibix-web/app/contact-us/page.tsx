import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Contact Us | MobiBix",
  description: "Contact information for MobiBix (Aiyal Groups).",
  alternates: {
    canonical: "/contact-us"
  }
};

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-4xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Contact Us</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">We&apos;re here to help you</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-muted-foreground font-medium leading-relaxed">
          <section className="space-y-6">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Business Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Registered Business Name</p>
                <p className="text-lg">Aiyal Groups</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Brand Name</p>
                <p className="text-lg text-primary font-black">MobiBix</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Registered Office Address</p>
                <p>No-6, Arun Arcade Complex, Ayothiypattanam, Salem, Tamilnadu, india 636103</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Get in Touch</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Support Email</p>
                <a href="mailto:aiyalgroups@gmail.com" className="text-lg text-primary font-black hover:underline">aiyalgroups@gmail.com</a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Phone</p>
                <p className="text-lg">+918838822461</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Support Hours</p>
                <p>Monday - Friday, 10:00 AM - 6:00 PM IST</p>
              </div>
            </div>
          </section>

          <section className="md:col-span-2 space-y-6 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Grievance Redressal</h2>
            <div className="bg-muted p-8 rounded-[2.5rem] border border-border">
              <p className="mb-4">
                In accordance with the Information Technology Act 2000 and rules made there under, the name and contact details of the Grievance Officer are provided below:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Grievance Officer</p>
                  <p className="font-bold text-foreground">Velan Kumar</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-foreground font-black mb-1">Contact Email</p>
                  <a href="mailto:aiyalgroups@gmail.com" className="text-primary font-black hover:underline">aiyalgroups@gmail.com</a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
