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
    shop: "AR Mobiles",
    location: "Chennai, TN",
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
    shop: "TechHub Mumbai",
    location: "Mumbai, MH",
    image: "/assets/testimonials/owner6.png"
  },
  {
    lang: "Telugu",
    text: "ఐ.ఎం.ఇ.ఐ ట్రాకింగ్ కోసం మోబిబిక్స్ ఉత్తమమైనది. మా సిబ్బంది పని కూడా సులభతరము అయ్యింది. చాలా ధನ್ಯವಾదాలు!",
    name: "K. Venkatesh",
    shop: "Sri Sai Communications",
    location: "Hyderabad, TS",
    image: "/assets/testimonials/owner4.png"
  },
  {
    lang: "Kannada",
    text: "ನಮ್ಮ ಮೊಬೈಲ್ ಅಂಗಡಿಯ ಪ್ರತಿಯೊಂದು ವ್ಯವಹಾರವನ್ನು ಮೊಬಿಬಿಕ್ಸ್ ಉತ್ತಮವಾಗಿ ನಿರ್ವಹಿಸುತ್ತದೆ. ಜಿಎಸ್ ಟಿ ಬಿಲ್ಲಿಂಗ್ ತುಂಬಾ ಸುಲಭವಾಯ್ತು.",
    name: "Praveen Kumar",
    shop: "Karnataka Digital",
    location: "Bangalore, KA",
    image: "/assets/testimonials/owner5.png"
  },
  {
    lang: "English",
    text: "Switched from a traditional register to MobiBix. The analytics dashboard gives me a clear picture of my daily profit.",
    name: "Anjali Gupta",
    shop: "Mobile Point",
    location: "Pune, MH",
    image: "/assets/testimonials/owner3.png"
  }
];

export function TestimonialsSection() {
  return (
    <div className="w-full flex flex-col items-center justify-center px-6 relative">
      <div className="text-center mb-10 relative z-10 max-w-2xl px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm"
        >
          Wall of Love
        </motion.div>
        
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tighter uppercase leading-none mb-4">
          Trusted <br className="hidden sm:block" /> Across <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-500/90 dark:via-white to-green-600 drop-shadow-sm font-black italic">Bharat.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl w-full relative z-10">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative p-6 rounded-[2.5rem] bg-card/40 backdrop-blur-2xl border border-border/50 hover:border-primary/40 transition-all duration-500 shadow-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border-2 border-primary/20 shadow-lg relative overflow-hidden flex-shrink-0">
                  <Image 
                    src={t.image} 
                    alt={t.name}
                    width={48}
                    height={48}
                    className="object-cover absolute inset-0 w-full h-full"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground leading-none">{t.name}</h4>
                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{t.lang}</p>
                </div>
              </div>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(s => (
                  <svg key={s} className="w-2.5 h-2.5 text-orange-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
            </div>

            <p className={`text-base md:text-lg font-bold leading-snug mb-6 text-foreground/80 transition-colors ${t.lang !== 'English' ? 'font-serif tracking-wide' : 'font-sans'}`}>
              &quot;{t.text}&quot;
            </p>

            <div className="pt-4 border-t border-border/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground block">{t.shop}</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{t.location}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
