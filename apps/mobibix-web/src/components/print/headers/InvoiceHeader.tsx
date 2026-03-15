import type { PrintDocumentData, HeaderConfig } from "@/lib/print/types";

// Default config if none provided
const DEFAULT_CONFIG: HeaderConfig = {
  layout: "CLASSIC",
  showLogo: true,
  showTagline: true,
};

interface AddressBlockProps {
  className?: string;
  addressLines: string[];
  gstNumber?: string;
  contactInfo: string[];
}

function AddressBlock({ className = "", addressLines, gstNumber, contactInfo }: AddressBlockProps) {
  return (
    <div className={`text-sm text-slate-600 space-y-0.5 ${className}`}>
      {addressLines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
         {gstNumber && <span className="font-semibold text-slate-800">GSTIN: {gstNumber}</span>}
         {contactInfo.map((info, i) => <span key={i}>{info}</span>)}
      </div>
    </div>
  );
}

interface LogoProps {
  className?: string;
  showLogo: boolean;
  logoUrl?: string;
}

function Logo({ className = "h-16 w-auto mb-3", showLogo, logoUrl }: LogoProps) {
  if (!showLogo || !logoUrl) return null;
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="Logo" className="h-full object-contain" />
    </div>
  );
}

export function InvoiceHeader({ data }: { data: PrintDocumentData }) {
  const { header } = data;
  const config = data.headerConfig || DEFAULT_CONFIG; // Fallback to safe defaults
  const logoProps = { showLogo: config.showLogo ?? false, logoUrl: header.logoUrl };
  const addressProps = { addressLines: header.addressLines, gstNumber: header.gstNumber, contactInfo: header.contactInfo };

  // Helper vars
  const accentColor = config.accentColor || "#0f172a"; // Default slate-900

  // --- LAYOUTS ---

    // 1. CLASSIC
    if (config.layout === "CLASSIC") {
     return (
         <div className="flex justify-between items-start mb-8 border-b-2 pb-6" style={{ borderColor: accentColor }}>
             <div className="flex gap-6 items-start">
                 <Logo className="h-20 w-auto" {...logoProps} />
                 <div>
                     <h1 className="text-4xl font-black uppercase tracking-tighter leading-none" style={{ color: accentColor }}>{header.shopName}</h1>
                     {config.showTagline && header.tagline && <p className="text-sm font-medium text-slate-500 mb-1">{header.tagline}</p>}
                     <AddressBlock {...addressProps} />
                 </div>
             </div>
             <div className="text-right">
                 <h2 className="text-xl font-medium uppercase tracking-[0.2em]" style={{ color: accentColor }}>{header.title}</h2>
                 {data.config.isB2B && <div className="mt-1 px-2 py-0.5 bg-slate-100 inline-block text-xs font-bold rounded border border-slate-200">B2B TAX INVOICE</div>}
             </div>
         </div>
     );
  }

  // 2. CENTERED: Everything Centered (More Brand Focused)
  if (config.layout === "CENTERED") {
      return (
          <div className="mb-10 text-center">
              <div className="flex justify-center mb-4">
                  <Logo className="h-24 w-auto" {...logoProps} />
              </div>
              <h1 className="text-4xl font-black mb-2 tracking-tight" style={{ color: accentColor }}>{header.shopName}</h1>
              {config.showTagline && header.tagline && <p className="text-sm text-slate-500 mb-2 italic">{header.tagline}</p>}
              <AddressBlock className="justify-center" {...addressProps} />
              <div className="mt-6 border-t border-b border-slate-200 py-2">
                   <h2 className="text-xl font-light uppercase tracking-[0.2em]" style={{ color: accentColor }}>{header.title}</h2>
              </div>
          </div>
      );
  }

  // 3. SPLIT: Logo Left, Name Center, Details Right (Corporate)
  if (config.layout === "SPLIT") {
      return (
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-300">
               <div className="w-1/4">
                   <Logo className="h-16 w-auto" {...logoProps} />
               </div>
               <div className="w-1/2 text-center">
                   <h1 className="text-2xl font-bold" style={{ color: accentColor }}>{header.shopName}</h1>
                   {config.showTagline && header.tagline && <p className="text-xs text-slate-500 italic">{header.tagline}</p>}
               </div>
               <div className="w-1/4 text-right text-xs text-slate-600">
                    {header.addressLines.map((l,i) => <p key={i}>{l}</p>)}
                    {header.gstNumber && <p className="font-bold mt-1">GST: {header.gstNumber}</p>}
               </div>
          </div>
      );
  }

  // 4. MINIMAL: No Logo, Clean Text (Compact/Simple)
  if (config.layout === "MINIMAL") {
      return (
          <div className="flex justify-between items-end mb-6 border-b pb-2" style={{ borderColor: accentColor }}>
              <div>
                  <h1 className="text-xl font-bold" style={{ color: accentColor }}>{header.shopName}</h1>
                  <p className="text-xs text-slate-600">{header.addressLines[0]} | GST: {header.gstNumber || 'N/A'}</p>
              </div>
              <div>
                  <h2 className="text-lg font-bold uppercase" style={{ color: accentColor }}>{header.title}</h2>
              </div>
          </div>
      );
  }

  return null;
}
