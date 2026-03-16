"use client";

import { useTheme } from "@/context/ThemeContext";
import { BarcodeLabelStudio } from "@/components/tools/barcode/BarcodeLabelStudio";
import { Printer, ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BarcodeLabelsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === "dark";

  return (
    <div className={`container mx-auto px-4 py-8 ${isDark ? "text-white" : "text-gray-900"}`}>
      {/* Header section - Hidden during print */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className={`p-3 rounded-2xl border transition-all active:scale-90 ${
              isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-400" : "bg-white border-gray-100 hover:bg-gray-50 text-gray-500 shadow-sm"
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2 rounded-xl ${isDark ? "bg-teal-500/20 text-teal-400" : "bg-teal-100 text-teal-600"}`}>
                <Printer size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Barcode <span className="text-teal-500">Labels</span>
              </h1>
            </div>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Professional label generator for products, assets, and inventory.
            </p>
          </div>
        </div>

        {/* Tip / Feature Info */}
        <div className={`p-4 rounded-2xl border hidden xl:flex items-center gap-4 max-w-sm ${
          isDark ? "bg-blue-500/5 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-100 text-blue-700"
        }`}>
          <div className="p-2 rounded-full bg-blue-500/20">
            <RefreshCw size={16} className="animate-spin-slow" />
          </div>
          <p className="text-[11px] leading-relaxed font-medium">
            <span className="font-bold underline">Pro Tip:</span> Use the "Sheet" mode to print multiple copies on a standard A4 sheet. Perfect for bulk labeling.
          </p>
        </div>
      </header>

      {/* Main Studio Area */}
      <main>
        <BarcodeLabelStudio />
      </main>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
