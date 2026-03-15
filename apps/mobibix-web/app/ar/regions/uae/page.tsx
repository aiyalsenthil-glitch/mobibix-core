import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../../../../components/layout/Header";
import { Footer } from "../../../../components/layout/Footer";

export const metadata: Metadata = {
  title: "برنامج إدارة محلات صيانة الجوالات في الإمارات | MobiBix",
  description: "MobiBix هو أفضل برنامج لإدارة محلات صيانة الجوالات في الإمارات. فواتير ضريبية، إشعارات واتساب، وإدارة الفروع.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/ar/regions/uae",
    languages: {
      en: "https://REMOVED_DOMAIN/regions/uae",
      ar: "https://REMOVED_DOMAIN/ar/regions/uae",
    },
  },
  openGraph: {
    locale: "ar_AE",
  },
};

export default function UaeArabicRegionPage() {
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MobiBix",
    applicationCategory: "BusinessApplication",
    description: "إدارة عمليات الصيانة، إرسال إشعارات واتساب، وإنشاء فواتير ضريبية لضريبة القيمة المضافة في جميع أنحاء دبي وأبو ظبي والشارقة.",
    url: "https://REMOVED_DOMAIN/ar/regions/uae",
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "AED",
      priceValidUntil: "2027-01-01",
    },
    areaServed: { "@type": "Country", name: "UAE" },
  };

  return (
    <html lang="ar" dir="rtl">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300" style={{ fontFamily: "Tahoma, Arial, sans-serif" }}>
          <Header />

          {/* Background */}
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[130px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[130px]" />
          </div>

          <section className="relative pt-40 pb-24 px-6 text-center z-10">
            <div className="container mx-auto max-w-4xl">
              <span className="inline-block py-1 px-4 rounded-full border border-border bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8">
                🌍 الإمارات العربية المتحدة
              </span>
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[1.2] uppercase italic">
                برنامج إدارة محلات صيانة الجوالات في الإمارات
              </h1>
              <p className="text-xl text-muted-foreground font-bold mb-10 max-w-3xl mx-auto leading-relaxed">
                إدارة عمليات الصيانة، إرسال إشعارات واتس اب للعملاء، إصدار فواتير ضريبية (VAT)، وإدارة فروعك — مصمم خصيصاً للمحلات في دبي، أبو ظبي، والشارقة.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25"
                >
                  ابدأ التجربة المجانية — 14 يوماً
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
                >
                  عرض الأسعار (درهم)
                </Link>
              </div>
            </div>
          </section>

          <section className="px-6 pb-20 relative z-10">
            <div className="container mx-auto max-w-4xl">
              <div className="p-10 rounded-[3rem] bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 text-center">
                <div className="text-5xl font-black mb-2" dir="ltr">
                  AED 49
                  <span className="text-2xl font-bold text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground font-bold mb-6">
                  الأسعار بالدرهم الإماراتي · تجربة مجانية لمدة 14 يوماً بكامل الميزات · بدون بطاقة ائتمان
                </p>
              </div>
            </div>
          </section>

          <Footer compact={false} />
        </div>
      </body>
    </html>
  );
}
