export const RetailDemoMessages = {
  WELCOME: {
    greeting: (name: string) => `👋 Welcome to *Vessel Depot* 🍽️\nWe sell premium steel utensils for your home and business.`,
    menu: `*Please choose an option:*\n\n1️⃣ View Products\n2️⃣ Bulk / Wholesale Enquiry\n3️⃣ Talk to Staff`,
  },
  CATALOG: {
    header: `🛒 *Best Selling Steel Utensils*\nHere are our top products:\n`,
    empty: `We are currently updating our catalog. Please check back later!`,
    footer: `\nReply with a product name for price & availability.`,
  },
  ENQUIRY: {
    requestDetails: `📦 *Bulk Order Enquiry*\n\nPlease reply with:\n- Quantity required\n- Delivery Location\n\nOur team will quote the best price for you.`,
    confirmed: `✅ *Thanks!* We have marked this as high priority.\nA staff member will call you shortly.`,
  },
  HANDOVER: {
    message: `👨‍💼 *Staff Handover*\n\nConnecting you to a sales agent. They will reply here shortly.`,
  },
  ADDRESS: {
    info: `📍 *Vessel Depot*\n123 Steel Market, Main Road\nChennai, Tamil Nadu\n\n🕒 Open: 10 AM - 9 PM`,
  },
  FALLBACK: {
    default: `I didn't understand that. Please reply with:\n*1* for Products\n*2* for Bulk Enquiry\n*3* to Talk to Staff`,
  },
};
