"use client";

import { useState, useEffect } from "react";
import { type Shop, updateShopSettings } from "@/services/shops.api";
import { storage } from "@/lib/REMOVED_AUTH_PROVIDER";
import { ref, uploadBytes, getDownloadURL } from "REMOVED_AUTH_PROVIDER/storage";
import imageCompression from "browser-image-compression";
import { TEMPLATE_META } from "@/lib/print/meta";
import { InvoiceClassic } from "@/components/print/templates/InvoiceClassic";
import { InvoiceModern } from "@/components/print/templates/InvoiceModern";
import { InvoiceCorporate } from "@/components/print/templates/InvoiceCorporate";
import { InvoiceCompact } from "@/components/print/templates/InvoiceCompact";
import { InvoiceThermal } from "@/components/print/templates/InvoiceThermal";
import { InvoiceProfessional } from "@/components/print/templates/InvoiceProfessional";
import { JobCardClassic } from "@/components/print/templates/JobCardClassic";
import { JobCardThermal } from "@/components/print/templates/JobCardThermal";
import { JobCardSimple } from "@/components/print/templates/JobCardSimple";
import { JobCardDetailed } from "@/components/print/templates/JobCardDetailed";
import { InvoiceSimple } from "@/components/print/templates/InvoiceSimple";
import { ReceiptThermal } from "@/components/print/templates/ReceiptThermal";
import { VoucherClassic } from "@/components/print/templates/VoucherClassic";
import type { PrintDocumentData } from "@/lib/print/types";

// --- Constants & Types ---

const INVOICE_TEMPLATES = [
  { value: "CLASSIC", label: "Classic (Professional A4)", type: "NORMAL" },
  { value: "MODERN", label: "Modern Clean (A4)", type: "NORMAL" },
  { value: "CORPORATE", label: "Corporate Boxed (A4)", type: "NORMAL" },
  { value: "PROFESSIONAL", label: "Professional Standard (A4)", type: "NORMAL" },
  { value: "COMPACT", label: "Compact (A4/A5)", type: "NORMAL" },
  { value: "SIMPLE", label: "Simple (Grid/Table)", type: "NORMAL" },
  { value: "THERMAL", label: "Thermal Receipt (Standard)", type: "THERMAL" },
  { value: "RECEIPT_THERMAL", label: "Detailed Receipt (Thermal)", type: "THERMAL" },
];

const JOBCARD_TEMPLATES = [
  { value: "CLASSIC", label: "Classic (Standard A4)", type: "NORMAL" },
  { value: "DETAILED", label: "Detailed (With Conditions)", type: "NORMAL" },
  { value: "VOUCHER_CLASSIC", label: "Service Voucher (A4)", type: "NORMAL" },
  { value: "THERMAL", label: "Standard Thermal", type: "THERMAL" },
  { value: "SIMPLE", label: "Simple (Compact)", type: "THERMAL" },
];

const ACCENT_COLORS = [
  "#000000",
  "#1e40af", // Blue
  "#047857", // Green
  "#b91c1c", // Red
  "#a21caf", // Purple
  "#7c3aed", // Violet
  "#c2410c", // Orange
  "#be185d", // Pink
];

interface ShopPrintSettingsProps {
  shop: Shop;
  onUpdate?: () => void;
}

export function ShopPrintSettings({ shop, onUpdate }: ShopPrintSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize state with fallbacks to NORMAL/A4 if undefined
  const [settings, setSettings] = useState({
    invoicePrinterType: (shop.invoicePrinterType || "NORMAL") as "NORMAL" | "THERMAL",
    invoiceTemplate: shop.invoiceTemplate || "CLASSIC",
    jobCardPrinterType: (shop.jobCardPrinterType || "NORMAL") as "NORMAL" | "THERMAL",
    jobCardTemplate: shop.jobCardTemplate || "CLASSIC",
    tagline: shop.tagline || "",
    headerConfig: shop.headerConfig || {
      layout: "CLASSIC",
      showLogo: true,
      showTagline: false,
      accentColor: "#000000",
    },
  });

  // Preview Mode
  const [previewMode, setPreviewMode] = useState<"INVOICE" | "JOBCARD">("INVOICE");
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);

  // Effect: Enforce valid template when printer type changes
  useEffect(() => {
    // 1. Validate Invoice Template
    const validInvoiceTemplates = INVOICE_TEMPLATES.filter(t => t.type === settings.invoicePrinterType);
    const isCurrentInvoiceValid = validInvoiceTemplates.some(t => t.value === settings.invoiceTemplate);
    
    if (!isCurrentInvoiceValid) {
       // Default to first available for this type
       const defaultTemplate = settings.invoicePrinterType === "THERMAL" ? "THERMAL" : "CLASSIC";
       setSettings(prev => ({ ...prev, invoiceTemplate: defaultTemplate }));
    }

    // 2. Validate JobCard Template
    const validJobTemplates = JOBCARD_TEMPLATES.filter(t => t.type === settings.jobCardPrinterType);
    const isCurrentJobValid = validJobTemplates.some(t => t.value === settings.jobCardTemplate);

    if (!isCurrentJobValid) {
        const defaultTemplate = settings.jobCardPrinterType === "THERMAL" ? "THERMAL" : "CLASSIC";
        setSettings(prev => ({ ...prev, jobCardTemplate: defaultTemplate }));
    }
  }, [settings.invoicePrinterType, settings.jobCardPrinterType]);


  // Ensure accent color is never null/undefined for preview
  const activeAccentColor = settings.headerConfig.accentColor || "#000000";

  // Dynamic Template Resolver
  const RenderPreview = () => {
    // Construct robust dummy data
    const dummyData: PrintDocumentData = {
      id: "PREV-2024-001",
      type: previewMode,
      header: {
        title: previewMode === "INVOICE" ? "Tax Invoice" : "Job Card",
        shopName: shop.name || "MobiBix Store",
        tagline: settings.headerConfig.showTagline ? (settings.tagline || "Premium Mobile Services") : undefined,
        logoUrl: settings.headerConfig.showLogo ? (localLogoUrl || shop.logoUrl || undefined) : undefined,
        addressLines: [
          shop.addressLine1 || "123 Tech Park, Indiranagar",
          `${shop.city || "Bangalore"}, ${shop.state || "Karnataka"} - ${shop.pincode || "560038"}`,
        ],
        contactInfo: [
          `Ph: ${shop.phone || "+91 98765 43210"}`,
          shop.website ? `Web: ${shop.website}` : "Email: support@mobibix.com",
        ],
        gstNumber: shop.gstEnabled ? (shop.gstNumber || "29ABCDE1234F1Z5") : undefined,
      },
      headerConfig: {
        ...settings.headerConfig,
        accentColor: activeAccentColor // Enforce color here
      },
      meta: {
        "Date": new Date().toLocaleDateString("en-IN"),
        "Invoice No": "INV-24-001",
        "Due Date": "Immediate",
        ...(previewMode === "JOBCARD" ? {
            "Job No": "JC-5501",
            "Model": "iPhone 13 Pro",
            "Status": "Pending",
            "Est. Delivery": "Tomorrow"
        } : {})
      },
      customer: { 
        name: "Rahul Sharma", 
        phone: "9988776655",
        address: "42, Green Avenue, Bangalore" 
      },
      qrCode: "https://mobibix.com/track/preview",
      config: {
        isB2B: false,
        pricesInclusive: true,
        printDate: new Date().toLocaleString(),
        isIndianGSTInvoice: !!shop.gstEnabled,
        accentColor: activeAccentColor // Enforce color here too for templates using config
      },
      items: [
        { 
            id: "1", 
            name: "Screen Replacement (iPhone 13)", 
            qty: 1, 
            rate: 12500, 
            total: 12500, 
            taxRate: shop.gstEnabled ? 18 : 0, 
            hsn: shop.gstEnabled ? "9987" : undefined 
        },
        { 
            id: "2", 
            name: "Tempered Glass", 
            qty: 1, 
            rate: 450, 
            total: 450, 
            taxRate: shop.gstEnabled ? 18 : 0, 
            hsn: shop.gstEnabled ? "3926" : undefined 
        },
      ],
      totals: {
        subTotal: 12950,
        totalTax: 0, // Simplified for preview
        grandTotal: 12950,
        amountInWords: "Twelve Thousand Nine Hundred Fifty Only",
        taxLines: shop.gstEnabled ? [
            { label: "CGST", rate: 9, amount: 1165.5 },
            { label: "SGST", rate: 9, amount: 1165.5 }
        ] : []
      },
      footer: {
          terms: ["Goods once sold cannot be taken back.", "Warranty valid for 3 months on parts."],
          text: shop.invoiceFooter || "Thank you for your business!"
      }
    };

    let Component: React.ComponentType<{ data: PrintDocumentData }> = InvoiceClassic;

    if (previewMode === "INVOICE") {
      switch (settings.invoiceTemplate) {
        case "CLASSIC": Component = InvoiceClassic; break;
        case "MODERN": Component = InvoiceModern; break;
        case "CORPORATE": Component = InvoiceCorporate; break;
        case "PROFESSIONAL": Component = InvoiceProfessional; break;
        case "COMPACT": Component = InvoiceCompact; break;
        case "SIMPLE": Component = InvoiceSimple; break;
        case "THERMAL": Component = InvoiceThermal; break;
        case "RECEIPT_THERMAL": Component = ReceiptThermal; break;
        default: Component = InvoiceClassic;
      }
    } else {
      switch (settings.jobCardTemplate) {
        case "CLASSIC": Component = JobCardClassic; break;
        case "DETAILED": Component = JobCardDetailed; break;
        case "VOUCHER_CLASSIC": Component = VoucherClassic; break;
        case "THERMAL": Component = JobCardThermal; break;
        case "SIMPLE": Component = JobCardSimple; break;
        default: Component = JobCardClassic;
      }
    }

    const isThermal = 
        (previewMode === "INVOICE" && settings.invoicePrinterType === "THERMAL") ||
        (previewMode === "JOBCARD" && settings.jobCardPrinterType === "THERMAL");

    return (
      <div className={`origin-top transition-all duration-300 ${
        isThermal 
        ? "w-[80mm] mx-auto bg-white shadow-xl min-h-[100mm]" 
        : "w-[210mm] h-[297mm] bg-white shadow-xl scale-[0.65] xl:scale-[0.55] 2xl:scale-[0.65] origin-top"
      } text-black print-preview-wrapper`}>
        <div className={isThermal ? "" : "transform scale-[1]" /* Content logic handles internal scaling */}>
            <Component data={dummyData} />
        </div>
      </div>
    );
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);

      // 1. Compression Options
      const options = {
        maxSizeMB: 0.05, // 50KB
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/webp"
      };

      // 2. Compress
      const compressedFile = await imageCompression(file, options);
      // console.log(`Original: ${file.size / 1024}KB, Compressed: ${compressedFile.size / 1024}KB`);

      if (compressedFile.size > 100 * 1024) { // Safety check: 100KB hard limit
          throw new Error("Image too large even after compression. Please try a simpler image.");
      }

      // 3. Upload Path: shops/{shopId}/branding/logo.webp (Fixed path to save storage)
      // We use a fixed name so it overwrites the previous one.
      const storageRef = ref(storage, `shops/${shop.id}/branding/logo.webp`);

      // 4. Upload
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // 5. Update State
      setSettings(prev => ({
          ...prev,
          headerConfig: { ...prev.headerConfig, showLogo: true }, // Auto-enable
          // Also update the shop object so that it reflects immediately if we save logic relies on it? 
          // Actually, we store logoUrl in shop root usually, but here headerConfig might use it?
          // Let's assume we update the shop.logoUrl via the updateShopSettings call later, 
          // BUT wait, looking at the types, Shop has logoUrl at root. 
          // And headerConfig has showLogo. 
          // The preview uses `shop.logoUrl`. 
          // So we need to update the Shop object's logoUrl effectively.
          // Since `settings` doesn't have `logoUrl` in its root in the state (it relies on `shop` prop for initial),
          // we should probably add logoUrl to settings state or handle it separately.
          // Looking at state init: 
          // const [settings, setSettings] = useState({ ... headerConfig ... });
          // It doesn't seem to track logoUrl in `settings` state directly?
          // Let's check the RenderPreview: `logoUrl: settings.headerConfig.showLogo ? (shop.logoUrl || undefined) : undefined`
          // It uses `shop.logoUrl`. We need to update that.
      }));
      
      // We need to trigger a save or at least update the local preview.
      // Since `shop` is a prop, we can't mutate it.
      // We should probably add `logoUrl` to the settings state to override the prop for preview.
      
      // Lets modify settings state to include logoUrl
      // But first let's just cheat and update the shop prop locally if possible? No.
      // We should add logoUrl to the Settings state and update RenderPreview to prefer it.
      
      // Updating settings object in state to also track logoUrl if not already.
      // It seems strictly typed. Let's see...
      // `settings` relies on inferred type from useState init.
      // We should add `logoUrl?: string` to the state.
      
      // QUICK FIX: For now, I will modify the state update below, but I need to make sure `settings` supports it.
      // The current state init doesn't have logoUrl. 
      // I will add it to the state update and cast if necessary, OR better, I will update the `RenderPreview` to look at a new state variable `localLogoUrl`.
      
      setLocalLogoUrl(downloadURL); // We need this state.
      
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      alert(`Upload failed: ${(error as any)?.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Merging local logo url if changed
      const payload = {
          ...settings,
          logoUrl: localLogoUrl || shop.logoUrl // Include only if we want to update it.
      };

      await updateShopSettings(shop.id, payload);
      
      window.dispatchEvent(new CustomEvent("shopUpdated"));
      
      alert("Print settings saved!");
      if (onUpdate) onUpdate();
    } catch (error: unknown) {
      alert((error as any)?.message || "Failed to save");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get active meta desc
  const activeMeta = previewMode === "INVOICE"
    ? TEMPLATE_META.INVOICE?.[settings.invoiceTemplate]
    : TEMPLATE_META.JOBCARD?.[settings.jobCardTemplate];

  // Visual Layout Selector
  const renderLayoutSelector = (value: string, label: string) => {
    const isSelected = settings.headerConfig.layout === value;
    return (
      <button
        type="button"
        onClick={() => setSettings({
            ...settings,
            headerConfig: { ...settings.headerConfig, layout: value as any }
        })}
        className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
          isSelected
            ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10"
            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5"
        }`}
      >
        <span className={`text-xs font-semibold ${isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
            {label}
        </span>
        {isSelected && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600"></div>
        )}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-100px)]">
      {/* --- LEFT COLUMN --- */}
      <div className="xl:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-20">
        
        <div className="sticky top-0 z-20 flex justify-between items-center bg-gray-50/95 dark:bg-black/80 backdrop-blur py-4 border-b border-gray-200 dark:border-white/10 -mx-1 px-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Print Settings</h2>
          <button onClick={handleSave} disabled={isLoading} className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-sm font-bold rounded-lg shadow-md transition disabled:opacity-50">
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* 1. Header Design */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🎨 Header Styling
            </h3>
            
            <div className="space-y-6">
                {/* Accent Color */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Brand Accent Color</label>
                    <div className="flex flex-wrap gap-3">
                        {ACCENT_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => setSettings({
                                    ...settings,
                                    headerConfig: { ...settings.headerConfig, accentColor: color }
                                })}
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                                    activeAccentColor === color 
                                    ? "ring-2 ring-offset-2 ring-gray-400 border-white scale-110" 
                                    : "border-transparent hover:scale-110"
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        <div className="relative w-8 h-8">
                             <input 
                                type="color" 
                                value={activeAccentColor}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    headerConfig: { ...settings.headerConfig, accentColor: e.target.value }
                                })}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                             />
                             <div className="w-full h-full rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-500 pointer-events-none bg-white">
                                🎨
                             </div>
                        </div>
                    </div>
                </div>

                {/* Layout Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {renderLayoutSelector("CLASSIC", "Classic")}
                    {renderLayoutSelector("CENTERED", "Centered")}
                    {renderLayoutSelector("SPLIT", "Split")}
                    {renderLayoutSelector("MINIMAL", "Minimal")}
                </div>

                {/* Show Options & Logo Upload */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                     <div className="flex items-center justify-between">
                         <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={settings.headerConfig.showLogo}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    headerConfig: { ...settings.headerConfig, showLogo: e.target.checked }
                                })}
                                className="w-5 h-5 rounded text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Logo</span>
                         </label>
                     </div>

                     {settings.headerConfig.showLogo && (
                         <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-dashed border-gray-300 dark:border-white/10">
                             {localLogoUrl || shop.logoUrl ? (
                                 <div className="relative w-12 h-12 rounded-lg overflow-hidden border bg-white flex-shrink-0">
                                     {/* eslint-disable-next-line @next/next/no-img-element */}
                                     <img src={localLogoUrl || shop.logoUrl || ""} alt="Logo" className="w-full h-full object-contain" />
                                 </div>
                             ) : (
                                 <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-400">
                                     🖼️
                                 </div>
                             )}
                             
                             <div className="flex-1">
                                 <label className="block text-xs font-medium text-gray-500 mb-1">
                                     {localLogoUrl || shop.logoUrl ? "Change Logo (Max 50KB)" : "Upload Logo (Max 50KB)"}
                                 </label>
                                 <input 
                                     type="file" 
                                     accept="image/*"
                                     onChange={(e) => {
                                         if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]);
                                     }}
                                     disabled={isUploading}
                                     className="block w-full text-xs text-slate-500
                                       file:mr-4 file:py-1 file:px-2
                                       file:rounded-full file:border-0
                                       file:text-xs file:font-semibold
                                       file:bg-blue-50 file:text-blue-700
                                       hover:file:bg-blue-100
                                     "
                                 />
                                 {isUploading && <p className="text-[10px] text-blue-600 mt-1 animate-pulse">Compressing & Uploading...</p>}
                             </div>
                         </div>
                     )}

                     <label className="flex items-center gap-3 p-3 border rounded-xl bg-gray-50 dark:bg-white/5 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={settings.headerConfig.showTagline}
                            onChange={(e) => setSettings({
                                ...settings,
                                headerConfig: { ...settings.headerConfig, showTagline: e.target.checked }
                            })}
                            className="w-5 h-5 rounded text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Tagline</span>
                     </label>
                </div>

                {settings.headerConfig.showTagline && (
                    <input 
                        type="text"
                        value={settings.tagline}
                        onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                        placeholder="Enter your tagline..."
                        className="w-full px-4 py-2 border rounded-lg text-sm bg-transparent outline-none focus:border-blue-500 dark:border-white/20 dark:text-white"
                    />
                )}
                

            </div>
        </div>

        {/* 2. Invoice Config */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">📄 Invoice Config</h3>
                <button onClick={() => setPreviewMode("INVOICE")} className={`text-xs px-2 py-1 rounded border ${previewMode === "INVOICE" ? "bg-blue-50 text-blue-600 border-blue-200" : "text-gray-500"}`}>
                    Preview
                </button>
             </div>

             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Paper Type</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg dark:bg-white/5">
                        {["NORMAL", "THERMAL"].map(type => (
                            <button
                                key={type}
                                onClick={() => setSettings({ ...settings, invoicePrinterType: type as any })}
                                className={`py-1.5 text-xs font-bold rounded ${
                                    settings.invoicePrinterType === type 
                                    ? "bg-white shadow text-black" 
                                    : "text-gray-500 hover:text-black"
                                }`}
                            >
                                {type === "NORMAL" ? "A4 (Standard)" : "Thermal (Roll)"}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Template</label>
                    <select 
                        value={settings.invoiceTemplate}
                        onChange={(e) => {
                            setSettings({ ...settings, invoiceTemplate: e.target.value as any });
                            setPreviewMode("INVOICE");
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 dark:border-white/20 dark:text-white outline-none"
                    >
                        {INVOICE_TEMPLATES
                            .filter(t => t.type === settings.invoicePrinterType)
                            .map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))
                        }
                    </select>
                 </div>
             </div>
        </div>

        {/* 3. Job Card Config */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white">🛠️ Job Card Config</h3>
                <button onClick={() => setPreviewMode("JOBCARD")} className={`text-xs px-2 py-1 rounded border ${previewMode === "JOBCARD" ? "bg-blue-50 text-blue-600 border-blue-200" : "text-gray-500"}`}>
                    Preview
                </button>
             </div>

             <div className="space-y-4">
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Paper Type</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg dark:bg-white/5">
                        {["NORMAL", "THERMAL"].map(type => (
                            <button
                                key={type}
                                onClick={() => setSettings({ ...settings, jobCardPrinterType: type as any })}
                                className={`py-1.5 text-xs font-bold rounded ${
                                    settings.jobCardPrinterType === type 
                                    ? "bg-white shadow text-black" 
                                    : "text-gray-500 hover:text-black"
                                }`}
                            >
                                {type === "NORMAL" ? "A4 (Standard)" : "Thermal (Roll)"}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Template</label>
                   <select 
                       value={settings.jobCardTemplate}
                       onChange={(e) => {
                           setSettings({ ...settings, jobCardTemplate: e.target.value as any });
                           setPreviewMode("JOBCARD");
                       }}
                       className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-black/20 dark:border-white/20 dark:text-white outline-none"
                   >
                       {JOBCARD_TEMPLATES
                           .filter(t => t.type === settings.jobCardPrinterType)
                           .map(t => (
                               <option key={t.value} value={t.value}>{t.label}</option>
                           ))
                       }
                   </select>
                </div>
             </div>
        </div>

      </div>

      {/* --- RIGHT COLUMN (Preview) --- */}
      <div className="hidden xl:col-span-8 xl:flex flex-col bg-gray-100 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/5 h-full overflow-hidden">
        
        {/* Static Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur z-10">
             <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-black px-3 py-1.5 rounded-full border dark:border-white/10 shadow-sm text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    <span>{previewMode === "INVOICE" ? "📄 Invoice Preview" : "🛠️ Job Card Preview"}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                {activeMeta && (
                     <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{activeMeta.description}</p>
                )}
             </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex items-start justify-center">
             {/* Dynamic Scale Container */}
            <div className="transform transition-all duration-500 origin-top">
                 <RenderPreview />
            </div>
        </div>

      </div>
    </div>
  );
}
