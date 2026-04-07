"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Testimonial {
  text: string;
  name: string;
  shop: string;
  location: string;
  lang: string;
  image: string;
}

const testimonials: Testimonial[] = [
  {
    lang: "Tamil",
    text: "மொபிபிக்ஸ் எமது கடையின் விற்பனையை மற்றும் IMEI விவரங்களை மிக துல்லியமாக கண்காணிக்க உதவுகிறது. மிகவும் பயனுள்ள மென்பொருள்!",
    name: "Rajesh Kannan",
    shop: "RK Mobiles",
    location: "Mobile Shop Owner – Tirupur",
    image: "/assets/testimonials/owner1.png"
  },
  {
    lang: "Hindi",
    text: "मोबीबिक्स ने मेरी दुकान का काम बहुत आसान कर दिया है। स्टॉक मैनेजमेंट और बिलिंग अब चुटकियों में हो जाती है।",
    name: "Sanjay Sharma",
    shop: "Sharma Telecom",
    location: "New Delhi",
    image: "/assets/testimonials/owner2.png"
  },
  {
    lang: "English",
    text: "The repair job pipeline is a lifesaver. Customers get automatic updates on WhatsApp, which they absolutely love.",
    name: "Vikram Mehta",
    shop: "Coimbatore Tech",
    location: "Repair Technician – Coimbatore",
    image: "/assets/testimonials/owner6.png"
  },
  {
    lang: "Telugu",
    text: "ఐ.ఎం.ఇ.ఐ ట్రాకింగ్ కోసం మోబిబిక్స్ ఉత్తమమైనది. మా సిబ్బంది పని కూడా సులభతరము అయ్యింది. చాలా ధన్యవాదాలు!",
    name: "K. Venkatesh",
    shop: "Sri Sai Communications",
    location: "Hyderabad, TS",
    image: "/assets/testimonials/owner4.png"
  },
  {
    lang: "Kannada",
    text: "ನಮ್ಮ ಮೊಬೈಲ್ ಅಂಗಡಿಯ ಪ್ರತಿಯೊಂದು ವ್ಯವಹಾರವನ್ನು ಮೊಬಿಬಿಕ್ಸ್ ಉತ್ತಮವಾಗಿ ನಿರ್ವಹಿಸುತ್ತದೆ. ಜಿಎಸ್‌ಟಿ ಬಿಲ್ಲಿಂಗ್ ತುಂಬಾ ಸುಲಭವಾಯ್ತು.",
    name: "Praveen Kumar",
    shop: "Karnataka Digital",
    location: "Bangalore, KA",
    image: "/assets/testimonials/owner5.png"
  },
  {
    lang: "English",
    text: "Switched from a traditional register to MobiBix. The analytics dashboard gives me a clear picture of my daily profit.",
    name: "Anjali Gupta",
    shop: "Store Manager",
    location: "Madurai, TN",
    image: "/assets/testimonials/owner3.png"
  }
];

export function TestimonialsSection() {
  return (
    <div className="w-full flex flex-col items-center justify-start px-4 md:px-6 pb-20 md:pb-32" id="testimonials">
      <div className="text-center mb-5 md:mb-10 relative z-10 max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm"
        >
          Wall of Love
        </motion.div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tighter uppercase leading-none mb-3 md:mb-4">
          Trusted <br className="hidden sm:block" /> Across{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-500 via-orange-500/90 dark:via-white to-green-600 font-black italic">
            Bharat.
          </span>
        </h2>
      </div>

      {/* Mobile: horizontal scroll | Tablet+: 2-col | Desktop: 3-col */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none w-full max-w-6xl
                      md:grid md:grid-cols-2 md:overflow-visible md:snap-none md:pb-0
                      lg:grid-cols-3 lg:gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="shrink-0 snap-center w-[78vw] sm:w-[60vw] md:w-auto
                       p-4 md:p-6 rounded-[1.75rem] md:rounded-[2.5rem]
                       bg-card/40 backdrop-blur-2xl border border-border/50
                       hover:border-primary/40 transition-all duration-500 shadow-xl"
          >
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border-2 border-primary/20 shadow-lg relative overflow-hidden shrink-0">
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={48}
                    height={48}
                    className="object-cover absolute inset-0 w-full h-full"
                  />
                </div>
                <div>
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-foreground leading-none">
                    {t.name}
                  </h3>
                  <p className="text-[8px] md:text-[9px] font-bold text-primary uppercase tracking-widest mt-1">
                    {t.lang}
                  </p>
                </div>
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <svg key={s} className="w-2.5 h-2.5 text-orange-500 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            <p className={`text-sm md:text-base font-bold leading-snug mb-4 md:mb-6 text-foreground/80 ${t.lang !== 'English' ? 'font-serif tracking-wide' : ''}`}>
              &quot;{t.text}&quot;
            </p>

            <div className="pt-3 md:pt-4 border-t border-border/50">
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground block">{t.shop}</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{t.location}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
