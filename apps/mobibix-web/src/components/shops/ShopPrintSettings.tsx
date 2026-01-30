"use client";

import { useState } from "react";
import { type Shop, updateShopSettings } from "@/services/shops.api";
import { TEMPLATE_META } from "@/lib/print/meta";
import { InvoiceHeader } from "@/components/print/headers/InvoiceHeader";
import { InvoiceClassic } from "@/components/print/templates/InvoiceClassic";
import { InvoiceModern } from "@/components/print/templates/InvoiceModern";
import { InvoiceCorporate } from "@/components/print/templates/InvoiceCorporate";
import { InvoiceCompact } from "@/components/print/templates/InvoiceCompact";
import { InvoiceThermal } from "@/components/print/templates/InvoiceThermal";
import { JobCardClassic } from "@/components/print/templates/JobCardClassic";
import { JobCardThermal } from "@/components/print/templates/JobCardThermal";
import { JobCardSimple } from "@/components/print/templates/JobCardSimple";
import { JobCardDetailed } from "@/components/print/templates/JobCardDetailed";
import { InvoiceSimple } from "@/components/print/templates/InvoiceSimple";
// import { registerTemplate, resolveTemplate } from "@/lib/print/registry";
import type { PrintDocumentData } from "@/lib/print/types";

interface ShopPrintSettingsProps {
    shop: Shop;
    onUpdate?: () => void;
}

export function ShopPrintSettings({ shop, onUpdate }: ShopPrintSettingsProps) {
    // ... existing hooks ...
    const [isLoading, setIsLoading] = useState(false);

    // Local state for form
    const [settings, setSettings] = useState({
        invoicePrinterType: shop.invoicePrinterType || "NORMAL",
        invoiceTemplate: shop.invoiceTemplate || "CLASSIC",
        jobCardPrinterType: shop.jobCardPrinterType || "THERMAL",
        jobCardTemplate: shop.jobCardTemplate || "THERMAL",
        tagline: shop.tagline || "",
        headerConfig: shop.headerConfig || {
            layout: "CLASSIC",
            showLogo: true,
            showTagline: false,
        }
    });
    
    // Preview Mode State
    const [previewMode, setPreviewMode] = useState<"INVOICE" | "JOBCARD">("INVOICE");

    // Dynamic Template Resolver for Preview
    const RenderPreview = () => {
        const dummyData: PrintDocumentData = {
             id: "PREVIEW-123",
             type: previewMode,
             header: {
                 title: previewMode === "INVOICE" ? "Tax Invoice" : "Job Card",
                 shopName: shop.name || "Your Shop Name",
                 tagline: settings.tagline || (settings.headerConfig.showTagline ? "Your Tagline Here" : undefined),
                 logoUrl: shop.logoUrl || undefined,
                 addressLines: [ shop.addressLine1 || "123 Market Street, Tech Hub", `${shop.city || "Bangalore"} - ${shop.pincode || "560102"}` ],
                 contactInfo: [ `Phone: ${shop.phone || "9876543210"}`, `Email: support@mobibix.com` ],
                 gstNumber: shop.gstNumber || "29KABPS1234F1Z5",
             },
             headerConfig: settings.headerConfig,
             meta: {},
             customer: { name: "John Doe", address: "456 Customer Lane, City" },
             qrCode: "https://mobibix.com/track/JOB-12345", 
             config: { isB2B: false, pricesInclusive: true, printDate: new Date().toLocaleDateString(), isIndianGSTInvoice: true },
             // Dummy Items
             items: [
                 { id: "1", name: "Premium Widget", qty: 2, rate: 500, total: 1000, taxRate: 18 },
                 { id: "2", name: "Service Charge", qty: 1, rate: 250, total: 250, taxRate: 18 },
             ],
             totals: { subTotal: 1250, totalTax: 225, grandTotal: 1475 }
        } as any;

        // Resolve Component
        let Component = InvoiceClassic; // Default
        
        if (previewMode === "INVOICE") {
            switch(settings.invoiceTemplate as string) {
                case "CLASSIC": Component = InvoiceClassic; break;
                case "MODERN": Component = InvoiceModern; break;
                case "CORPORATE": Component = InvoiceCorporate; break;
                case "COMPACT": Component = InvoiceCompact; break;
                case "THERMAL": Component = InvoiceThermal; break;
                case "SIMPLE": Component = InvoiceSimple; break;
            }
        } else {
             switch(settings.jobCardTemplate as string) {
                case "CLASSIC": Component = JobCardClassic; break;
                case "THERMAL": Component = JobCardThermal; break;
                case "SIMPLE": Component = JobCardSimple; break;
                case "DETAILED": Component = JobCardDetailed; break;
                // Fallbacks for missing components
                default: Component = JobCardClassic; break; 
            }
        }
        
        // Pass data
        return (
            <div className={`origin-top ${
                (previewMode === "INVOICE" && settings.invoicePrinterType === "THERMAL") || 
                (previewMode === "JOBCARD" && settings.jobCardPrinterType === "THERMAL") 
                ? "w-[80mm] mx-auto bg-white shadow-xl min-h-[100mm]" 
                : "w-[210mm] h-[297mm] bg-white shadow-xl p-[10mm]"
            } text-black print-preview-wrapper`}>
                <Component data={dummyData} />
            </div>
        )
    };

    const handleSave = async () => {
        try {
            setIsLoading(true);
            await updateShopSettings(shop.id, {
                invoicePrinterType: settings.invoicePrinterType,
                invoiceTemplate: settings.invoiceTemplate,
                jobCardPrinterType: settings.jobCardPrinterType,
                jobCardTemplate: settings.jobCardTemplate,
                headerConfig: settings.headerConfig,
                tagline: settings.tagline,
            });
            alert("Print settings saved successfully!");
            if (onUpdate) onUpdate();
        } catch (error: any) {
            alert(error.message || "Failed to save settings");
        } finally {
            setIsLoading(false);
        }
    };

    // Helpers to get current meta
    const invoiceMeta = TEMPLATE_META.INVOICE?.[settings.invoiceTemplate] 
        || TEMPLATE_META.INVOICE?.["CLASSIC"];
    
    const jobCardMeta = TEMPLATE_META.JOBCARD?.[settings.jobCardTemplate] 
        || TEMPLATE_META.JOBCARD?.["THERMAL"];


    // Layout Selectors (Visual)
    const renderLayoutSelector = (value: "CLASSIC" | "CENTERED" | "SPLIT" | "MINIMAL", label: string) => {
        const isSelected = settings.headerConfig.layout === value;
        return (
            <button
                type="button"
                onClick={() => setSettings({ ...settings, headerConfig: { ...settings.headerConfig, layout: value } })}
                className={`relative group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected 
                    ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-500/10" 
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5"
                }`}
            >
                {/* Visual Representation */}
                <div className="w-full h-16 flex flex-col gap-1 p-1 bg-white dark:bg-black/40 rounded border border-gray-100 dark:border-white/5 opacity-80 group-hover:opacity-100 transition-opacity">
                     {value === "CLASSIC" && (
                         <div className="flex gap-2 h-full">
                             <div className="w-1/3 bg-gray-200 dark:bg-gray-700 rounded-sm h-3/4 my-auto"></div>
                             <div className="w-2/3 flex flex-col gap-1 justify-center">
                                 <div className="h-2 w-full bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
                                 <div className="h-1.5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
                             </div>
                         </div>
                     )}
                     {value === "CENTERED" && (
                         <div className="flex flex-col gap-1 items-center justify-center h-full">
                             <div className="w-1/3 h-6 bg-gray-200 dark:bg-gray-700 rounded-sm mb-1"></div>
                             <div className="h-1.5 w-3/4 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
                             <div className="h-1.5 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
                         </div>
                     )}
                     {value === "SPLIT" && (
                        <div className="flex justify-between items-center h-full px-1">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="h-2 w-12 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
                                <div className="h-1.5 w-8 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
                            </div>
                        </div>
                     )}
                     {value === "MINIMAL" && (
                        <div className="flex justify-between items-end h-full px-1 pb-1">
                            <div className="flex flex-col gap-1">
                                <div className="h-2 w-16 bg-gray-900 dark:bg-gray-500 rounded-sm"></div>
                                <div className="h-1 w-10 bg-gray-300 dark:bg-gray-700 rounded-sm"></div>
                            </div>
                            <div className="h-2 w-10 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
                        </div>
                     )}
                </div>
                <span className={`text-xs font-semibold ${isSelected ? "text-blue-700 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
                    {label}
                </span>
                {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 shadow-sm ring-2 ring-white dark:ring-black"></div>
                )}
            </button>
        );
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-[calc(100vh-100px)]">
            {/* LEFT COLUMN: CONTROLS (Scrollable) */}
            <div className="xl:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-20 relative">
                <div className="sticky top-0 z-20 flex justify-between items-center bg-gray-50/80 dark:bg-black/50 backdrop-blur-md py-4 border-b border-gray-200 dark:border-white/10 -mx-1 px-1">
                     <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                        🖨️ Print Settings
                    </h2>
                     <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 shadow-sm"
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                </div>

                {/* 1. Header Design Controls */}
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        🎨 Invoice Header
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Design</span>
                    </h3>
                    
                    {/* Preview Mode Switcher (Context) */}
                    <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-black/20 rounded-lg">
                        <button
                            onClick={() => setPreviewMode("INVOICE")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${previewMode === "INVOICE" ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            INVOICE HEADER
                        </button>
                        <button
                             onClick={() => setPreviewMode("JOBCARD")}
                             className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${previewMode === "JOBCARD" ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            JOBCARD HEADER
                        </button>
                    </div>

                    {/* Layout Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {renderLayoutSelector("CLASSIC", "Classic")}
                        {renderLayoutSelector("CENTERED", "Centered")}
                        {renderLayoutSelector("SPLIT", "Split")}
                        {renderLayoutSelector("MINIMAL", "Minimal")}
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 cursor-pointer hover:bg-gray-100 transition-colors">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Shop Logo</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={settings.headerConfig.showLogo}
                                    onChange={(e) => setSettings({ ...settings, headerConfig: { ...settings.headerConfig, showLogo: e.target.checked } })}
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </div>
                        </label>

                        <div className={`p-3 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 transition-all ${settings.headerConfig.showTagline ? 'ring-2 ring-blue-500/20' : ''}`}>
                             <label className="flex items-center justify-between cursor-pointer mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show Tagline</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.headerConfig.showTagline}
                                        onChange={(e) => setSettings({ ...settings, headerConfig: { ...settings.headerConfig, showTagline: e.target.checked } })}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </div>
                             </label>
                             
                             {/* Tagline Input (Conditional Animation) */}
                            <div className={`grid transition-all duration-200 ease-in-out ${settings.headerConfig.showTagline ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                     <input
                                        type="text"
                                        value={settings.tagline}
                                        onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                                        placeholder="e.g. Best Service in Town..."
                                        className="w-full px-3 py-2 text-sm border-b-2 border-gray-300 focus:border-blue-600 bg-transparent outline-none transition-colors dark:border-gray-600 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Invoices Config */}
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">📄 Invoice Settings</h3>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Printer Type</label>
                            <div className="grid grid-cols-2 bg-gray-100 dark:bg-black/20 p-1 rounded-lg">
                                {["NORMAL", "THERMAL"].map((type) => (
                                     <button
                                        key={type}
                                        onClick={() => setSettings({...settings, invoicePrinterType: type as any})}
                                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                                            settings.invoicePrinterType === type 
                                            ? "bg-white text-black shadow-sm" 
                                            : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {type === "NORMAL" ? "A4 Paper" : "Thermal (80mm)"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                             <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Template Style</label>
                             <select 
                                value={settings.invoiceTemplate}
                                onChange={(e) => {
                                    setSettings({...settings, invoiceTemplate: e.target.value as any});
                                    setPreviewMode("INVOICE"); // Auto switch preview
                                }}
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-stone-900 dark:border-white/20 text-sm font-medium"
                            >
                                <option value="CLASSIC">Classic (Professional A4)</option>
                                <option value="MODERN">Modern Clean (A4)</option>
                                <option value="CORPORATE">Corporate Boxed (A4)</option>
                                <option value="COMPACT">Compact (A4/A5)</option>
                                <option value="SIMPLE">Simple (Grid/Table)</option>
                                <option value="THERMAL">Thermal Receipt (80mm)</option>
                            </select>
                             <p className="text-[11px] text-gray-500 mt-2 leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-2 rounded text-blue-700 dark:text-blue-300">
                                {invoiceMeta?.description}
                             </p>
                        </div>
                     </div>
                </div>

                {/* 3. Job Card Config */}
                <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">🛠️ Job Settings</h3>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Printer Type</label>
                             <div className="grid grid-cols-2 bg-gray-100 dark:bg-black/20 p-1 rounded-lg">
                                {["THERMAL", "NORMAL"].map((type) => (
                                     <button
                                        key={type}
                                        onClick={() => setSettings({...settings, jobCardPrinterType: type as any})}
                                        className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                                            settings.jobCardPrinterType === type 
                                            ? "bg-white text-black shadow-sm" 
                                            : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {type === "NORMAL" ? "A4 Paper" : "Thermal (80mm)"}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Template Style</label>
                            <select 
                                value={settings.jobCardTemplate}
                                onChange={(e) => {
                                    setSettings({...settings, jobCardTemplate: e.target.value as any});
                                    setPreviewMode("JOBCARD"); // Auto switch preview
                                }}
                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-stone-900 dark:border-white/20 text-sm font-medium"
                            >
                                <option value="THERMAL">Standard Thermal</option>
                                <option value="CLASSIC">Classic (Standard A4)</option>
                                <option value="SIMPLE">Simple (Compact)</option>
                                <option value="DETAILED">Detailed (With Conditions)</option>
                            </select>
                        </div>
                     </div>
            </div>
            
                {/* Bottom Save Button */}
                <div className="pt-4">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl transition disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <span>Save Changes</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* RIGHT COLUMN: PREVIEW AREA (Sticky) */}
            <div className="hidden xl:flex xl:col-span-8 bg-gray-100 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/5 items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border shadow-sm text-xs font-bold text-gray-500 flex items-center gap-2">
                    <span>👁️ Live Invoice Preview</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                </div>

                {/* SCALED A4 PAPER CONTAINER */}
                {/* 210mm x 297mm ~= 794px x 1123px. We scale it down to fit the specific viewport area. */}
                 {/* SCALED PAPER CONTAINER */}
                 <div className="origin-center scale-[0.65] 2xl:scale-[0.75] transition-transform duration-300 ease-out shadow-2xl">
                     <RenderPreview />
                 </div>
                </div>
            </div>
    );
}

